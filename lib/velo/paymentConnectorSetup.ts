import { VeloConnectorProfile, AutopilotActionLog, User } from "@/entities";
import { toast } from "sonner";

export interface PaymentConnectorStatus {
  id: string;
  provider_type: "stripe" | "paypal";
  status: "connected" | "connector_ready" | "disabled" | "manual_fallback";
  connection_mode: string;
  last_checked_at?: string;
  metadata?: any;
}

/**
 * Ensures user-specific connector profiles exist for Stripe and PayPal
 */
export async function setupPaymentConnectors(choices: { stripe: boolean; paypal: boolean }) {
  const me = await User.me().catch(() => null);
  if (!me) return;

  const results = [];
  
  if (choices.stripe) {
    results.push(ensureConnectorProfile(me, "Stripe", "stripe"));
  }
  
  if (choices.paypal) {
    results.push(ensureConnectorProfile(me, "PayPal", "paypal"));
  }

  await Promise.all(results);
  
  if (choices.stripe || choices.paypal) {
    await AutopilotActionLog.create({
      department: "Financial",
      action_type: "PAYMENT_CONNECTOR_SETUP",
      status: "success",
      summary: `Prepared payment connectors: ${[choices.stripe && "Stripe", choices.paypal && "PayPal"].filter(Boolean).join(", ")}.`,
      details: `User selected payment processors during onboarding. Profiles created in connector_ready mode.`
    });
  }
}

/**
 * Explicitly prepare a payment connector for a user who skipped onboarding
 */
export async function preparePaymentConnector(provider: "stripe" | "paypal") {
  const me = await User.me().catch(() => null);
  if (!me) {
    toast.error("Authentication required");
    return false;
  }

  const name = provider === "stripe" ? "Stripe" : "PayPal";
  await ensureConnectorProfile(me, name, provider);
  
  await AutopilotActionLog.create({
    department: "Financial",
    action_type: "PAYMENT_CONNECTOR_PREPARE",
    status: "success",
    summary: `Prepared ${name} payment connector.`,
    details: `User explicitly prepared ${name} connector from dashboard.`
  });

  toast.success(`${name} connector prepared and ready for calibration.`);
  return true;
}

async function ensureConnectorProfile(user: any, name: string, provider: string) {
  try {
    const existing = await VeloConnectorProfile.query()
      .where("provider_type", provider)
      .where("owner_email", user.email)
      .exec();

    if (existing.length === 0) {
      await VeloConnectorProfile.create({
        name: `${name} Connector`,
        category: "payment_processor",
        provider_type: provider,
        owner_email: user.email,
        owner_user_id: user.id,
        connection_mode: "connector_ready",
        status: "connector_ready",
        cost_mode: "free_public",
        allowed_actions: ["read_only_balance", "read_only_transactions"],
        setup_notes: "Connector prepared. Requires user login to activate live sync.",
        metadata: {
          onboarding_selection: true,
          requested_sync_type: "read_only_balance_and_transactions",
          provider_login_required: true,
          oauth_authorization_status: "pending_platform_setup",
          owner_email: user.email,
          owner_user_id: user.id,
          sync_balances_enabled: true,
          sync_transactions_enabled: true,
          sync_income_tracking_enabled: true,
          manual_review_before_import: true,
          sync_frequency_preference: "daily"
        }
      });
    } else {
      // Ensure basic readiness if it already existed but was missing metadata
      await VeloConnectorProfile.update(existing[0].id, {
        setup_notes: "Connector prepared. Requires user login to activate live sync.",
        metadata: {
          ...existing[0].metadata,
          provider_login_required: true,
          owner_email: user.email,
          owner_user_id: user.id
        }
      });
    }
  } catch (error) {
    console.error(`Failed to ensure connector profile for ${provider}:`, error);
  }
}

/**
 * Get current payment connector statuses for the user
 */
