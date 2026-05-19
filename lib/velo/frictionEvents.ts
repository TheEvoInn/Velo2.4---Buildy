
export type FrictionEventType = 
  | "captcha_detected" 
  | "sms_requested" 
  | "email_verification" 
  | "identity_check" 
  | "manual_review" 
  | "login_required" 
  | "platform_error"
  | "account_locked"
  | "terms_acceptance"
  | "payment_review"
  | "platform_review"
  | "rate_limit"
  | "missing_asset"
  | "file_upload_issue"
  | "browser_error"
  | "policy_warning"
  | "unknown_blocker";

export interface FrictionEvent {
  id: string;
  type: FrictionEventType;
  platform: string;
  jobId: string;
  requestId?: string;
  missionId?: string;
  status: "pending" | "waiting_user_action" | "user_handled_locally" | "resume_requested" | "resumed" | "blocked" | "failed" | "ignored";
  instruction: string;
  artifactUrl?: string; // e.g. screenshot of captcha or error
  createdAt: string;
  handledAt?: string;
  metadata?: Record<string, any>;
}

export const FRICTION_CONFIG: Record<FrictionEventType, { 
  label: string; 
  icon: string; 
  severity: "low" | "medium" | "high" | "critical";
  defaultInstruction: string;
  localSteps: string[];
}> = {
  captcha_detected: {
    label: "CAPTCHA Detected",
    icon: "ShieldAlert",
    severity: "medium",
    defaultInstruction: "A CAPTCHA has been detected. Please complete it in your local browser window to proceed.",
    localSteps: [
      "Locate the browser window running the automation.",
      "Solve the CAPTCHA manually.",
      "Verify you are on the expected page after solving.",
      "Return here and click 'Resume Task'."
    ]
  },
  sms_requested: {
    label: "SMS Verification Required",
    icon: "Smartphone",
    severity: "high",
    defaultInstruction: "A verification code has been sent to your phone. Please enter it in the local platform window.",
    localSteps: [
      "Check your mobile device for the verification code.",
      "Enter the code exactly as received in the local browser prompt.",
      "Ensure the platform accepts the code.",
      "Return here and click 'Resume Task'."
    ]
  },
  email_verification: {
    label: "Email Verification Sent",
    icon: "Mail",
    severity: "medium",
    defaultInstruction: "A verification link or code has been sent to your email. Please check and confirm locally.",
    localSteps: [
      "Open your email inbox.",
      "Find the message from the platform.",
      "Click the verification link or copy the code to the local browser.",
      "Confirm the session is active.",
      "Return here and click 'Resume Task'."
    ]
  },
  identity_check: {
    label: "Identity Verification Required",
    icon: "Fingerprint",
    severity: "critical",
    defaultInstruction: "The platform requires an identity check (KYC). Please follow the instructions in your local browser.",
    localSteps: [
      "Follow the platform's KYC/Identity prompts in the local window.",
      "Submit required documents or biometric scans locally.",
      "Wait for the platform to confirm submission.",
      "Return here and click 'Resume Task'."
    ]
  },
  manual_review: {
    label: "Manual Review Required",
    icon: "UserCheck",
    severity: "low",
    defaultInstruction: "This action requires a manual review of the details before submission.",
    localSteps: [
      "Review the data fields in the local browser window.",
      "Correct any errors or missing information.",
      "Click the submit button locally if satisfied.",
      "Return here and click 'Resume Task'."
    ]
  },
  login_required: {
    label: "Authentication Required",
    icon: "Lock",
    severity: "medium",
    defaultInstruction: "Your session has expired or you are not logged in. Please log in locally.",
    localSteps: [
      "Log in to the platform in the local browser.",
      "Complete any multi-factor authentication (MFA).",
      "Ensure you are back at the target dashboard/page.",
      "Return here and click 'Resume Task'."
    ]
  },
  platform_error: {
    label: "Platform Error",
    icon: "AlertTriangle",
    severity: "high",
    defaultInstruction: "The platform encountered an error. Please check the local runner for details.",
    localSteps: [
      "Inspect the local browser for error messages.",
      "Refresh the page if it's a transient network issue.",
      "Manually retry the last action if possible.",
      "Return here and click 'Resume Task' or 'Mark Blocked'."
    ]
  },
  account_locked: {
    label: "Account Locked",
    icon: "Lock",
    severity: "critical",
    defaultInstruction: "Your account appears to be locked or restricted. Please resolve this manually on the platform.",
    localSteps: [
      "Follow the account recovery instructions on the platform locally.",
      "Contact platform support if necessary.",
      "Confirm the account is restored and accessible.",
      "Return here and click 'Resume Task'."
    ]
  },
  terms_acceptance: {
    label: "Terms Update",
    icon: "FileText",
    severity: "medium",
    defaultInstruction: "New terms of service must be accepted. Please review and accept them locally.",
    localSteps: [
      "Read the updated terms in the local browser.",
      "Accept the terms locally.",
      "Confirm the platform allows navigation again.",
      "Return here and click 'Resume Task'."
    ]
  },
  payment_review: {
    label: "Payment Review",
    icon: "CreditCard",
    severity: "high",
    defaultInstruction: "A payment or payout requires manual review or authorization.",
    localSteps: [
      "Review the transaction details locally.",
      "Authorize the payment using your local security method.",
      "Ensure the transaction is marked as pending or complete.",
      "Return here and click 'Resume Task'."
    ]
  },
  platform_review: {
    label: "Platform Compliance Review",
    icon: "ShieldCheck",
    severity: "medium",
    defaultInstruction: "The platform is conducting a compliance or security review.",
    localSteps: [
      "Wait for the review to complete or follow on-screen prompts.",
      "Provide any requested compliance information locally.",
      "Confirm you can proceed with actions.",
      "Return here and click 'Resume Task'."
    ]
  },
  rate_limit: {
    label: "Rate Limit Exceeded",
    icon: "Clock",
    severity: "medium",
    defaultInstruction: "Actions have been throttled. Please wait or resolve locally.",
    localSteps: [
      "Observe the cooldown timer in the local browser.",
      "Solve any 'Are you a robot?' prompts that appeared.",
      "Wait at least 5-10 minutes before resuming.",
      "Return here and click 'Resume Task'."
    ]
  },
  missing_asset: {
    label: "Missing Asset",
    icon: "FileQuestion",
    severity: "low",
    defaultInstruction: "A required file or asset is missing for this step.",
    localSteps: [
      "Identify the missing file from the local runner log.",
      "Upload or place the file in the expected local directory.",
      "Verify the file is accessible locally.",
      "Return here and click 'Resume Task'."
    ]
  },
  file_upload_issue: {
    label: "File Upload Issue",
    icon: "UploadCloud",
    severity: "medium",
    defaultInstruction: "The local runner failed to upload a required file.",
    localSteps: [
      "Manually upload the file in the local browser window.",
      "Ensure the upload is successful and accepted.",
      "Navigate to the next step if the platform requires it.",
      "Return here and click 'Resume Task'."
    ]
  },
  browser_error: {
    label: "Browser Environment Error",
    icon: "Monitor",
    severity: "high",
    defaultInstruction: "The local browser environment crashed or hung.",
    localSteps: [
      "Restart the local browser if it's unresponsive.",
      "Navigate back to the platform and the target page.",
      "Ensure the session is still valid.",
      "Return here and click 'Resume Task'."
    ]
  },
  policy_warning: {
    label: "Policy Warning",
    icon: "AlertOctagon",
    severity: "critical",
    defaultInstruction: "A platform policy violation warning has appeared.",
    localSteps: [
      "Read the warning carefully locally.",
      "Stop all actions if it threatens account safety.",
      "Acknowledge the warning if safe to do so.",
      "Return here and click 'Resume Task' or 'Mark Blocked'."
    ]
  },
  unknown_blocker: {
    label: "Unclassified Blocker",
    icon: "HelpCircle",
    severity: "medium",
    defaultInstruction: "An unexpected blocker has occurred. Manual inspection required.",
    localSteps: [
      "Inspect the local browser to identify the issue.",
      "Resolve whatever is preventing progress.",
      "Return here and click 'Resume Task'."
    ]
  }
};

