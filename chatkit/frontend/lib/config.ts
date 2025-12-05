export const CHATKIT_API_URL =
  process.env.NEXT_PUBLIC_CHATKIT_API_URL?.trim() ??
  "http://127.0.0.1:8000/chatkit";

/**
 * ChatKit requires a domain key at runtime. Use the local fallback while
 * developing, and register a production domain key at
 * https://platform.openai.com/settings/organization/security/domain-allowlist.
 */
export const CHATKIT_API_DOMAIN_KEY =
  process.env.NEXT_PUBLIC_CHATKIT_API_DOMAIN_KEY?.trim() ??
  "domain_pk_localhost_dev";
