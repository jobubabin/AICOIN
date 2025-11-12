"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PromptSidebar from "./PromptSidebar";
import { ChatKit, useChatKit } from "@openai/chatkit-react";
import {
  STARTER_PROMPTS,
  PLACEHOLDER_INPUT,
  GREETING,
  CREATE_SESSION_ENDPOINT,
  WORKFLOW_ID,
  getThemeConfig,
} from "@/lib/config";
import { ErrorOverlay } from "./ErrorOverlay";
import type { ColorScheme } from "@/hooks/useColorScheme";
import ToolTracePanel, { ToolTraceEvent } from "./ToolTracePanel";

export type FactAction = {
  type: "save";
  factId: string;
  factText: string;
};

type ChatKitPanelProps = {
  theme: ColorScheme;
  onWidgetAction: (action: FactAction) => Promise<void>;
  onResponseEnd: () => void;
  onThemeRequest: (scheme: ColorScheme) => void;
};

type ErrorState = {
  script: string | null;
  session: string | null;
  integration: string | null;
  retryable: boolean;
};

type WidgetAction = {
  type: string;
  values?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

type ChatKitLogDetail = {
  name: string;
  data?: Record<string, unknown>;
};

const isBrowser = typeof window !== "undefined";
const isDev = process.env.NODE_ENV !== "production";

const createInitialErrors = (): ErrorState => ({
  script: null,
  session: null,
  integration: null,
  retryable: false,
});

export function ChatKitPanel({
  theme,
  onWidgetAction,
  onResponseEnd,
  onThemeRequest,
}: ChatKitPanelProps) {
  const processedFacts = useRef(new Set<string>());
  const [errors, setErrors] = useState<ErrorState>(() => createInitialErrors());
  const [isInitializingSession, setIsInitializingSession] = useState(true);
  const isMountedRef = useRef(true);
  const [scriptStatus, setScriptStatus] = useState<"pending" | "ready" | "error">(
    () => (isBrowser && window.customElements?.get("openai-chatkit") ? "ready" : "pending")
  );
  const [widgetInstanceKey, setWidgetInstanceKey] = useState(0);
  const [toolEvents, setToolEvents] = useState<ToolTraceEvent[]>([]);

  const resetToolEvents = useCallback(() => {
    setToolEvents([]);
  }, []);

  const appendToolEvent = useCallback((entry: ToolTraceEvent) => {
    setToolEvents((current) => {
      const next = [...current, entry];
      const MAX_EVENTS = 60;
      return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next;
    });
  }, []);

  const setErrorState = useCallback((updates: Partial<ErrorState>) => {
    setErrors((current) => ({ ...current, ...updates }));
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isBrowser) return;

    let timeoutId: number | undefined;

    const handleLoaded = () => {
      if (!isMountedRef.current) return;
      setScriptStatus("ready");
      setErrorState({ script: null });
    };

    const handleError = (event: Event) => {
      console.error("Failed to load chatkit.js for some reason", event);
      if (!isMountedRef.current) return;
      setScriptStatus("error");
      const detail = (event as CustomEvent<unknown>)?.detail ?? "unknown error";
      setErrorState({ script: `Error: ${String(detail)}`, retryable: false });
      setIsInitializingSession(false);
    };

    window.addEventListener("chatkit-script-loaded", handleLoaded);
    window.addEventListener("chatkit-script-error", handleError as EventListener);

    if (window.customElements?.get("openai-chatkit")) {
      handleLoaded();
    } else if (scriptStatus === "pending") {
      timeoutId = window.setTimeout(() => {
        if (!window.customElements?.get("openai-chatkit")) {
          handleError(
            new CustomEvent("chatkit-script-error", {
              detail:
                "ChatKit web component is unavailable. Verify that the script URL is reachable.",
            })
          );
        }
      }, 5000);
    }

    return () => {
      window.removeEventListener("chatkit-script-loaded", handleLoaded);
      window.removeEventListener("chatkit-script-error", handleError as EventListener);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [scriptStatus, setErrorState]);

  const isWorkflowConfigured = Boolean(
    WORKFLOW_ID && !WORKFLOW_ID.startsWith("wf_replace")
  );

  useEffect(() => {
    if (!isWorkflowConfigured && isMountedRef.current) {
      setErrorState({
        session: "Set NEXT_PUBLIC_CHATKIT_WORKFLOW_ID in your .env.local file.",
        retryable: false,
      });
      setIsInitializingSession(false);
    }
  }, [isWorkflowConfigured, setErrorState]);

  const handleResetChat = useCallback(() => {
    processedFacts.current.clear();
    if (isBrowser) {
      setScriptStatus(
        window.customElements?.get("openai-chatkit") ? "ready" : "pending"
      );
    }
    setIsInitializingSession(true);
    setErrors(createInitialErrors());
    setWidgetInstanceKey((prev) => prev + 1);
    resetToolEvents();
  }, [resetToolEvents]);

  const getClientSecret = useCallback(
    async (currentSecret: string | null) => {
      if (isDev) {
        console.info("[ChatKitPanel] getClientSecret invoked", {
          currentSecretPresent: Boolean(currentSecret),
          workflowId: WORKFLOW_ID,
          endpoint: CREATE_SESSION_ENDPOINT,
        });
      }

      if (!isWorkflowConfigured) {
        const detail = "Set NEXT_PUBLIC_CHATKIT_WORKFLOW_ID in your .env.local file.";
        if (isMountedRef.current) {
          setErrorState({ session: detail, retryable: false });
          setIsInitializingSession(false);
        }
        throw new Error(detail);
      }

      if (isMountedRef.current) {
        if (!currentSecret) setIsInitializingSession(true);
        setErrorState({ session: null, integration: null, retryable: false });
      }

      try {
        const response = await fetch(CREATE_SESSION_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflow: { id: WORKFLOW_ID },
            chatkit_configuration: {
              file_upload: { enabled: true }, // enable attachments
            },
          }),
        });

        const raw = await response.text();

        if (isDev) {
          console.info("[ChatKitPanel] createSession response", {
            status: response.status,
            ok: response.ok,
            bodyPreview: raw.slice(0, 1600),
          });
        }

        let data: Record<string, unknown> = {};
        if (raw) {
          try {
            data = JSON.parse(raw) as Record<string, unknown>;
          } catch (parseError) {
            console.error("Failed to parse create-session response", parseError);
          }
        }

        if (!response.ok) {
          const detail = extractErrorDetail(data, response.statusText);
          console.error("Create session request failed", {
            status: response.status,
            body: data,
          });
          throw new Error(detail);
        }

        const clientSecret = data?.client_secret as string | undefined;
        if (!clientSecret) {
          throw new Error("Missing client secret in response");
        }

        if (isMountedRef.current) {
          setErrorState({ session: null, integration: null });
        }

        return clientSecret;
      } catch (error) {
        console.error("Failed to create ChatKit session", error);
        const detail =
          error instanceof Error
            ? error.message
            : "Unable to start ChatKit session.";
        if (isMountedRef.current) {
          setErrorState({ session: detail, retryable: false });
        }
        throw error instanceof Error ? error : new Error(detail);
      } finally {
        if (isMountedRef.current && !currentSecret) {
          setIsInitializingSession(false);
        }
      }
    },
    [isWorkflowConfigured, setErrorState]
  );

  const { control, setComposerValue, focusComposer } = useChatKit({
    locale: "de-DE",
    api: { getClientSecret },
    theme: { colorScheme: theme, ...getThemeConfig(theme) },
    startScreen: { greeting: GREETING, prompts: STARTER_PROMPTS },
    composer: {
      placeholder: PLACEHOLDER_INPUT,
      attachments: { enabled: true },
    },
    // Handle widget button "In Eingabefeld übernehmen"
    widgets: {
      onAction: async (action: WidgetAction) => {
        if (action.type === "prompt.insert") {
          const text =
            typeof action.values?.prompt_text === "string"
              ? action.values.prompt_text
              : "";
          const trimmed = text.trim();
          if (trimmed) {
            await setComposerValue({ text: "" });
            await setComposerValue({ text: trimmed });
            await focusComposer();
          }
        }
      },
    },
    threadItemActions: { feedback: false },
    onClientTool: async (invocation: {
      name: string;
      params: Record<string, unknown>;
    }) => {
      if (invocation.name === "switch_theme") {
        const requested = invocation.params.theme;
        if (requested === "light") {
          if (isDev) console.debug("[ChatKitPanel] switch_theme", requested);
          onThemeRequest(requested as ColorScheme);
          return { success: true };
        }
        return { success: false };
      }

      if (invocation.name === "record_fact") {
        const id = String(invocation.params.fact_id ?? "");
        const text = String(invocation.params.fact_text ?? "");
        if (!id || processedFacts.current.has(id)) return { success: true };
        processedFacts.current.add(id);
        void onWidgetAction({
          type: "save",
          factId: id,
          factText: text.replace(/\s+/g, " ").trim(),
        });
        return { success: true };
      }

      return { success: false };
    },
    onResponseEnd: () => {
      onResponseEnd();
    },
    onResponseStart: () => {
      setErrorState({ integration: null, retryable: false });
    },
    onThreadChange: () => {
      processedFacts.current.clear();
      resetToolEvents();
    },
    onError: ({ error }: { error: unknown }) => {
      console.error("ChatKit error", error);
    },
  });

  useEffect(() => {
    if (!control) return;

    const handleLog = (event: Event) => {
      const detail = (event as CustomEvent<ChatKitLogDetail>).detail;
      if (!detail) return;
      appendToolEvent(createToolTraceEvent(detail));
    };

    const handleError = (event: Event) => {
      const detail = (event as CustomEvent<{ error: Error }>).detail;
      appendToolEvent({
        id: createTraceId(),
        timestamp: Date.now(),
        name: "chatkit.error",
        summary: detail?.error?.message ?? "ChatKit error",
        status: "error",
        payload: detail?.error
          ? {
              message: detail.error.message,
              stack: detail.error.stack ?? null,
            }
          : undefined,
      });
    };

    const handleResponseStart = () => {
      appendToolEvent({
        id: createTraceId(),
        timestamp: Date.now(),
        name: "chatkit.response.start",
        summary: "Assistant response started",
        status: "info",
      });
    };

    const handleResponseEnd = () => {
      appendToolEvent({
        id: createTraceId(),
        timestamp: Date.now(),
        name: "chatkit.response.end",
        summary: "Assistant response completed",
        status: "success",
      });
    };

    control.addEventListener("chatkit.log", handleLog as EventListener);
    control.addEventListener("chatkit.error", handleError as EventListener);
    control.addEventListener(
      "chatkit.response.start",
      handleResponseStart as EventListener
    );
    control.addEventListener(
      "chatkit.response.end",
      handleResponseEnd as EventListener
    );

    return () => {
      control.removeEventListener("chatkit.log", handleLog as EventListener);
      control.removeEventListener("chatkit.error", handleError as EventListener);
      control.removeEventListener(
        "chatkit.response.start",
        handleResponseStart as EventListener
      );
      control.removeEventListener(
        "chatkit.response.end",
        handleResponseEnd as EventListener
      );
    };
  }, [control, appendToolEvent]);

  const handleInsertPrompt = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      await setComposerValue({ text: "" });
      await setComposerValue({ text: trimmed });
      await focusComposer();
    },
    [focusComposer, setComposerValue]
  );

  const activeError = errors.session ?? errors.integration;
  const blockingError = errors.script ?? activeError;

  if (isDev) {
    console.debug("[ChatKitPanel] render state", {
      isInitializingSession,
      hasControl: Boolean(control),
      scriptStatus,
      hasError: Boolean(blockingError),
      workflowId: WORKFLOW_ID,
    });
  }

  return (
    <div className="flex h-[90vh] w-full flex-col gap-4 lg:flex-row">
      <PromptSidebar
        className="w-72 shrink-0"
        onInsert={handleInsertPrompt}
      />
      <div className="flex flex-1 gap-4">
        <div className="relative pb-8 flex flex-1 rounded-2xl flex-col overflow-hidden bg-white shadow-xl transition-colors">
          <ChatKit
            key={widgetInstanceKey}
            control={control}
            className={
              blockingError || isInitializingSession
                ? "pointer-events-none opacity-0"
                : "block h-full w-full"
            }
          />
          <ErrorOverlay
            error={blockingError}
            fallbackMessage={
              blockingError || !isInitializingSession
                ? null
                : "Loading assistant session..."
            }
            onRetry={blockingError && errors.retryable ? handleResetChat : null}
            retryLabel="Restart chat"
          />
        </div>
        <ToolTracePanel
          className="hidden w-80 shrink-0 lg:block"
          events={toolEvents}
          onClear={resetToolEvents}
        />
      </div>
    </div>
  );
}