/**
 * Provides safe Autopilot guidance for a specific friction event.
 */
export function getAutopilotFrictionGuidance(event: FrictionEvent): string {
  const config = FRICTION_CONFIG[event.type] || FRICTION_CONFIG.unknown_blocker;
  
  const baseGuidance = `I've analyzed the blocker on ${event.platform}. This appears to be a ${config.label}. 
  
Since VELO operates with strict security boundaries, I cannot solve this for you automatically. You'll need to handle this locally on your computer.`;

  const safetyNote = "\n\n**Safety Note:** I will never ask for your passwords, SMS codes, or private tokens. Keep those values inside your local browser.";

  return `${baseGuidance}\n\n**Recommended Steps:**\n${config.localSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}${safetyNote}`;
}

/**
 * Redacts potentially sensitive patterns from friction report text.
 */
export function redactSensitiveFrictionData(text: string): string {
  if (!text) return text;
  
  // Redact 6-digit codes (common SMS/Email codes)
  let redacted = text.replace(/\b\d{6}\b/g, "[REDACTED CODE]");
  
  // Redact common auth token patterns (basic heuristic)
  redacted = redacted.replace(/auth_token=[a-zA-Z0-9_\-\.]{10,}/g, "auth_token=[REDACTED]");
  redacted = redacted.replace(/bearer [a-zA-Z0-9_\-\.]{10,}/gi, "Bearer [REDACTED]");
  
  // Redact passwords if they appear in labels (unlikely but safe)
  redacted = redacted.replace(/password: \S+/gi, "password: [REDACTED]");
  
  return redacted;
}

export function normalizeFrictionEvent(event: Partial<FrictionEvent>): FrictionEvent {
  const type = event.type || "platform_error";
  const config = FRICTION_CONFIG[type];
  
  return {
    id: event.id || Math.random().toString(36).substr(2, 9),
    type,
    platform: event.platform || "Unknown Platform",
    jobId: event.jobId || "unknown",
    status: event.status || "pending",
    instruction: event.instruction || config.defaultInstruction,
    createdAt: event.createdAt || new Date().toISOString(),
    ...event
  } as FrictionEvent;
}
