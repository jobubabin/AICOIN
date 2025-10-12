export const DEFAULT_CHATKIT_BASE = "https://api.openai.com";
export const SESSION_COOKIE_NAME = "chatkit_session_id";
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const DEFAULT_SESSION_TTL_SECONDS = 600;
const MIN_SESSION_TTL_SECONDS = 60;
const MAX_SESSION_TTL_SECONDS = 86_400;

const MIN_RATE_LIMIT_PER_MINUTE = 1;
const MAX_RATE_LIMIT_PER_MINUTE = 120;

type ChatkitConfiguration = {
  file_upload?: {
    enabled?: boolean;
  };
};

type ChatkitScope = {
  user_id?: string | null;
};

export type ChatkitRateLimits = {
  max_requests_per_1_minute?: number;
} | null;

export interface CreateChatkitSessionOptions {
  openaiApiKey: string;
  workflowId: string;
  userId: string;
  apiBase?: string;
  chatkitConfiguration?: ChatkitConfiguration;
  scope?: ChatkitScope | null;
  expiresAfterSeconds?: number | null;
  rateLimits?: ChatkitRateLimits;
  metadata?: Record<string, unknown>;
}

export async function createChatkitSession(
  options: CreateChatkitSessionOptions
): Promise<{
  upstreamResponse: Response;
  upstreamJson: Record<string, unknown> | undefined;
}> {
  const {
    openaiApiKey,
    workflowId,
    userId,
    apiBase,
    chatkitConfiguration,
    scope,
    expiresAfterSeconds,
    rateLimits,
    metadata,
  } = options;

  const resolvedApiBase = (apiBase ?? process.env.CHATKIT_API_BASE ?? DEFAULT_CHATKIT_BASE).replace(/\/$/, "");
  const url = `${resolvedApiBase}/v1/chatkit/sessions`;

  const payload: Record<string, unknown> = {
    workflow: { id: workflowId },
    user: userId,
  };

  const ttlSeconds = sanitizeTtlSeconds(expiresAfterSeconds);
  if (ttlSeconds !== null) {
    payload.expires_after = {
      anchor: "created_at",
      seconds: ttlSeconds,
    };
  }

  const normalizedRateLimits =
    rateLimits && typeof rateLimits.max_requests_per_1_minute === "number"
      ? rateLimits
      : null;
  if (normalizedRateLimits) {
    payload.rate_limits = normalizedRateLimits;
  }

  if (chatkitConfiguration) {
    payload.chatkit_configuration = chatkitConfiguration;
  }

  if (scope) {
    payload.scope = scope;
  }

  if (metadata) {
    payload.metadata = metadata;
  }

  const upstreamResponse = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiApiKey}`,
      "OpenAI-Beta": "chatkit_beta=v1",
    },
    body: JSON.stringify(payload),
  });

  const upstreamJson = (await upstreamResponse.json().catch(() => undefined)) as
    | Record<string, unknown>
    | undefined;

  return { upstreamResponse, upstreamJson };
}

export async function cancelChatkitSession(options: {
  openaiApiKey: string;
  sessionId: string;
  apiBase?: string;
}): Promise<Response> {
  const { openaiApiKey, sessionId, apiBase } = options;
  const resolvedApiBase = (apiBase ?? process.env.CHATKIT_API_BASE ?? DEFAULT_CHATKIT_BASE).replace(/\/$/, "");
  const url = `${resolvedApiBase}/v1/chatkit/sessions/${sessionId}/cancel`;

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiApiKey}`,
      "OpenAI-Beta": "chatkit_beta=v1",
    },
  });
}

export function sanitizeExpiresAfterSecondsInput(value: unknown): number | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const seconds = (value as { seconds?: unknown }).seconds;
  return sanitizeTtlSeconds(seconds);
}

