import { SecureVaultItem } from "@/entities";

export interface SecureReferenceResult {
  type: 'secure_query' | 'general';
  // Only populated when type === 'secure_query'
  secureItems?: Array<{
    id: string;
    label: string;
    category: string;
    username_hint: string;
    permission_scope: string;
  }>;
  responseHint?: string;  // Brief natural-language hint for the CO to use
}

/**
 * Detects if a message is asking about secure/credential data,
 * and returns safe label-only references if so.
 */
export async function getSecureHandoffContext(
  message: string, 
  userEmail: string, 
  isAdmin: boolean
): Promise<SecureReferenceResult> {
  // Secure keywords — anything related to credentials, banking, secrets
  const secureKeywords = [
    "payout", "bank", "credential", "password", "secret", "vault",
    "secure", "payment method", "wallet address", "crypto", "api key",
    "login", "account number", "routing", "paypal", "stripe key",
    "my credentials", "my bank", "how do i get paid", "where is my",
    "payout info", "payout method", "connected accounts"
  ];
  
  const msg = message.toLowerCase();
  const isSecureQuery = secureKeywords.some(k => msg.includes(k));
  
  if (!isSecureQuery) {
    return { type: 'general' };
  }

  // Fetch user's secure items (labels only, NEVER touch encrypted_payload)
  const allItems = await SecureVaultItem.list().catch(() => []);
  const userItems = isAdmin 
    ? allItems 
    : allItems.filter((i: any) => i.created_by === userEmail);

  // Map to safe label-only references
  const secureItems = userItems.map((item: any) => ({
    id: item.id,
    label: item.label || "Untitled",
    category: item.category || "general",
    username_hint: item.username_hint || "",
    permission_scope: item.permission_scope || "private",
  }));

  // Build a helpful response hint
  let responseHint = "";
  if (secureItems.length === 0) {
    responseHint = "You have no credentials stored in Secure Core yet. You can add them from the Credential Vault.";
  } else {
    const categories = [...new Set(secureItems.map(i => i.category))];
    responseHint = `You have ${secureItems.length} secure items across ${categories.length} categories: ${categories.join(", ")}.`;
  }

  return { type: 'secure_query', secureItems, responseHint };
}