function extractErrorDetail(
  payload: Record<string, unknown> | undefined,
  fallback: string
): string {
  if (!payload) return fallback;

  const error = payload.error;
  if (typeof error === "string") return error;

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  const details = payload.details;
  if (typeof details === "string") return details;

  if (details && typeof details === "object" && "error" in details) {
    const nestedError = (details as { error?: unknown }).error;
    if (typeof nestedError === "string") return nestedError;
    if (
      nestedError &&
      typeof nestedError === "object" &&
      "message" in nestedError &&
      typeof (nestedError as { message?: unknown }).message === "string"
    ) {
      return (nestedError as { message: string }).message;
    }
  }

  if (typeof payload.message === "string") return payload.message;

  return fallback;
}

function createToolTraceEvent(detail: ChatKitLogDetail): ToolTraceEvent {
  const payload =
    detail.data && Object.keys(detail.data).length > 0 ? detail.data : undefined;
  const toolName = extractString(detail.data, [
    "tool",
    "tool_name",
    "toolName",
    "function",
    "name",
  ]);
  const phase = extractString(detail.data, [
    "phase",
    "status",
    "stage",
    "event",
  ]);
  const summaryParts = [
    toolName,
    phase ?? inferPhaseFromName(detail.name),
  ].filter(Boolean);
  const summary =
    summaryParts.length > 0
      ? summaryParts.join(" • ")
      : detail.name.replace(/^chatkit\./, "");

  return {
    id: createTraceId(),
    timestamp: Date.now(),
    name: detail.name,
    summary,
    status: inferStatus(detail.name, detail.data),
    payload,
  };
}

function inferPhaseFromName(name: string): string | undefined {
  if (name.endsWith(".start")) return "start";
  if (name.endsWith(".end")) return "end";
  return undefined;
}

function inferStatus(
  name: string,
  data?: Record<string, unknown>
): ToolTraceEvent["status"] {
  const hint = extractString(data, ["status", "phase", "state"]);
  if (hint) {
    const lower = hint.toLowerCase();
    if (["success", "ok", "completed", "done"].includes(lower)) return "success";
    if (["error", "failed", "fail"].includes(lower)) return "error";
    if (["start", "pending", "calling"].includes(lower)) return "pending";
  }
  const normalized = name.toLowerCase();
  if (
    normalized.includes("error") ||
    normalized.includes("fail") ||
    normalized.includes("exception")
  ) {
    return "error";
  }
  if (
    normalized.includes("result") ||
    normalized.includes("success") ||
    normalized.includes("complete") ||
    normalized.endsWith(".end")
  ) {
    return "success";
  }
  if (normalized.includes("start") || normalized.includes("call")) {
    return "pending";
  }
  return "info";
}

function extractString(
  data: Record<string, unknown> | undefined,
  keys: string[]
): string | undefined {
  if (!data) return undefined;
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return undefined;
}

function createTraceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}
