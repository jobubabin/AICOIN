"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatCost, formatTokens } from "@/lib/pricing";

interface DailyStats {
  date: string;
  requests: number;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  cost: number;
}

interface CurrentSession {
  sessionId: string;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  cost: number;
  requestCount: number;
}

interface SessionHistory {
  sessionId: string;
  userId: string | null;
  startTime: string;
  endTime: string | null;
  requestCount: number;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  cost: number;
}

interface UsageSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentSessionId?: string;
  onSessionUpdate?: (stats: CurrentSession) => void;
}

export default function UsageSidebar({
  isOpen,
  onClose,
  currentSessionId,
}: UsageSidebarProps) {
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [currentSession, setCurrentSession] = useState<CurrentSession | null>(null);
  const [history, setHistory] = useState<SessionHistory[]>([]);
  const [totals, setTotals] = useState({
    totalRequests: 0,
    tokensTotal: 0,
    totalCost: 0,
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7" | "30">("7");

  const fetchStats = async () => {
    try {
      setLoading(true);
      const url = `/api/usage/stats?period=${period}${
        currentSessionId ? `&sessionId=${currentSessionId}` : ""
      }`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setDailyStats(data.dailyStats);
        setTotals(data.totals);
        setCurrentSession(data.currentSession);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch("/api/usage/history?limit=10");
      const data = await response.json();

      if (data.success) {
        setHistory(data.history);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStats();
      fetchHistory();
    }
  }, [isOpen, period, currentSessionId]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } overflow-y-auto`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Token-Nutzung
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
            aria-label="Schließen"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="p-4 space-y-4">
            <div className="animate-pulse space-y-3">
              <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-lg" />
              <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
              <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-lg" />
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {/* Current Session */}
            {currentSession && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-red-900 dark:text-red-100 mb-3">
                  Aktuelle Sitzung
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-red-700 dark:text-red-300">Anfragen:</span>
                    <span className="font-medium text-red-900 dark:text-red-100">
                      {currentSession.requestCount}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-700 dark:text-red-300">Tokens:</span>
                    <span className="font-medium text-red-900 dark:text-red-100">
                      {formatTokens(currentSession.tokensTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-red-200 dark:border-red-800">
                    <span className="text-red-700 dark:text-red-300">Kosten:</span>
                    <span className="font-semibold text-red-900 dark:text-red-100">
                      {formatCost(currentSession.cost)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Period Selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setPeriod("7")}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  period === "7"
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                7 Tage
              </button>
              <button
                onClick={() => setPeriod("30")}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  period === "30"
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                30 Tage
              </button>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Anfragen</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {totals.totalRequests}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Tokens</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {formatTokens(totals.tokensTotal)}
                </div>
              </div>
              <div className="col-span-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Gesamtkosten</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCost(totals.totalCost)}
                </div>
              </div>
            </div>

            {/* Chart */}
            {dailyStats.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Nutzungstrend
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={dailyStats}>
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "#6b7280" }}
                        tickFormatter={(date) => new Date(date).toLocaleDateString("de-DE", { month: "short", day: "numeric" })}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#6b7280" }}
                        tickFormatter={(value) => formatCost(value)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        labelStyle={{ color: "#f3f4f6" }}
                        formatter={(value: number) => [formatCost(value), "Kosten"]}
                        labelFormatter={(date) => new Date(date).toLocaleDateString("de-DE")}
                      />
                      <Line
                        type="monotone"
                        dataKey="cost"
                        stroke="#bb0a30"
                        strokeWidth={2}
                        dot={{ fill: "#bb0a30", r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Recent Sessions */}
            {history.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Letzte Sitzungen
                </h3>
                <div className="space-y-2">
                  {history.map((session) => (
                    <div
                      key={session.sessionId}
                      className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-gray-600 dark:text-gray-400">
                          {new Date(session.startTime).toLocaleDateString("de-DE", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatCost(session.cost)}
                        </div>
                      </div>
                      <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>{session.requestCount} Anfragen</span>
                        <span>{formatTokens(session.tokensTotal)} Tokens</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={() => {
                fetchStats();
                fetchHistory();
              }}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Aktualisieren
            </button>
          </div>
        )}
      </div>
    </>
  );
}
