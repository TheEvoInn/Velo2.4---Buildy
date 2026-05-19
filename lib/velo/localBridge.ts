
import { User, VeloBridgeDevice, VeloBridgeJob, AutopilotActionLog } from "@/entities";

export type BridgeDeviceStatus = "draft" | "pending_pairing" | "verified" | "paused" | "revoked" | "emergency_stopped" | "pending_handshake";
export type BridgeJobStatus = "staged" | "awaiting_approval" | "ready_for_pull" | "pulled" | "local_confirm_required" | "running_local" | "paused_friction" | "completed" | "failed" | "denied" | "revoked" | "emergency_blocked";

export interface LocalSecretReference {
  id: string;
  alias: string;
  category: "env_var_ref" | "local_vault_ref" | "browser_session_ref" | "oauth_token_ref" | "api_key_ref" | "file_secret_ref";
  provider_label: string;
  required_scope: string;
  local_source_label: string;
  availability_state: "verified_locally" | "missing_locally" | "rotation_needed" | "access_denied_locally";
  last_verified_at: string;
  rotation_hint?: string;
  policy_notes?: string;
}

export interface UbuntuHandshakePacket {
  runner_identity_label: string;
  device_fingerprint: string;
  protocol_version: string;
  capability_claims: string[];
  boundary_acknowledgements: string[];
  emergency_halt_acknowledgement: boolean;
  safe_clock_metadata: string;
  nonce: string;
  attestation_status: "not_started" | "pending_attestation" | "verified" | "failed";
}

export interface BridgeReport {
  type: "picked_up" | "progress" | "step_completed" | "friction" | "artifact" | "completed" | "failed" | "blocked" | "approval_required" | "approval_approved" | "approval_denied" | "approval_expired" | "browser_handoff_ready" | "browser_step_started" | "browser_step_evidence" | "browser_step_completed" | "browser_step_blocked" | "local_secret_verified" | "local_secret_missing" | "local_secret_rotation_needed" | "ubuntu_handshake_preflight_started" | "ubuntu_handshake_preflight_passed" | "ubuntu_handshake_preflight_blocked";
  timestamp: string;
  summary?: string;
  reason?: string;
  progress?: number;
  step_id?: string;
  artifact?: any;
  friction?: {
    type: string;
    instruction: string;
    artifact_url?: string;
  };
  approval_prompt?: {
    id: string;
    type: "browser_step" | "credential_use" | "file_upload" | "external_submit" | "message_send" | "identity_step" | "money_or_trade_blocked";
    risk_level: "low" | "medium" | "high" | "critical";
    action_label: string;
    safe_summary: string;
    required_phrase?: string;
    operator_label?: string;
    decided_at?: string;
    expires_at?: string;
  };
  browser_handoff?: BrowserHandoffPacket;
  secret_reference?: LocalSecretReference;
  handshake_packet?: UbuntuHandshakePacket;
}

export interface BrowserHandoffPacket {
  target_domain: string;
  action_category: string;
  objective: string;
  expected_steps: string[];
  local_approval_required: boolean;
  expected_friction_watchpoints: string[];
  required_evidence: string[];
  redaction_policy: "strict" | "standard" | "minimal";
  timeout_seconds: number;
  stop_on_error: boolean;
  resume_on_user_input: boolean;
}

/**
 * Builds a safe browser handoff packet for a bridge job
 */
export function buildBrowserHandoffPacket(job: any): BrowserHandoffPacket {
  const metadata = job.metadata || {};
  return {
    target_domain: metadata.target_domain || new URL(metadata.target_url || "about:blank").hostname,
    action_category: job.action_category,
    objective: job.packet_summary || "No objective provided",
    expected_steps: metadata.expected_steps || [],
    local_approval_required: job.local_confirmation_required ?? true,
    expected_friction_watchpoints: metadata.friction_events || [],
    required_evidence: metadata.artifact_labels || ["screenshot"],
    redaction_policy: metadata.redaction_policy || "standard",
    timeout_seconds: metadata.timeout_seconds || 300,
    stop_on_error: metadata.stop_on_error ?? true,
    resume_on_user_input: metadata.resume_on_user_input ?? true
  };
}

/**
 * Classifies the current browser handoff state from job status and history
 */
export type BrowserHandoffState = "not_ready" | "missing_local_runner" | "needs_policy_review" | "needs_local_approval" | "ready_for_local_pickup" | "waiting_runner" | "running_locally" | "paused_for_user" | "completed_with_evidence" | "blocked";