export async function getPaymentConnectorStatuses(): Promise<PaymentConnectorStatus[]> {
  try {
    const me = await User.me().catch(() => null);
    if (!me) return [];

    const connectors = await VeloConnectorProfile.query()
      .where("category", "payment_processor")
      .where("owner_email", me.email)
      .exec();

    return connectors.map((c: any) => ({
      id: c.id,
      provider_type: c.provider_type as "stripe" | "paypal",
      status: c.status as any,
      connection_mode: c.connection_mode,
      last_checked_at: c.last_checked_at,
      metadata: c.metadata
    }));
  } catch (error) {
    console.error("Failed to load payment connector statuses:", error);
    return [];
  }
}

/**
 * Update sync settings for a connector
 */
export async function updateConnectorSyncSettings(id: string, settings: any) {
  try {
    const me = await User.me().catch(() => null);
    if (!me) {
      toast.error("Authentication required to update settings.");
      return false;
    }

    const existing = await VeloConnectorProfile.get(id);
    if (!existing) {
      toast.error("Connector not found.");
      return false;
    }

    // Security check: verify ownership and category
    const isOwner = connectorBelongsToUser(existing, me);
    const isPaymentProcessor = existing.category === "payment_processor";
    const isAllowedProvider = ["stripe", "paypal"].includes(existing.provider_type);

    if (!isOwner || !isPaymentProcessor || !isAllowedProvider) {
      console.warn("[Security] Unauthorized attempt to update connector settings. Scoping violation detected.");
      toast.error("You do not have permission to modify this connector.");
      return false;
    }

    // Sanitize settings to prevent arbitrary metadata injection
    const allowedKeys = [
      "sync_balances_enabled",
      "sync_transactions_enabled",
      "sync_income_tracking_enabled",
      "manual_review_before_import",
      "sync_frequency_preference"
    ];

    const sanitizedSettings: any = {};
    for (const key of allowedKeys) {
      if (settings[key] !== undefined) {
        sanitizedSettings[key] = settings[key];
      }
    }

    await VeloConnectorProfile.update(id, {
      metadata: {
        ...existing.metadata,
        ...sanitizedSettings,
        last_user_sync_settings_update: new Date().toISOString()
      }
    });

    await AutopilotActionLog.create({
      department: "Financial",
      action_type: "PAYMENT_CONNECTOR_PREFERENCE_UPDATE",
      status: "success",
      summary: `Updated sync preferences for ${existing.provider_type} connector.`,
      details: `User modified sync settings for payment processor. Scoped to current user session.`
    });

    toast.success("Sync preferences saved.");
    return true;
  } catch (error) {
    console.error("Failed to update sync settings:", error);
    toast.error("Failed to save sync preferences.");
    return false;
  }
}

/**
 * Update a connector status (e.g. to manual fallback)
 */
export async function updatePaymentConnectorStatus(id: string, status: string) {
  try {
    const me = await User.me().catch(() => null);
    if (!me) {
      toast.error("Authentication required.");
      return false;
    }

    const existing = await VeloConnectorProfile.get(id);
    if (!existing) {
      toast.error("Connector not found.");
      return false;
    }

    const isOwner = connectorBelongsToUser(existing, me);
    if (!isOwner) {
      console.warn("[Security] Unauthorized attempt to update connector status. Scoping violation detected.");
      toast.error("Permission denied.");
      return false;
    }

    await VeloConnectorProfile.update(id, { status });
    toast.success(`Connector status updated to ${status.replace("_", " ")}`);
    return true;
  } catch (error) {
    toast.error("Failed to update connector status");
    return false;
  }
}

/**
 * Verifies strict ownership of a connector record.
 */
function connectorBelongsToUser(connector: any, user: any): boolean {
  if (!connector || !user) return false;
  
  const hasEmail = !!connector.owner_email;
  const hasId = !!connector.owner_user_id;
  
  // Rule: If both exist, both must match
  if (hasEmail && hasId) {
    return connector.owner_email === user.email && connector.owner_user_id === user.id;
  }
  
  // Rule: Fallback to single field if only one is present
  if (hasEmail) {
    return connector.owner_email === user.email;
  }
  
  if (hasId) {
    return connector.owner_user_id === user.id;
  }
  
  // Rule: If neither exists, deny
  return false;
}
