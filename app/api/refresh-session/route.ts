import { WORKFLOW_ID } from "@/lib/config";

import {
  DEFAULT_CHATKIT_BASE,
  buildJsonResponse,
  cancelChatkitSession,
  createChatkitSession,
  extractUpstreamError,
  getDefaultSessionRateLimits,
  resolveUserId,
  sanitizeExpiresAfterSecondsInput,
  sanitizeRateLimitsInput,
  safeParseJson,
} from "../_lib/chatkit";

export const runtime = "edge";

interface RefreshSessionRequestBody {
  workflow?: { id?: string | null } | null;
  scope?: { user_id?: string | null } | null;
  workflowId?: string | null;
  chatkit_configuration?: {
    file_upload?: {
      enabled?: boolean;
    };
  } | null;
  expires_after?: {
    seconds?: number | string | null;
  } | null;
  rate_limits?: {
    max_requests_per_1_minute?: number | string | null;
  } | null;
  current_client_secret?: string | null;
  session_id?: string | null;
}

export async function POST(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return methodNotAllowedResponse();
  }

  let sessionCookie: string | null = null;

  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({
          error: "Missing OPENAI_API_KEY environment variable",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const parsedBody = await safeParseJson<RefreshSessionRequestBody>(request);
    const { userId, sessionCookie: resolvedSessionCookie } =
      await resolveUserId(request);
    sessionCookie = resolvedSessionCookie;

    const resolvedWorkflowId =
      parsedBody?.workflow?.id ?? parsedBody?.workflowId ?? WORKFLOW_ID;
    const currentClientSecret =
      typeof parsedBody?.current_client_secret === "string"
        ? parsedBody.current_client_secret
        : null;
    const previousSessionId =
      typeof parsedBody?.session_id === "string"
        ? parsedBody.session_id
        : null;

    if (process.env.NODE_ENV !== "production") {
      console.info("[refresh-session] handling request", {
        resolvedWorkflowId,
        hasCurrentSecret: Boolean(currentClientSecret),
        previousSessionId,
      });
    }

    if (!resolvedWorkflowId) {
      return buildJsonResponse(
        { error: "Missing workflow id" },
        400,
        { "Content-Type": "application/json" },
        sessionCookie
      );
    }

    const apiBase = process.env.CHATKIT_API_BASE ?? DEFAULT_CHATKIT_BASE;
    const chatkitConfiguration = {
      file_upload: {
        enabled:
          parsedBody?.chatkit_configuration?.file_upload?.enabled ?? false,
      },
    };

    const expiresAfterSeconds = sanitizeExpiresAfterSecondsInput(
      parsedBody?.expires_after ?? null
    );

    const rateLimitsOverride = sanitizeRateLimitsInput(
      parsedBody?.rate_limits ?? null
    );
    const rateLimits = rateLimitsOverride ?? getDefaultSessionRateLimits();

    const { upstreamResponse, upstreamJson } = await createChatkitSession({
      openaiApiKey,
      workflowId: resolvedWorkflowId,
      userId,
      apiBase,
      chatkitConfiguration,
      scope: parsedBody?.scope ?? null,
      expiresAfterSeconds,
      rateLimits,
    });

    if (process.env.NODE_ENV !== "production") {
      console.info("[refresh-session] upstream response", {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
      });
    }

    if (!upstreamResponse.ok) {
      const upstreamError = extractUpstreamError(upstreamJson);
      console.error("OpenAI ChatKit session refresh failed", {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        body: upstreamJson,
      });
      return buildJsonResponse(
        {
          error:
            upstreamError ??
            `Failed to refresh session: ${upstreamResponse.statusText}`,
          details: upstreamJson,
        },
        upstreamResponse.status,
        { "Content-Type": "application/json" },
        sessionCookie
      );
    }

    const clientSecret =
      typeof upstreamJson?.client_secret === "string"
        ? upstreamJson.client_secret
        : null;

    if (!clientSecret) {
      console.error("ChatKit refresh response missing client secret", {
        body: upstreamJson,
      });
      return buildJsonResponse(
        {
          error: "ChatKit session refresh did not return a client secret",
          details: upstreamJson,
        },
        502,
        { "Content-Type": "application/json" },
        sessionCookie
      );
    }

    const sessionId =
      typeof upstreamJson?.id === "string" ? upstreamJson.id : null;
    const expiresAt =
      typeof upstreamJson?.expires_at === "number"
        ? upstreamJson.expires_at
        : null;

    const responsePayload = {
      client_secret: clientSecret,
      session_id: sessionId,
      expires_at: expiresAt,
      expires_after: upstreamJson?.expires_after ?? null,
      rate_limits: upstreamJson?.rate_limits ?? null,
      previous_session_id: previousSessionId,
    };

    const shouldCancelPreviousSession =
      process.env.CHATKIT_CANCEL_PREVIOUS_SESSION_ON_REFRESH === "true";

    if (
      shouldCancelPreviousSession &&
      previousSessionId &&
      sessionId &&
      previousSessionId !== sessionId
    ) {
      try {
        await cancelChatkitSession({
          openaiApiKey,
          sessionId: previousSessionId,
          apiBase,
        });
      } catch (cancelError) {
        console.warn("Failed to cancel previous ChatKit session", {
          error: cancelError,
          previousSessionId,
        });
      }
    }

    return buildJsonResponse(
      responsePayload,
      200,
      { "Content-Type": "application/json" },
      sessionCookie
    );
  } catch (error) {
    console.error("Refresh session error", error);
    return buildJsonResponse(
      { error: "Unexpected error" },
      500,
      { "Content-Type": "application/json" },
      sessionCookie
    );
  }
}

export async function GET(): Promise<Response> {
  return methodNotAllowedResponse();
}

function methodNotAllowedResponse(): Response {
  return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
}
