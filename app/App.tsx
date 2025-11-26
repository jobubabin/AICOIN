"use client";

import { useCallback } from "react";
import { ChatKitPanel, type FactAction } from "@/components/ChatKitPanel";

export default function App() {
  const handleWidgetAction = useCallback(async (action: FactAction) => {
    if (process.env.NODE_ENV !== "production") {
      console.info("[ChatKitPanel] widget action", action);
    }
  }, []);

  const handleResponseEnd = useCallback(() => {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[ChatKitPanel] response end");
    }
  }, []);

  const handleThemeRequest = useCallback(() => {
    // Dark mode is disabled - ignore theme requests
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-end bg-slate-100">
      <div className="mx-auto w-full max-w-5xl">
        <ChatKitPanel
          theme="light"
          onWidgetAction={handleWidgetAction}
          onResponseEnd={handleResponseEnd}
          onThemeRequest={handleThemeRequest}
        />
      </div>
    </main>
  );
}