export function getBrowserHandoffState(job: any, device: any): BrowserHandoffState {
  if (!job) return "not_ready";
  
  const history = getJobReportHistory(job);
  const latestReport = history.length > 0 ? history[history.length - 1] : null;

  if (job.status === "emergency_blocked" || job.status === "denied") return "blocked";
  if (job.status === "completed") return "completed_with_evidence";
  if (job.status === "paused_friction") return "paused_for_user";
  if (job.status === "running_local") return "running_locally";
  if (job.status === "pulled") return "waiting_runner";
  if (job.status === "local_confirm_required") return "needs_local_approval";
  
  if (job.status === "ready_for_pull") {
    if (!device || device.status !== "verified") return "missing_local_runner";
    return "ready_for_local_pickup";
  }

  if (job.status === "staged") {
    if (job.execution_mode === "blocked") return "blocked";
    return "needs_policy_review";
  }

  return "not_ready";
}

/**
 * Normalizes approval prompt history from a bridge job's metadata
 */
export function getJobApprovalPrompts(job: any): any[] {
  const history = getJobReportHistory(job);
  return history
    .filter(report => ["approval_required", "approval_approved", "approval_denied", "approval_expired"].includes(report.type))
    .map(report => ({
      ...report.approval_prompt,
      status: report.type.replace("approval_", ""),
      timestamp: report.timestamp
    }));
}

/**
 * Normalizes report history from a bridge job's metadata
 */
export function getJobReportHistory(job: any): BridgeReport[] {
  if (!job || !job.metadata || !job.metadata.report_history) return [];
  return Array.isArray(job.metadata.report_history) ? job.metadata.report_history : [];
}

/**
 * Extracts normalized artifacts from report history
 */
export function getArtifactsFromHistory(history: BridgeReport[]): any[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter(report => report && report.type === "artifact" && report.artifact)
    .map(report => ({
      ...report.artifact,
      captured_at: report.timestamp
    }));
}

/**
 * Gets the latest friction event from history if currently paused
 */
export function getLatestFriction(job: any, history: BridgeReport[]) {
  if (job.status !== "paused_friction") return null;
  const frictionReports = history.filter(r => r.type === "friction" && r.friction);
  return frictionReports.length > 0 ? frictionReports[frictionReports.length - 1].friction : null;
}

/**
 * Gets the full friction history for a job
 */
export function getFrictionHistory(job: any): any[] {
  const history = getJobReportHistory(job);
  return history
    .filter(report => report.type === "friction" && report.friction)
    .map(report => ({
      ...report.friction,
      timestamp: report.timestamp,
      status: report.metadata?.status || "reported"
    }));
}

/**
 * Sends a request to the bridge to resume a job that was paused for friction
 */
export async function requestJobResume(jobId: string, notes?: string) {
  try {
    const me = await User.me();
    const jobs = await VeloBridgeJob.query()
      .where("id", jobId)
      .where("owner_email", me.email)
      .exec();

    if (!jobs || jobs.length === 0) {
      throw new Error("Job not found or access denied.");
    }

    const job = jobs[0];
    if (job.status !== "paused_friction") {
      throw new Error(`Job is in ${job.status} state, cannot resume.`);
    }

    // Update status to 'resumed' or 'ready_for_pull' depending on runner logic
    // We'll use 'resumed' as a signal for the runner to pick it up again
    const updatedJob = await VeloBridgeJob.update(job.id, { 
      status: "running_local", // Moving back to running locally
      metadata: {
        ...job.metadata,
        resume_requested_at: new Date().toISOString(),
        resume_notes: notes
      }
    });

    await AutopilotActionLog.create({
      department: "OPERATIONS",
      action_type: "bridge_resume_requested",
      status: "success",
      summary: `Resume requested for ${job.title}`,
      details: notes || "User marked friction as resolved locally.",
      related_id: job.id
    });

    return updatedJob;
  } catch (error) {
    console.error("Failed to request job resume:", error);
    throw error;
  }
}

/**
 * Marks a job as permanently blocked due to unresolved friction
 */