export function sanitizeRateLimitsInput(value: unknown): ChatkitRateLimits {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = (value as { max_requests_per_1_minute?: unknown })
    .max_requests_per_1_minute;
  const numeric = sanitizeRateLimitValue(candidate);
  if (numeric === null) {
    return null;
  }

  return { max_requests_per_1_minute: numeric };
}

export function getSessionTtlSeconds(): number {
  const envValue = sanitizePositiveInteger(
    process.env.CHATKIT_SESSION_TTL_SECONDS
  );
  if (envValue !== null) {
    return clamp(envValue, MIN_SESSION_TTL_SECONDS, MAX_SESSION_TTL_SECONDS);
  }
  return DEFAULT_SESSION_TTL_SECONDS;
}

export function getDefaultSessionRateLimits(): ChatkitRateLimits {
  const envValue = sanitizeRateLimitValue(
    process.env.CHATKIT_SESSION_MAX_REQUESTS_PER_MINUTE
  );
  if (envValue === null) {
    return null;
  }

  return { max_requests_per_1_minute: envValue };
}

export function getCookieValue(
  cookieHeader: string | null,
  name: string
): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [rawName, ...rest] = cookie.split("=");
    if (!rawName || rest.length === 0) {
      continue;
    }
    if (rawName.trim() === name) {
      return rest.join("=").trim();
    }
  }
  return null;
}

export function serializeSessionCookie(value: string): string {
  const attributes = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${SESSION_COOKIE_MAX_AGE}`,
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (process.env.NODE_ENV === "production") {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

export async function resolveUserId(
  request: Request
): Promise<{
  userId: string;
  sessionCookie: string | null;
}> {
  const existing = getCookieValue(
    request.headers.get("cookie"),
    SESSION_COOKIE_NAME
  );
  if (existing) {
    return { userId: existing, sessionCookie: null };
  }

  const generated =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return {
    userId: generated,
    sessionCookie: serializeSessionCookie(generated),
  };
}

export function buildJsonResponse(
  payload: unknown,
  status: number,
  headers: Record<string, string>,
  sessionCookie: string | null
): Response {
  const responseHeaders = new Headers(headers);
  if (sessionCookie) {
    responseHeaders.append("Set-Cookie", sessionCookie);
  }

  return new Response(JSON.stringify(payload), {
    status,
    headers: responseHeaders,
  });
}

export async function safeParseJson<T>(req: Request): Promise<T | null> {
  try {
    const text = await req.text();
    if (!text) {
      return null;
    }
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function extractUpstreamError(
  payload: Record<string, unknown> | undefined
): string | null {
  if (!payload) {
    return null;
  }

  const error = payload.error;
  if (typeof error === "string") {
    return error;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  const details = payload.details;
  if (typeof details === "string") {
    return details;
  }

  if (details && typeof details === "object" && "error" in details) {
    const nestedError = (details as { error?: unknown }).error;
    if (typeof nestedError === "string") {
      return nestedError;
    }
    if (
      nestedError &&
      typeof nestedError === "object" &&
      "message" in nestedError &&
      typeof (nestedError as { message?: unknown }).message === "string"
    ) {
      return (nestedError as { message: string }).message;
    }
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  return null;
}

function sanitizeTtlSeconds(value: unknown): number | null {
  const numeric = sanitizePositiveInteger(value);
  if (numeric === null) {
    return null;
  }
  return clamp(numeric, MIN_SESSION_TTL_SECONDS, MAX_SESSION_TTL_SECONDS);
}

function sanitizeRateLimitValue(value: unknown): number | null {
  const numeric = sanitizePositiveInteger(value);
  if (numeric === null) {
    return null;
  }
  return clamp(numeric, MIN_RATE_LIMIT_PER_MINUTE, MAX_RATE_LIMIT_PER_MINUTE);
}

function sanitizePositiveInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.round(value);
    return rounded > 0 ? rounded : null;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      const rounded = Math.round(parsed);
      return rounded > 0 ? rounded : null;
    }
  }

  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
