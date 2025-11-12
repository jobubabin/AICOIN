"use client";

import { useCallback, useEffect, useState } from "react";
import { ChatKitPanel, type FactAction } from "@/components/ChatKitPanel";
import UsageSidebar from "@/components/UsageSidebar";
import type { ColorScheme } from "@/hooks/useColorScheme";

const FORCED_SCHEME: ColorScheme = "light";

export default function App() {
  const [usageSidebarOpen, setUsageSidebarOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>();

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    root.dataset.colorScheme = FORCED_SCHEME;
    root.classList.remove("dark");
    root.style.colorScheme = FORCED_SCHEME;

    // Load sidebar state from localStorage
    const savedState = localStorage.getItem("usage-sidebar-open");
    if (savedState === "true") {
      setUsageSidebarOpen(true);
    }
  }, []);

  useEffect(() => {
    // Save sidebar state to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("usage-sidebar-open", String(usageSidebarOpen));
    }
  }, [usageSidebarOpen]);

  const handleWidgetAction = useCallback(async (action: FactAction) => {
    if (process.env.NODE_ENV !== "production") {
      console.info("[ChatKitPanel] widget action", action);
    }
  }, []);

  const handleResponseEnd = useCallback((sessionId?: string) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[ChatKitPanel] response end", sessionId);
    }
    if (sessionId) {
      setCurrentSessionId(sessionId);
    }
  }, []);

  const toggleUsageSidebar = () => {
    setUsageSidebarOpen((prev) => !prev);
  };

  return (
    <main className="flex min-h-screen bg-white">
      {/* Usage Sidebar */}
      <UsageSidebar
        isOpen={usageSidebarOpen}
        onClose={() => setUsageSidebarOpen(false)}
        currentSessionId={currentSessionId}
      />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col items-center justify-end transition-all duration-300 ${usageSidebarOpen ? 'lg:ml-80' : ''}`}>
        {/* Header with Toggle Button */}
        <div className="w-full max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={toggleUsageSidebar}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="Token-Nutzung anzeigen"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Token-Nutzung</span>
          </button>
        </div>

        {/* Chat Panel */}
        <div className="mx-auto w-full max-w-5xl px-4">
          <ChatKitPanel
            theme={FORCED_SCHEME}
            onWidgetAction={handleWidgetAction}
            onResponseEnd={handleResponseEnd}
            onThemeRequest={() => {}}
          />
        </div>
      </div>
    </main>
  );
}