export async function markFrictionBlocked(jobId: string, reason: string) {
  try {
    const me = await User.me();
    const jobs = await VeloBridgeJob.query()
      .where("id", jobId)
      .where("owner_email", me.email)
      .exec();

    if (!jobs || jobs.length === 0) {
      throw new Error("Job not found or access denied.");
    }

    const job = jobs[0];
    
    const updatedJob = await VeloBridgeJob.update(job.id, { 
      status: "failed", // Use failed or blocked
      failure_reason: `Blocked by user: ${reason}`,
      metadata: {
        ...job.metadata,
        blocked_at: new Date().toISOString(),
        block_reason: reason
      }
    });

    await AutopilotActionLog.create({
      department: "OPERATIONS",
      action_type: "bridge_blocked",
      status: "failure",
      summary: `Job marked blocked: ${job.title}`,
      details: reason,
      related_id: job.id
    });

    return updatedJob;
  } catch (error) {
    console.error("Failed to mark friction blocked:", error);
    throw error;
  }
}


/**
 * Validates ownership of a bridge device
 */
async function getOwnedBridgeDevice(deviceId: string) {
  const me = await User.me();
  const devices = await VeloBridgeDevice.query()
    .where("id", deviceId)
    .where("owner_email", me.email)
    .exec();
  
  if (!devices || devices.length === 0) {
    throw new Error("Bridge device not found or access denied.");
  }
  
  return devices[0];
}

/**
 * Get all bridge devices for the current user
 */
export async function getBridgeDevicesForCurrentUser() {
  try {
    const me = await User.me();
    return await VeloBridgeDevice.query()
      .where("owner_email", me.email)
      .sort("-created_at")
      .exec();
  } catch (error) {
    console.error("Failed to fetch bridge devices:", error);
    return [];
  }
}

/**
 * Generates a random secure token
 */
function generateSecureToken(length: number = 32) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Computes SHA-256 hash of a string
 */
