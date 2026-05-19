
import { sendEmail } from "@/integrations/core";
import { 
  CommsMessage, 
  AutopilotActionLog, 
  FreelanceEarning, 
  VeloWalletTransaction, 
  VeloWalletNotification, 
  VeloMemberInvitation,
  User
} from "@/entities";
import { walletEngine } from "./walletEngine";

/**
 * Sends a back pay notification email to a user.
 * 
 * @param email - Recipient email address
 * @param amount - Back pay amount in USD
 */
export async function sendBackPayNotification(email: string, amount: number) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

  const subject = `Your VELO Back Pay Has Been Processed — ${formattedAmount}`;
  const bodyHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <h1 style="color: #00f2ff; font-style: italic; text-transform: uppercase;">VELO Back Pay Processed</h1>
      <p>Hi Dawn,</p>
      <p>Your VELO platform back pay of <strong>${formattedAmount} USD</strong> has been processed and is now in your pending balance.</p>
      <p>This payment recognizes your beta platform contributions and is pending final payout processing. You can track your balance and payout status from your <strong>Freelance Station</strong> dashboard.</p>
      <p>If you have any questions about your payout, reach out through the platform.</p>
      <br />
      <p>— The VELO Team</p>
    </div>
  `;

  try {
    // 1. Send the actual email
    await sendEmail({
      to: email,
      subject: subject,
      body_html: bodyHtml,
      from_name: "VELO Platform",
      from_local_part: "payments"
    });

    // 2. Record in CommsMessage
    await CommsMessage.create({
      recipient: email,
      subject: subject,
      body_html: bodyHtml,
      status: "sent",
      department: "Freelance Station",
      sent_at: new Date().toISOString()
    });

    // 3. Log to AutopilotActionLog
    await AutopilotActionLog.create({
      department: "Freelance Station",
      action_type: "BACK_PAY_EMAIL_SENT",
      status: "success",
      summary: `Sent back pay notification email to ${email} for ${formattedAmount}.`
    });

    return { success: true };
  } catch (error: any) {
    console.error("[VELO] Failed to send back pay notification:", error);
    
    await AutopilotActionLog.create({
      department: "Freelance Station",
      action_type: "BACK_PAY_EMAIL_FAILED",
      status: "error",
      summary: `Failed to send back pay notification to ${email}: ${error.message || 'Unknown error'}`
    });
    
    throw error;
  }
}

/**
 * Migration utility to fix Dawn Vernor's email address mistake.
 * Moves records from gmail/yahoo variants to the correct yahoo address.
 */
export async function fixDawnVernorData() {
  const oldEmails = ["dawnvernor@gmail.com", "dawnverner@yahoo.com", "dawnvernor@yahoo.com"];
  const targetEmail = "dawnvernor@yahoo.com";
  
  let fixCount = 0;

  try {
    // 1. Try to find her User ID if she's registered
    let ownerUserId: string | undefined = undefined;
    try {
      const users = await User.list();
      const dawnUser = users.find((u: any) => u.email?.toLowerCase() === targetEmail.toLowerCase());
      if (dawnUser) {
        ownerUserId = dawnUser.id;
      }
    } catch (e) {
      console.warn("[VELO] Could not fetch user list for migration", e);
    }

    // 2. Update FreelanceEarning
    const earnings = await FreelanceEarning.list();
    for (const e of earnings) {
      if (oldEmails.includes(e.owner_email?.toLowerCase())) {
        await FreelanceEarning.update(e.id, { 
          owner_email: targetEmail,
          owner_user_id: ownerUserId || e.owner_user_id
        });
        fixCount++;
      }
    }

    // 3. Update VeloWalletTransaction
    const txs = await VeloWalletTransaction.list();
    for (const tx of txs) {
      if (oldEmails.includes(tx.owner_email?.toLowerCase())) {
        await VeloWalletTransaction.update(tx.id, { 
          owner_email: targetEmail,
          owner_user_id: ownerUserId || tx.owner_user_id
        });
        fixCount++;
      }
    }

    // 4. Update VeloWalletNotification
    const notifs = await VeloWalletNotification.list();
    for (const n of notifs) {
      if (oldEmails.includes(n.owner_email?.toLowerCase())) {
        await VeloWalletNotification.update(n.id, { 
          owner_email: targetEmail,
          owner_user_id: ownerUserId || n.owner_user_id
        });
        fixCount++;
      }
    }

    // 5. Update CommsMessage
    const msgs = await CommsMessage.list();
    for (const m of msgs) {
      if (oldEmails.includes(m.recipient?.toLowerCase())) {
        await CommsMessage.update(m.id, { recipient: targetEmail });
        fixCount++;
      }
    }

    // 6. Update VeloMemberInvitation
    const invites = await VeloMemberInvitation.list();
    for (const i of invites) {
      if (oldEmails.includes(i.email?.toLowerCase())) {
        await VeloMemberInvitation.update(i.id, { email: targetEmail });
        fixCount++;
      }
    }

    // 7. Log the fix
    if (fixCount > 0) {
      await AutopilotActionLog.create({
        department: "System",
        action_type: "DATA_MIGRATION",
        status: "success",
        summary: `Migrated ${fixCount} records for Dawn Vernor to ${targetEmail}.`,
        details: `Corrected email to ${targetEmail}. User ID associated: ${ownerUserId || 'none'}`
      });
    }

    // 8. ALWAYS sync wallet for the target email to ensure balance shows up, even if no records were migrated this time
    // This handles cases where records were migrated but the transaction sync failed previously
    await walletEngine.syncWalletFromExistingRecords(targetEmail);

    return { success: true, count: fixCount };
  } catch (error) {
    console.error("[VELO] Data migration failed:", error);
    return { success: false, error };
  }
}

/**
 * Sends a confirmation notification to Dawn Vernor about her email update and back pay.
 */
export async function sendDawnUpdateNotification() {
  const email = "dawnvernor@yahoo.com";
  const amount = 1568.19;
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

  const subject = "Your VELO Account Has Been Updated — Back Pay Ready for Review";
  const bodyHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6;">
      <h1 style="color: #00f2ff; font-style: italic; text-transform: uppercase; border-bottom: 2px solid #00f2ff; padding-bottom: 10px;">Account Update Confirmed</h1>
      <p>Hi Dawn,</p>
      <p>This is a confirmation that your VELO platform account email has been successfully updated to <strong>${email}</strong>.</p>
      <p>Additionally, your pending back pay of <strong>${formattedAmount} USD</strong> has been synchronized and is now ready for your review. You can view your balance and track payout status directly from your <strong>Freelance Station</strong> dashboard.</p>
      <p>Your records, earnings ledger, and wallet notifications have all been updated to reflect your correct account details.</p>
      <p>If you have any questions, please reach out via the platform comms.</p>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.9em; color: #666;">
        <p>— The VELO Team</p>
      </div>
    </div>
  `;

  try {
    // 1. Send the actual email
    await sendEmail({
      to: email,
      subject: subject,
      body_html: bodyHtml,
      from_name: "VELO Platform",
      from_local_part: "payments"
    });

    // 2. Record in CommsMessage
    await CommsMessage.create({
      recipient: email,
      subject: subject,
      body_html: bodyHtml,
      status: "sent",
      department: "Freelance Station",
      sent_at: new Date().toISOString()
    });

    // 3. Log to AutopilotActionLog
    await AutopilotActionLog.create({
      department: "System",
      action_type: "ACCOUNT_UPDATE_NOTIFICATION",
      status: "success",
      summary: `Sent account update & back pay notification to ${email}.`
    });

    return { success: true };
  } catch (error: any) {
    console.error("[VELO] Failed to send account update notification:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Ensures actual database records exist for Dawn Vernor's back pay.
 * This is idempotent unless forceRepair is true.
 * 
 * @param options - Optional configuration including forceRepair
 */
export async function ensureDawnBackPayRecords(options: { forceRepair?: boolean } = {}) {
  const targetEmail = "dawnvernor@yahoo.com";
  const amount = 1568.19;
  const { forceRepair = false } = options;

  console.log(`[VELO] Running back pay check for ${targetEmail} (forceRepair: ${forceRepair})`);

  try {
    // 1. Check if the earning already exists
    const earnings = await FreelanceEarning.list();
    const dawnEarningsCount = earnings.filter((e: any) => e.owner_email?.toLowerCase() === targetEmail).length;
    
    console.log(`[VELO] Diagnostic: Total earnings in DB: ${earnings.length}, Dawn's earnings: ${dawnEarningsCount}`);

    const alreadyExists = earnings.some((e: any) => 
      e.owner_email?.toLowerCase() === targetEmail && 
      Math.abs(walletEngine.normalizeMoney(e.amount) - amount) < 0.01 &&
      e.platform === "VELO"
    );

    if (alreadyExists && !forceRepair) {
      console.log(`[VELO] Back pay records already exist for ${targetEmail}`);
      return { success: true, alreadyExists: true };
    }

    if (alreadyExists && forceRepair) {
      console.log(`[VELO] Back pay records exist but forceRepair is active. Creating duplicate/repair record.`);
    }

    // 2. Try to find her User ID
    let ownerUserId: string | undefined = undefined;
    try {
      const users = await User.list();
      const dawnUser = users.find((u: any) => u.email?.toLowerCase() === targetEmail);
      if (dawnUser) {
        ownerUserId = dawnUser.id;
        console.log(`[VELO] Found Dawn's User ID: ${ownerUserId}`);
      } else {
        console.warn(`[VELO] Dawn's email ${targetEmail} not found in User list during backpay check.`);
      }
    } catch (e) {
      console.error("[VELO] Error fetching user list for backpay:", e);
    }

    // 3. Create the FreelanceEarning
    const earning = await FreelanceEarning.create({
      owner_email: targetEmail,
      owner_user_id: ownerUserId,
      platform: "VELO",
      client_name: "VELO Platform",
      job_title: "Beta Platform Back Pay",
      amount: amount,
      currency: "USD",
      status: "pending",
      earned_at: new Date().toISOString(),
      notes: "Back pay for beta platform contributions. Verified by admin audit. " + (forceRepair ? "(REPAIR RECORD)" : ""),
      metadata: { source: "back_pay_migration", audit_ref: "dawn_vernor_reconciliation", repaired: forceRepair }
    });

    console.log(`[VELO] Created FreelanceEarning: ${earning.id}`);

    // 4. Create the wallet transaction record directly for visibility
    const tx = await VeloWalletTransaction.create({
      owner_email: targetEmail,
      owner_user_id: ownerUserId,
      transaction_type: "earning",
      amount: amount,
      currency: "USD",
      status: "pending",
      source_department: "Freelance Station",
      source_platform: "VELO",
      category: "freelance",
      source_record_id: earning.id,
      source_record_type: "FreelanceEarning",
      occurred_at: new Date().toISOString(),
      description: "Beta Back Pay: VELO Platform",
      notes: "System reconciled back pay for beta contributions. " + (forceRepair ? "(REPAIR TRANSACTION)" : ""),
      autopilot_involved: false
    });

    console.log(`[VELO] Created VeloWalletTransaction: ${tx.id}`);

    // 5. Create a notification
    await VeloWalletNotification.create({
      owner_email: targetEmail,
      owner_user_id: ownerUserId,
      notification_type: "new_earning",
      title: "Back Pay Processed",
      message: `Your back pay of $1,568.19 has been added to your Freelance Station ledger.`,
      severity: "success",
      status: "unread",
      created_at: new Date().toISOString()
    });

    // 6. Log the action
    await AutopilotActionLog.create({
      department: "System",
      action_type: "BACK_PAY_CREATED",
      status: "success",
      summary: `Created back pay records for ${targetEmail}: $1,568.19.`,
      details: forceRepair ? "Force repair path used." : undefined
    });

    // 7. Trigger a fresh wallet sync and balance recalculation
    console.log(`[VELO] Triggering wallet sync for ${targetEmail}...`);
    const syncResult = await walletEngine.syncWalletFromExistingRecords(targetEmail);
    console.log(`[VELO] Sync result: ${JSON.stringify(syncResult)}`);
    
    await walletEngine.recalculatePlatformBalances(targetEmail);

    return { success: true, earningId: earning.id, transactionId: tx.id };
  } catch (error: any) {
    console.error("[VELO] Failed to ensure back pay records:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Diagnostic utility to dump current state of Dawn's backpay records.
 */
export async function diagnoseDawnBackpay() {
  const targetEmail = "dawnvernor@yahoo.com";
  console.log(`[VELO] DIAGNOSTIC: Investigating records for ${targetEmail}`);
  
  try {
    const [earnings, transactions, notifications, balances] = await Promise.all([
      FreelanceEarning.list(),
      VeloWalletTransaction.list(),
      VeloWalletNotification.list(),
      VeloPlatformBalance.list()
    ]);
    
    const dawnEarnings = earnings.filter((e: any) => e.owner_email?.toLowerCase() === targetEmail);
    const dawnTransactions = transactions.filter((t: any) => t.owner_email?.toLowerCase() === targetEmail);
    const dawnNotifications = notifications.filter((n: any) => n.owner_email?.toLowerCase() === targetEmail);
    const dawnBalances = balances.filter((b: any) => b.owner_email?.toLowerCase() === targetEmail);
    
    const report = {
      email: targetEmail,
      timestamp: new Date().toISOString(),
      earnings: dawnEarnings.map((e: any) => ({ id: e.id, amount: e.amount, status: e.status, earned_at: e.earned_at })),
      transactions: dawnTransactions.map((t: any) => ({ id: t.id, amount: t.amount, status: t.status, type: t.transaction_type, occurred_at: t.occurred_at })),
      notifications: dawnNotifications.map((n: any) => ({ id: n.id, title: n.title, status: n.status })),
      balances: dawnBalances.map((b: any) => ({ id: b.id, platform: b.platform, total: b.total_balance, pending: b.pending_earnings }))
    };
    
    console.log("[VELO] DIAGNOSTIC REPORT:", JSON.stringify(report, null, 2));
    return report;
  } catch (error: any) {
    console.error("[VELO] Diagnostic failed:", error);
    return { error: error.message };
  }
}

/**
 * Sends a full Ollama setup walkthrough to Dawn.
 */
export async function sendDawnOllamaSetupGuide() {
  const email = "dawnvernor@yahoo.com";
  const subject = "VELO: Connect Your Local AI (Ollama Setup Guide)";
  
  // Guard to ensure it only fires once via localStorage in the UI, 
  // but we also check CommsMessage here for server-side idempotency if called multiple times
  try {
    const existing = await CommsMessage.list();
    if (existing.some((m: any) => m.recipient === email && m.subject === subject)) {
      return { success: true, alreadySent: true };
    }
  } catch (e) {}

  const bodyHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #e0e0e0; background: #0a0a0a; border-radius: 16px; line-height: 1.7;">
      <h1 style="color: #00f2ff; font-style: italic; text-transform: uppercase; border-bottom: 2px solid #00f2ff; padding-bottom: 10px; margin-bottom: 20px;">Local AI Setup Guide</h1>
      
      <p>Hi Dawn,</p>
      
      <p>I noticed you've been working on connecting your local AI (Ollama) to the VELO platform. To help you get everything synchronized, I've prepared this step-by-step guide.</p>
      
      <div style="background: #111; border: 1px solid #333; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #f59e0b; font-size: 16px; margin-top: 0; text-transform: uppercase;">Why This Matters</h2>
        <p style="font-size: 14px; color: #999;">VELO can use your own computer's AI to handle complex reasoning tasks. This means zero cost to you (no cloud credits used) and absolute data privacy.</p>
      </div>
      
      <h2 style="color: #00f2ff; font-size: 18px; border-bottom: 1px solid #1a3a3a; padding-bottom: 8px; margin-top: 30px;">1. Install Ollama</h2>
      <p>If you haven't already, download Ollama from <a href="https://ollama.com" style="color: #00f2ff; text-decoration: none; font-weight: bold;">ollama.com</a>. Install it just like any other application.</p>
      
      <h2 style="color: #00f2ff; font-size: 18px; border-bottom: 1px solid #1a3a3a; padding-bottom: 8px; margin-top: 30px;">2. Pull a Logic Model</h2>
      <p>Open a terminal or command prompt on your computer and run this command to download a high-performance model:</p>
      <div style="background: #000; border: 1px solid #1a3a3a; border-radius: 8px; padding: 15px; font-family: monospace; color: #00f2ff; font-size: 14px; margin: 10px 0;">
        ollama pull llama3.2
      </div>
      
      <h2 style="color: #00f2ff; font-size: 18px; border-bottom: 1px solid #1a3a3a; padding-bottom: 8px; margin-top: 30px;">3. Configure Permissions (CRITICAL)</h2>
      <p>By default, Ollama blocks connections from web browsers for safety. You need to tell it that VELO is allowed to talk to it. <strong>This is the most common reason for connection issues.</strong></p>
      
      <div style="background: #000; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 15px 0;">
        <p style="color: #f59e0b; font-size: 13px; margin: 0 0 10px 0; font-weight: bold;">On Windows (Command Prompt):</p>
        <div style="background: #0a0a0a; padding: 12px; border-radius: 6px; font-family: monospace; color: #f59e0b; font-size: 13px; border: 1px solid #333;">
          set OLLAMA_ORIGINS=*
        </div>
        <p style="color: #f59e0b; font-size: 13px; margin: 20px 0 10px 0; font-weight: bold;">On Mac or Linux (Terminal):</p>
        <div style="background: #0a0a0a; padding: 12px; border-radius: 6px; font-family: monospace; color: #f59e0b; font-size: 13px; border: 1px solid #333;">
          export OLLAMA_ORIGINS=*
        </div>
      </div>
      
      <h2 style="color: #00f2ff; font-size: 18px; border-bottom: 1px solid #1a3a3a; padding-bottom: 8px; margin-top: 30px;">4. Restart Ollama</h2>
      <p>For the settings to take effect, you must restart Ollama. Quit the app completely (check your system tray/menu bar) and then reopen it, or run:</p>
      <div style="background: #000; border: 1px solid #1a3a3a; border-radius: 8px; padding: 15px; font-family: monospace; color: #00f2ff; font-size: 14px; margin: 10px 0;">
        ollama serve
      </div>
      
      <h2 style="color: #00f2ff; font-size: 18px; border-bottom: 1px solid #1a3a3a; padding-bottom: 8px; margin-top: 30px;">5. Link in Connection Hub</h2>
      <ol style="color: #ccc; font-size: 14px; padding-left: 20px;">
        <li style="margin-bottom: 10px;">Open your VELO Dashboard</li>
        <li style="margin-bottom: 10px;">Go to <strong>Connection Hub</strong></li>
        <li style="margin-bottom: 10px;">Click <strong>"Link Computer"</strong></li>
        <li style="margin-bottom: 10px;">Check the box for <strong>"AI Reasoning"</strong></li>
        <li style="margin-bottom: 10px;">Complete the linking process.</li>
      </ol>
      
      <div style="background: #111; border: 1px solid #16a34a; border-radius: 12px; padding: 20px; margin: 30px 0;">
        <h2 style="color: #16a34a; font-size: 16px; margin-top: 0; text-transform: uppercase;">Troubleshooting</h2>
        <p style="font-size: 13px; color: #999;">If you still see "Disconnected", try opening <a href="http://localhost:11434" style="color: #00f2ff; text-decoration: none;">http://localhost:11434</a> in your browser. If you see "Ollama is running", but VELO can't see it, double-check Step 3 (OLLAMA_ORIGINS).</p>
      </div>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #222; font-size: 13px; color: #666; text-align: center;">
        <p>Your back pay balance is also available for review in your wallet.</p>
        <p style="margin-top: 10px;">— The VELO Team</p>
      </div>
    </div>
  `;

  try {
    await sendEmail({
      to: email,
      subject,
      body_html: bodyHtml,
      from_name: "VELO Platform",
      from_local_part: "support"
    });

    await CommsMessage.create({
      recipient: email,
      subject,
      body_html: bodyHtml,
      status: "sent",
      department: "System",
      sent_at: new Date().toISOString()
    });

    await AutopilotActionLog.create({
      department: "System",
      action_type: "OLLAMA_SETUP_GUIDE",
      status: "success",
      summary: `Sent Ollama setup guide to ${email}.`
    });

    return { success: true };
  } catch (error: any) {
    console.error("[VELO] Failed to send Ollama setup guide:", error);
    return { success: false, error: error.message };
  }
}
