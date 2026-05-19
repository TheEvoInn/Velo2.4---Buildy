













import { VeloMemberInvitation } from "@/entities";
import { logAdminAction } from "./devopsCommand";
import { sendEmail } from "@/integrations/core";

/**
 * Builds a consistent invitation URL
 */
export function buildInvitationUrl(token: string, email: string, origin?: string): string {
  const base = origin || window.location.origin;
  return `${base}/invite?code=${encodeURIComponent(token)}&email=${encodeURIComponent(email.toLowerCase().trim())}`;
}

/**
 * Escapes HTML characters to prevent injection in emails.
 */
function escapeHtml(text: string): string {
  if (!text) return "";
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Sends a VELO invitation email via the integrated email system.
 */
export async function sendInvitationEmail(toEmail: string, role: string, tokenHint: string, invitedBy: string, expiresAt: Date) {
  const safeEmail = escapeHtml(toEmail);
  const safeRole = escapeHtml(role);
  const safeToken = escapeHtml(tokenHint);
  const safeBy = escapeHtml(invitedBy);
  const safeExpiry = escapeHtml(expiresAt.toLocaleDateString());
  
  const inviteUrl = buildInvitationUrl(tokenHint, toEmail);
  
  return await sendEmail({
    to: toEmail,
    subject: "Mission Authorization: VELO Station Crew Invitation",
    body_html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #050505; color: #ffffff; border: 1px solid #1a1a1a; border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; width: 60px; height: 60px; background-color: #0ef2ff; border-radius: 12px; line-height: 60px; font-size: 30px;">🚀</div>
          <h1 style="color: #ffffff; text-transform: uppercase; letter-spacing: -1px; font-style: italic; margin-top: 20px; font-weight: 900;">VELO <span style="color: #0ef2ff;">Station</span></h1>
        </div>
        
        <p style="font-size: 16px; color: #a1a1aa; line-height: 1.6;">Greetings, Crew Member.</p>
        <p style="font-size: 16px; color: #a1a1aa; line-height: 1.6;">You have been issued a mission authorization by <strong>${safeBy}</strong> to join the VELO Mission Control as a <strong>${safeRole.toUpperCase()}</strong>.</p>
        
        <div style="margin: 40px 0; text-align: center;">
          <a href="${inviteUrl}" style="display: inline-block; padding: 18px 36px; background: linear-gradient(135deg, #0ef2ff 0%, #00d2ff 100%); color: #000000; text-decoration: none; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; border-radius: 8px; font-style: italic; box-shadow: 0 0 20px rgba(14, 242, 255, 0.4);">Authorize Access</a>
        </div>

        <div style="margin: 40px 0; padding: 25px; border: 1px solid #1e1e1e; background-color: #0f0f0f; border-radius: 8px; text-align: center;">
          <p style="margin: 0; color: #52525b; font-size: 10px; text-transform: uppercase; font-weight: 900; letter-spacing: 2px;">Station Access Code</p>
          <p style="margin: 10px 0 0; font-family: 'Courier New', Courier, monospace; font-size: 24px; color: #ffffff; font-weight: bold; letter-spacing: 4px;">${safeToken}</p>
        </div>
        
        <div style="border-top: 1px solid #1e1e1e; padding-top: 30px; margin-top: 40px;">
          <p style="font-size: 13px; color: #71717a; margin-bottom: 8px;"><strong>Security Notice:</strong> Please ensure you sign in with your invited email address (${safeEmail}) to successfully synchronize your profile.</p>
          <p style="font-size: 12px; color: #52525b;">This authorization remains valid until ${safeExpiry}. If you did not expect this invitation, please disregard this transmission.</p>
        </div>
      </div>
    `
  });
}

export type InvitationStatus = 'valid' | 'revoked' | 'expired' | 'accepted' | 'missing' | 'invalid_status';

/**
 * Classifies the status of an invitation record.
 */
export function getInvitationStatus(inv: any): InvitationStatus {
  if (!inv) return 'missing';
  if (inv.status === 'revoked') return 'revoked';
  if (inv.status === 'accepted') return 'accepted';
  if (inv.status === 'expired') return 'expired';
  if (inv.status !== 'sent') return 'invalid_status';
  
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
    return 'expired';
  }
  
  return 'valid';
}

/**
 * Finds an invitation by email or token hint without listing all invitations.
 */
export async function findInvitation(email?: string, code?: string) {
  if (!email && !code) return null;
  
  if (code) {
    const results = await VeloMemberInvitation.filter({ token_hint: code }, "-created_at");
    const inv = results[0] || null;
    
    // If both code and email are provided, ensure they match
    if (inv && email && inv.email.toLowerCase() !== email.toLowerCase()) {
      return null;
    }
    
    return inv;
  }
  
  if (email) {
    const results = await VeloMemberInvitation.filter({ email: email.toLowerCase() }, "-created_at");
    // Find newest non-revoked record
    return results.find(inv => inv.status !== 'revoked') || null;
  }
  
  return null;
}

/**
 * Accepts an invitation for a signed-in user
 */
export async function acceptInvitation(invitationId: string, user: any) {
  try {
    const inv = await VeloMemberInvitation.get(invitationId);
    if (!inv) {
      throw new Error("Invitation not found.");
    }

    const status = getInvitationStatus(inv);

    if (status === 'revoked') throw new Error("This invitation has been revoked by an administrator.");
    if (status === 'accepted') throw new Error("This invitation has already been accepted.");
    if (status === 'expired') {
      // Update status to expired in DB if it was still 'sent'
      if (inv.status === 'sent') {
        await VeloMemberInvitation.update(invitationId, { status: 'expired' });
      }
      throw new Error("This invitation has expired.");
    }
    if (status !== 'valid') throw new Error("Invitation is no longer valid.");

    // Normalize email for comparison
    const userEmail = user.email.toLowerCase().trim();
    const invEmail = inv.email.toLowerCase().trim();

    // Security check: user email must match invitation email
    if (userEmail !== invEmail) {
      throw new Error(`This invitation was issued for ${inv.email}, but you are signed in as ${user.email}. Please switch accounts.`);
    }

    // Safely normalize existing metadata
    let existingMetadata = {};
    if (inv.metadata) {
      if (typeof inv.metadata === 'string') {
        try {
          existingMetadata = JSON.parse(inv.metadata);
        } catch (e) {
          console.error("[VELO] Failed to parse invitation metadata during acceptance:", e);
        }
      } else if (typeof inv.metadata === 'object') {
        existingMetadata = inv.metadata;
      }
    }

    const now = new Date().toISOString();
    await VeloMemberInvitation.update(invitationId, {
      status: "accepted",
      accepted_at: now,
      workspace_status: "ready",
      metadata: {
        ...existingMetadata,
        accepted_user_id: user.id,
        accepted_user_email: user.email,
        accepted_role: inv.role,
        accepted_at: now
      }
    });

    // Log the milestone
    await logAdminAction(
      user, 
      "INVITE_ACCEPTED", 
      `User ${user.email} accepted invitation ${inv.token_hint}`, 
      'MEMBER'
    );

    return { 
      success: true, 
      role: inv.role, 
      onboardingRoute: inv.onboarding_route || "/" 
    };
  } catch (err) {
    console.error("[VELO] Failed to accept invitation:", err);
    throw err;
  }
}

/**
 * Revokes an invitation
 */
export async function revokeInvitation(invitationId: string, adminUser: any) {
  try {
    const inv = await VeloMemberInvitation.get(invitationId);
    await VeloMemberInvitation.update(invitationId, {
      status: "revoked",
      revoked_at: new Date().toISOString()
    });
    
    if (inv) {
      await logAdminAction(adminUser, "INVITE_REVOKED", `Revoked invitation for ${inv.email}`, 'MEMBER');
    }
    return true;
  } catch (err) {
    console.error("[VELO] Failed to revoke invitation:", err);
    return false;
  }
}

/**
 * Resends an invitation (increments count, updates timestamp, and triggers real email)
 */
export async function resendInvitation(invitationId: string, adminUser: any) {
  try {
    const inv = await VeloMemberInvitation.get(invitationId);
    if (!inv) return false;

    // Status guard: only valid invitations can be resent
    const status = getInvitationStatus(inv);
    if (['accepted', 'revoked', 'invalid_status'].includes(status)) {
      return false;
    }
    
    // If it's expired, update it in DB and return false
    if (status === 'expired') {
      if (inv.status === 'sent') {
        await VeloMemberInvitation.update(invitationId, { status: 'expired' });
      }
      return false;
    }

    const resendCount = (inv.resend_count || 0) + 1;
    let emailSuccess = false;
    let errorDetails = "";
    
    // Attempt real email send
    try {
      await sendInvitationEmail(
        inv.email,
        inv.role,
        inv.token_hint,
        adminUser.email,
        new Date(inv.expires_at)
      );
      emailSuccess = true;
    } catch (emailErr: any) {
      console.error("[VELO] Email resend failed:", emailErr);
      errorDetails = emailErr?.message || String(emailErr);
    }

    // Safely normalize existing metadata
    let existingMetadata = {};
    if (inv.metadata) {
      if (typeof inv.metadata === 'string') {
        try {
          existingMetadata = JSON.parse(inv.metadata);
        } catch (e) {
          console.error("[VELO] Failed to parse invitation metadata:", e);
        }
      } else if (typeof inv.metadata === 'object') {
        existingMetadata = inv.metadata;
      }
    }

    // Always update record to reflect the attempt and tracking metadata
    await VeloMemberInvitation.update(invitationId, {
      status: "sent",
      sent_at: new Date().toISOString(),
      resend_count: resendCount,
      metadata: {
        ...existingMetadata,
        email_delivery_status: emailSuccess ? "sent" : "failed",
        delivery_error: errorDetails,
        last_resend_attempt_at: new Date().toISOString()
      }
    });

    if (emailSuccess) {
      await logAdminAction(adminUser, "INVITE_RESENT", `Resent invitation to ${inv.email} (Count: ${resendCount})`, 'MEMBER');
      return true;
    }
    
    return false;
  } catch (err) {
    console.error("[VELO] Failed to resend invitation:", err);
    return false;
  }
}