async function computeHash(text: string) {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a draft bridge device enrollment with pairing material
 */
export async function createBridgeDeviceDraft(label: string, deviceType: string, capabilities: string[]) {
  try {
    const me = await User.me();
    
    // Generate a secure one-time pairing token
    const pairingToken = generateSecureToken(24);
    const pairingTokenHash = await computeHash(pairingToken);
    const tokenHint = pairingToken.substring(0, 6) + "..." + pairingToken.substring(pairingToken.length - 4);

    const device = await VeloBridgeDevice.create({
      owner_user_id: me.id,
      owner_email: me.email,
      label,
      device_type: deviceType,
      status: "draft",
      pairing_token_hash: pairingTokenHash,
      token_hint: tokenHint,
      verification_status: "unverified",
      heartbeat_status: "never_seen",
      capabilities,
      safety_acknowledged: false,
      emergency_stop_enabled: false
    });

    await AutopilotActionLog.create({
      department: "SECURITY",
      action_type: "connector_activation",
      status: "success",
      summary: `Bridge device draft created: ${label}`,
      details: `Device ID: ${device.id}. Type: ${deviceType}. Capabilities: ${capabilities.join(", ")}`,
      related_id: device.id
    });

    // Return device + the raw token (one-time display only)
    return { ...device, raw_pairing_token: pairingToken };
  } catch (error) {
    console.error("Failed to create bridge device draft:", error);
    throw error;
  }
}

/**
 * Issues a verification challenge for a device
 */
export async function issueBridgeVerificationChallenge(deviceId: string) {
  try {
    const ownedDevice = await getOwnedBridgeDevice(deviceId);
    const challenge = generateSecureToken(32);
    
    const device = await VeloBridgeDevice.update(ownedDevice.id, {
      verification_challenge: challenge,
      verification_status: "challenge_issued"
    });

    return device;
  } catch (error) {
    console.error("Failed to issue challenge:", error);
    throw error;
  }
}

/**
 * Stage a bridge job with signing metadata
 */
export async function stageBridgeJobPreview(params: {
  deviceId: string;
  missionId?: string;
  requestId?: string;
  title: string;
  category: string;
  riskLevel: string;
  summary: string;
  requiresLocalConfirm?: boolean;
  adapter?: string;
  mode?: "dry_run_only" | "local_prompt_required" | "blocked";
  playbookId?: string;
  playbookName?: string;
  stepSummary?: string;
  artifactLabels?: string[];
  frictionEvents?: string[];
}) {
  try {
    const me = await User.me();
    
    const packetId = "pkt_" + generateSecureToken(8);
    const nonce = generateSecureToken(16);
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour expiration

    // Canonical representation for hashing
    const canonicalPacket = JSON.stringify({
      packet_id: packetId,
      nonce: nonce,
      title: params.title,
      category: params.category,
      summary: params.summary,
      adapter: params.adapter || "noop",
      mode: params.mode || "dry_run_only",
      playbook_id: params.playbookId,
      playbook_name: params.playbookName,
      step_summary: params.stepSummary,
      artifact_labels: params.artifactLabels,
      friction_events: params.frictionEvents
    });

    const packetHash = await computeHash(canonicalPacket);

    const job = await VeloBridgeJob.create({
      owner_user_id: me.id,
      owner_email: me.email,
      device_id: params.deviceId,
      mission_id: params.missionId,
      request_id: params.requestId,
      title: params.title,
      action_category: params.category,
      risk_level: params.riskLevel,
      status: "staged",
      packet_id: packetId,
      packet_nonce: nonce,
      packet_issued_at: issuedAt,
      packet_expires_at: expiresAt,
      packet_hash: packetHash,
      packet_summary: params.summary,
      packet_signature_status: "not_signed",
      approval_prompt: params.summary,
      approval_status: params.requiresLocalConfirm ? "pending_local" : "not_required",
      execution_adapter: params.adapter || "noop",
      execution_mode: params.mode || "dry_run_only",
      local_confirmation_required: params.requiresLocalConfirm ?? true,
      metadata: {
        playbook_id: params.playbookId,
        playbook_name: params.playbookName,
        step_summary: params.stepSummary,
        artifact_labels: params.artifactLabels,
        friction_events: params.frictionEvents
      }
    });

    await AutopilotActionLog.create({
      department: "SECURITY",
      action_type: "connector_activation",
      status: "pending",
      summary: `Bridge job staged: ${params.title}`,
      details: `Job ID: ${job.id}. Packet: ${packetId}. Hash: ${packetHash.substring(0, 8)}...`,
      related_id: job.id
    });

    return job;
  } catch (error) {
    console.error("Failed to stage bridge job:", error);
    throw error;
  }
}

/**
 * Pause a bridge device
 */
export async function pauseBridgeDevice(deviceId: string) {
  try {
    const ownedDevice = await getOwnedBridgeDevice(deviceId);
    
    // Store previous status in metadata if it was verified
    const metadata = ownedDevice.metadata || {};
    if (ownedDevice.status === "verified") {
      metadata.status_before_pause = "verified";
    }

    const device = await VeloBridgeDevice.update(ownedDevice.id, { 
      status: "paused",
      metadata
    });
    
    await AutopilotActionLog.create({
      department: "SECURITY",
      action_type: "connector_activation",
      status: "warning",
      summary: `Bridge device paused`,
      details: `Device ID: ${deviceId}. All job pickups for this device are temporarily suspended.`,
      related_id: deviceId
    });

    return device;
  } catch (error) {
    console.error("Failed to pause bridge device:", error);
    throw error;
  }
}

/**
 * Resume a bridge device
 */
export async function resumeBridgeDevice(deviceId: string) {
  try {
    const ownedDevice = await getOwnedBridgeDevice(deviceId);
    
    // Default to pending_pairing unless we know it was verified
    let nextStatus: BridgeDeviceStatus = "pending_pairing";
    if (ownedDevice.metadata?.status_before_pause === "verified") {
      nextStatus = "verified";
    }

    const device = await VeloBridgeDevice.update(ownedDevice.id, { 
      status: nextStatus
    });
    
    await AutopilotActionLog.create({
      department: "SECURITY",
      action_type: "connector_activation",
      status: "success",
      summary: `Bridge device resumed`,
      details: `Device ID: ${deviceId}. Status moved from paused to ${nextStatus}.`,
      related_id: deviceId
    });

    return device;
  } catch (error) {
    console.error("Failed to resume bridge device:", error);
    throw error;
  }
}

/**
 * Revoke a bridge device
 */
export async function revokeBridgeDevice(deviceId: string) {
  try {
    const ownedDevice = await getOwnedBridgeDevice(deviceId);
    
    const device = await VeloBridgeDevice.update(ownedDevice.id, { status: "revoked" });
    
    await AutopilotActionLog.create({
      department: "SECURITY",
      action_type: "connector_activation",
      status: "destructive",
      summary: `Bridge device revoked`,
      details: `Device ID: ${deviceId}. This device can no longer pick up jobs or interact with the cloud bridge.`,
      related_id: deviceId
    });

    return device;
  } catch (error) {
    console.error("Failed to revoke bridge device:", error);
    throw error;
  }
}

/**
 * Trigger Emergency Stop for a device and its jobs
 */
export async function triggerEmergencyStop(deviceId: string) {
  try {
    const ownedDevice = await getOwnedBridgeDevice(deviceId);

    // 1. Update device status
    await VeloBridgeDevice.update(ownedDevice.id, { 
      status: "emergency_stopped",
      emergency_stop_enabled: true
    });

    // 2. Block all pending jobs for this device
    const allJobs = await VeloBridgeJob.query()
      .where("device_id", ownedDevice.id)
      .exec();

    const targetStatuses = ["staged", "awaiting_approval", "ready_for_pull", "pulled", "local_confirm_required", "running_local"];
    const pendingJobs = allJobs.filter(job => targetStatuses.includes(job.status));

    if (pendingJobs.length > 0) {
      for (const job of pendingJobs) {
        await VeloBridgeJob.update(job.id, { 
          status: "emergency_blocked",
          failure_reason: "Blocked by emergency stop."
        });
      }
    }

    await AutopilotActionLog.create({
      department: "SECURITY",
      action_type: "connector_activation",
      status: "destructive",
      summary: `EMERGENCY STOP TRIGGERED`,
      details: `Device ID: ${deviceId}. All pending jobs have been blocked. Device status set to emergency_stopped.`,
      related_id: deviceId
    });
  } catch (error) {
    console.error("Failed to trigger emergency stop:", error);
    throw error;
  }
}

/**
 * Acknowledges safety terms for a device and moves it to pending_pairing
 */
export async function acknowledgeBridgeSafety(deviceId: string) {
  try {
    const ownedDevice = await getOwnedBridgeDevice(deviceId);
    
    const device = await VeloBridgeDevice.update(ownedDevice.id, { 
      safety_acknowledged: true,
      status: "pending_pairing"
    });

    return device;
  } catch (error) {
    console.error("Failed to acknowledge safety:", error);
    throw error;
  }
}

/**
 * Marks a staged bridge job as ready for pull
 */
export async function releaseBridgeJobForPull(jobId: string) {
  try {
    const me = await User.me();
    const jobs = await VeloBridgeJob.query()
      .where("id", jobId)
      .where("owner_email", me.email)
      .exec();

    if (!jobs || jobs.length === 0) {
      throw new Error("Job not found or access denied.");
    }

    const job = jobs[0];
    const nextStatus = job.local_confirmation_required ? "local_confirm_required" : "ready_for_pull";

    return await VeloBridgeJob.update(job.id, { 
      status: nextStatus 
    });
  } catch (error) {
    console.error("Failed to release bridge job:", error);
    throw error;
  }
}

/**
 * Get all bridge jobs for the current user
 */
export async function getBridgeJobsForCurrentUser() {
  try {
    const me = await User.me();
    return await VeloBridgeJob.query()
      .where("owner_email", me.email)
      .sort("-created_at")
      .limit(50)
      .exec();
  } catch (error) {
    console.error("Failed to fetch bridge jobs:", error);
    return [];
  }
}

/**
 * Builds a summary of credential requirements for a local job without including values.
 */
export function buildCredentialRequirementSummary(vaultItems: any[]): any[] {
  return vaultItems.map(item => ({
    id: item.id,
    alias: item.label,
    category: "local_vault_ref",
    provider_label: item.provider || "System",
    required_scope: item.scope || "standard",
    policy_notes: "Value is referenced locally only. Buildy never sees the secret."
  }));
}

/**
 * Classifies handshake states for Ubuntu server connection preflight.
 */
export type HandshakeState = "not_started" | "local_runner_ready" | "credentials_reference_only_ready" | "pending_host_attestation" | "protocol_review_ready" | "blocked" | "activated_elsewhere_only";

export function getHandshakeState(device: any, secretReferences: LocalSecretReference[] = []): HandshakeState {
  if (!device) return "not_started";
  if (device.status === "emergency_stopped" || device.status === "revoked") return "blocked";
  
  const metadata = device.metadata || {};
  if (metadata.activated_on_external_host) return "activated_elsewhere_only";
  
  if (device.status === "pending_handshake") {
    if (metadata.handshake_blocked) return "blocked";
    if (metadata.attestation_verified) return "protocol_review_ready";
    return "pending_host_attestation";
  }

  if (device.status === "verified") {
    const hasMissingSecrets = secretReferences.some(s => s.availability_state === "missing_locally");
    if (hasMissingSecrets) return "local_runner_ready";
    return "credentials_reference_only_ready";
  }

  return "not_started";
}

