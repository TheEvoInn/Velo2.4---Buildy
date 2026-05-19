
import { 
  AutopilotMission, 
  VeloBridgeJob, 
  VeloRealWorldActionRequest, 
  AutopilotProfile,
  User
} from "@/entities";
import { completeCurrentMissionStep } from "./sequentialMissionEngine";
import { isRecordOwnedByUser, findScopedProfile } from "./accessControl";
import { updateAutopilotProfile } from "./autopilotProfileUpdates";

/**
 * Resumption helper that checks for completed external/local results and 
 * re-attaches them to active Autopilot missions.
 */
export async function resumeAutopilotCycle(userEmail: string) {
  console.log(`[VELO] Resumption check for: ${userEmail}`);

  // 1. Find the current user's profile to check cycle status
  const profiles = await AutopilotProfile.list().catch(() => []);
  const profile = findScopedProfile({ email: userEmail }, profiles);
  
  if (!profile || !profile.autopilot_enabled) return;

  // 2. Look for completed Bridge Jobs or Action Requests for this user
  // We fetch a larger set and filter to ensure we catch recent completions safely
  const [jobs, requests] = await Promise.all([
    VeloBridgeJob.query()
      .where("owner_email", userEmail)
      .sort("-updated_at")
      .limit(50)
      .exec().catch(() => []),
    VeloRealWorldActionRequest.query()
      .where("requested_by_email", userEmail)
      .sort("-updated_at")
      .limit(50)
      .exec().catch(() => [])
  ]);

  const completedJobs = jobs.filter(j => j.status === "completed" || j.completed_at);
  const completedRequests = requests.filter(r => r.execution_mode === "completed" || r.completed_at);

  // Use created_by for mission lookup since owner_email is not a top-level schema field
  const missions = await AutopilotMission.query()
    .where("status", "approved")
    .sort("-updated_at")
    .limit(20)
    .exec().catch(() => []);
  
  const activeMissions = missions.filter(m => isRecordOwnedByUser(m, { email: userEmail }));

  let hasResumedAny = false;
  let summaryNotes: string[] = [];

  for (const mission of activeMissions) {
    // Check if any job or request belongs to this mission and hasn't been "absorbed" yet
    const relevantJob = completedJobs.find(j => j.mission_id === mission.id && !j.metadata?.absorbed_by_autopilot);
    const relevantRequest = completedRequests.find(r => r.related_mission_id === mission.id && !r.metadata?.absorbed_by_autopilot);

    if (relevantJob || relevantRequest) {
      console.log(`[VELO] Found return evidence for mission: ${mission.id}`);
      
      const evidence = relevantJob || relevantRequest;
      const summary = (relevantJob as any)?.result_summary || (relevantRequest as any)?.provider_notes || "External action completed.";
      
      summaryNotes.push(`Mission "${mission.title}" updated with external results.`);

      // Update the mission step
      await completeCurrentMissionStep(mission.id, {
        summary: "Absorbed external execution result",
        details: summary,
        evidence_id: evidence.id,
        evidence_type: relevantJob ? 'bridge_job' : 'action_request'
      });

      // Update mission timeline metadata
      await AutopilotMission.update(mission.id, {
        metadata: {
          ...(mission.metadata || {}),
          autopilot_stage: 'returned',
          user_facing_summary: `Results received for ${mission.title}. Continuing automation.`,
          returned_at: new Date().toISOString(),
          last_evidence_id: evidence.id,
          last_evidence_type: relevantJob ? 'bridge_job' : 'action_request'
        }
      });

      // Mark the evidence as absorbed so we don't process it again
      if (relevantJob) {
        await VeloBridgeJob.update(relevantJob.id, { 
          metadata: { ...(relevantJob.metadata || {}), absorbed_by_autopilot: true } 
        });
      } else if (relevantRequest) {
        await VeloRealWorldActionRequest.update(relevantRequest.id, { 
          metadata: { ...(relevantRequest.metadata || {}), absorbed_by_autopilot: true } 
        });
      }

      hasResumedAny = true;
    }
  }

  if (hasResumedAny) {
    // If we resumed something, update the profile status back to active
    await updateAutopilotProfile(profile.id, {
      autopilot_cycle_status: "active",
      autopilot_cycle_summary: summaryNotes.length > 0 
        ? summaryNotes.join(" ") 
        : "Returned results absorbed. Continuing mission cycle."
    }, { skipCompleteness: true });
  }

  return hasResumedAny;
}
