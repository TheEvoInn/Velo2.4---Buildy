export interface CommandPermissionResult {
  allowed: boolean;
  reason?: string;        // Why denied, e.g. "Approval actions require admin permission"
  requiredScope?: string; // What scope is needed, e.g. "admin", "scanner", "approval"
}

/**
 * Returns the list of actions a regular user can always do without explicit permission records.
 */
export function getDefaultUserPermissions(): string[] {
  return [
    "scanner:search",
    "wallet:view",
    "mission:create",
    "profile:update_own",
    "content:generate",
    "review:view",
    "general"
  ];
}

/**
 * Classifies the user's message into a permission-relevant action.
 * Uses deterministic keyword matching.
 */
export function classifyCommandIntent(message: string): { action: string, department: string, risk: 'low' | 'medium' | 'high' | 'admin' } {
  const msg = message.toLowerCase();

  // ADMIN / HIGH RISK actions - Check FIRST
  const adminKeywords = ["delete", "remove", "deploy", "activate ubuntu", "system settings", "manage members"];
  if (adminKeywords.some(k => msg.includes(k))) {
    return { action: "admin:system", department: "admin", risk: "admin" };
  }

  // APPROVAL actions - risk: HIGH (admin only in command officer context)
  const approvalKeywords = ["approve", "confirm", "accept", "authorize"];
  if (approvalKeywords.some(k => msg.includes(k))) {
    return { action: "approval:execute", department: "admin", risk: "admin" };
  }

  // Scanner commands — risk: low
  const scannerKeywords = ["find", "scan", "search", "look for", "discover", "opportunities", "work", "gigs", "freelance"];
  if (scannerKeywords.some(k => msg.includes(k))) {
    return { action: "scanner:search", department: "freelance", risk: "low" };
  }

  // Wallet commands — risk: low
  const walletKeywords = ["wallet", "earnings", "balance", "payout", "how much did i earn"];
  if (walletKeywords.some(k => msg.includes(k))) {
    return { action: "wallet:view", department: "wallet", risk: "low" };
  }

  // Mission commands — risk: low
  const missionKeywords = ["start mission", "create mission", "new mission"];
  if (missionKeywords.some(k => msg.includes(k))) {
    return { action: "mission:create", department: "missions", risk: "low" };
  }

  // Content generation — risk: low
  const contentKeywords = ["generate", "create content", "draft", "write", "compose"];
  if (contentKeywords.some(k => msg.includes(k))) {
    return { action: "content:generate", department: "content", risk: "low" };
  }

  // Profile updates — risk: low
  const profileKeywords = ["update my profile", "change my", "edit my profile"];
  if (profileKeywords.some(k => msg.includes(k))) {
    return { action: "profile:update_own", department: "profile", risk: "low" };
  }

  // Review viewing — risk: low
  const reviewKeywords = ["review center", "what needs review", "pending", "show me what's waiting"];
  if (reviewKeywords.some(k => msg.includes(k))) {
    return { action: "review:view", department: "review", risk: "low" };
  }

  // Store/product — risk: low
  const commerceKeywords = ["store", "product", "sell", "listing", "trade"];
  if (commerceKeywords.some(k => msg.includes(k))) {
    return { action: "commerce:manage", department: "trade", risk: "low" };
  }

  // Default — anything not matched → low risk, pass through
  return { action: "general", department: "general", risk: "low" };
}

/**
 * Validates if a user has permission to execute a command.
 */
export function validateCommandPermission(
  message: string, 
  userPermissions: string[], 
  isAdmin: boolean
): CommandPermissionResult {
  // Admins pass everything
  if (isAdmin) {
    return { allowed: true };
  }

  const classification = classifyCommandIntent(message);
  const defaultPerms = getDefaultUserPermissions();

  // If risk is admin, deny
  if (classification.risk === 'admin') {
    return { 
      allowed: false, 
      reason: "This action requires higher clearance. Command level insufficient.",
      requiredScope: "admin"
    };
  }

  // Check if action is allowed by default or explicit permission
  const isAllowed = defaultPerms.includes(classification.action) || userPermissions.includes(classification.action);

  if (isAllowed) {
    return { allowed: true };
  }

  // If not allowed, return denial
  return {
    allowed: false,
    reason: "Your current profile does not have the necessary permissions for this operation.",
    requiredScope: classification.action
  };
}
