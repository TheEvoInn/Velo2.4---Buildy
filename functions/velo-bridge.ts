
import { createSuperdevClient } from 'npm:@superdevhq/client@latest';

/**
 * VELO Bridge Endpoint
 * 
 * This endpoint handles communication between the Buildy cloud and local bridge runners.
 * It manages device heartbeats, job polling, and real-time reporting of progress, 
 * friction, and artifacts.
 */

const superdev = createSuperdevClient({
  appId: Deno.env.get('SUPERDEV_APP_ID'),
});

// Simple CORS headers
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Velo-Device-ID, X-Velo-Timestamp, X-Velo-Signature",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const rawBody = await req.text();
    if (!rawBody) {
      return new Response(JSON.stringify({ error: "Empty request body" }), { status: 400, headers: CORS_HEADERS });
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON", details: e.message }), { status: 400, headers: CORS_HEADERS });
    }

    const { action, deviceId, payload } = body;

    // Health check - always available
    if (action === "health") {
      return new Response(JSON.stringify({ 
        success: true, 
        status: "online",
        timestamp: new Date().toISOString()
      }), { status: 200, headers: CORS_HEADERS });
    }

    if (!action || !deviceId) {
      return new Response(JSON.stringify({ error: "Missing action or deviceId" }), { status: 400, headers: CORS_HEADERS });
    }

    // Lookup device
    const devices = await superdev.entities.VeloBridgeDevice.query().where("id", deviceId).exec();
    if (devices.length === 0) {
      return new Response(JSON.stringify({ error: "Device not found" }), { status: 404, headers: CORS_HEADERS });
    }
    const device = devices[0];

    // Security check: only verified or paused devices can communicate
    // Paused devices can still check-in but won't receive jobs.
    if (!["verified", "paused", "emergency_stopped"].includes(device.status)) {
      return new Response(JSON.stringify({ error: "Device not active", status: device.status }), { status: 403, headers: CORS_HEADERS });
    }

    // Prevent any action if emergency stop is enabled
    if (device.emergency_stop_enabled && action !== "check_in") {
      return new Response(JSON.stringify({ error: "Emergency stop active", code: "EMERGENCY_STOP" }), { status: 403, headers: CORS_HEADERS });
    }

    switch (action) {
      case "check_in":
      case "heartbeat":
        await superdev.entities.VeloBridgeDevice.update(deviceId, {
          last_check_in_at: new Date().toISOString(),
          heartbeat_status: "online",
          runner_version: payload?.version || device.runner_version,
          metadata: { ...device.metadata, last_reported_capabilities: payload?.capabilities || device.capabilities }
        });
        return new Response(JSON.stringify({ 
          success: true, 
          status: device.status,
          emergency_stop: device.emergency_stop_enabled
        }), { status: 200, headers: CORS_HEADERS });

      case "pull_jobs":
        if (device.status !== "verified" || device.emergency_stop_enabled) {
          return new Response(JSON.stringify({ success: true, jobs: [] }), { status: 200, headers: CORS_HEADERS });
        }
        
        // Pull jobs ready for this device
        const pendingJobs = await superdev.entities.VeloBridgeJob.query()
          .where("device_id", deviceId)
          .in("status", ["ready_for_pull", "local_confirm_required"])
          .exec();
        
        // Return jobs and update status to 'pulled'
        // We only return jobs that have not expired
        const now = new Date();
        const validJobs = pendingJobs.filter(job => !job.packet_expires_at || new Date(job.packet_expires_at) > now);

        for (const job of validJobs) {
          await superdev.entities.VeloBridgeJob.update(job.id, {
            status: "pulled",
            last_pulled_at: now.toISOString()
          });
        }

        return new Response(JSON.stringify({ success: true, jobs: validJobs }), { status: 200, headers: CORS_HEADERS });

      case "report":
        const { jobId, reportType, reportPayload } = payload || {};
        if (!jobId || !reportType) {
          return new Response(JSON.stringify({ error: "Missing jobId or reportType" }), { status: 400, headers: CORS_HEADERS });
        }

        const job = await superdev.entities.VeloBridgeJob.get(jobId);
        if (!job || job.device_id !== deviceId) {
          return new Response(JSON.stringify({ error: "Job not found or access denied" }), { status: 404, headers: CORS_HEADERS });
        }

        // Security: Redact or reject payloads that contain likely raw secret values
        const payloadString = JSON.stringify(reportPayload).toLowerCase();
        const forbiddenPatterns = [
          "password", "secret", "private_key", "token", "cookie", "sms_code", "captcha", 
          "seed_phrase", "mnemonic", "identity_number", "ssn", "credit_card"
        ];
        
        // Basic check for long hex/base64 strings that might be keys
        const suspiciousString = /[a-f0-9]{64,}|[a-zA-Z0-9+/]{80,}=*/.test(JSON.stringify(reportPayload));
        
        if (forbiddenPatterns.some(p => payloadString.includes(p)) || (suspiciousString && !reportType.includes("artifact"))) {
          console.warn(`Blocked suspicious report payload from device ${deviceId} for job ${jobId}`);
          return new Response(JSON.stringify({ error: "Payload contains forbidden patterns or suspicious strings" }), { status: 400, headers: CORS_HEADERS });
        }

        const reportHistory = job.metadata?.report_history || [];
        const reportEntry = {
          type: reportType,
          timestamp: new Date().toISOString(),
          ...reportPayload
        };
        reportHistory.push(reportEntry);

        let updateData: any = {
          metadata: { ...job.metadata, report_history: reportHistory }
        };

        // Status state machine based on reports
        switch (reportType) {
          case "picked_up":
          case "browser_step_started":
            updateData.status = "running_local";
            break;
          case "progress":
          case "browser_step_evidence":
            // Status remains running_local, just log progress/evidence in metadata
            break;
          case "friction":
          case "browser_step_blocked":
            updateData.status = "paused_friction";
            // Store friction details for the UI
            updateData.metadata.last_friction_event = reportPayload;
            break;
          case "artifact":
            const artifacts = job.metadata?.proof_artifacts || [];
            artifacts.push(reportPayload);
            updateData.metadata.proof_artifacts = artifacts;
            break;
          case "completed":
          case "browser_step_completed":
            updateData.status = "completed";
            updateData.completed_at = reportEntry.timestamp;
            updateData.result_summary = reportPayload.summary || "Success";
            break;
          case "failed":
            updateData.status = "failed";
            updateData.failure_reason = reportPayload.reason || "Unknown runner failure";
            break;
          case "blocked":
            updateData.status = "denied";
            updateData.failure_reason = reportPayload.reason || "Blocked locally";
            break;
          case "browser_handoff_ready":
            updateData.status = "ready_for_pull";
            break;
          case "approval_required":
            updateData.status = "local_confirm_required";
            updateData.metadata.last_approval_prompt = reportPayload.approval_prompt;
            break;
          case "approval_approved":
            updateData.status = "running_local";
            break;
          case "approval_denied":
            updateData.status = "denied";
            updateData.failure_reason = `Local operator denied approval: ${reportPayload.reason || 'No reason provided'}`;
            break;
          case "approval_expired":
            updateData.status = "failed";
            updateData.failure_reason = "Local approval prompt expired.";
            break;
          case "local_secret_verified":
          case "local_secret_missing":
          case "local_secret_rotation_needed":
            const secretRefs = job.metadata?.local_secret_references || [];
            if (reportPayload.secret_reference) {
              const sRef = reportPayload.secret_reference;
              const existingIndex = secretRefs.findIndex((s: any) => s.id === sRef.id);
              if (existingIndex >= 0) {
                secretRefs[existingIndex] = sRef;
              } else {
                secretRefs.push(sRef);
              }
            }
            updateData.metadata.local_secret_references = secretRefs;
            break;
          case "ubuntu_handshake_preflight_started":
          case "ubuntu_handshake_preflight_passed":
          case "ubuntu_handshake_preflight_blocked":
            updateData.metadata.handshake_status = reportType.replace("ubuntu_handshake_preflight_", "");
            if (reportPayload.handshake_packet) {
              updateData.metadata.last_handshake_packet = reportPayload.handshake_packet;
            }
            break;
        }

        await superdev.entities.VeloBridgeJob.update(jobId, updateData);

        // Log the report in Autopilot
        await superdev.entities.AutopilotActionLog.create({
          department: "OPERATIONS",
          action_type: `bridge_${reportType}`,
          status: reportType === "failed" ? "failure" : "success",
          summary: `Runner: ${reportType} report for ${job.title}`,
          details: reportPayload.summary || reportPayload.reason || `Type: ${reportType}`,
          related_id: jobId
        });

        return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS_HEADERS });

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: CORS_HEADERS });
    }

  } catch (err) {
    console.error("Bridge Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error", details: err.message }), { 
      status: 500, 
      headers: CORS_HEADERS 
    });
  }
});
