import { useMemo } from "react";

export type ToolTraceStatus = "info" | "pending" | "success" | "error";

export type ToolTraceEvent = {
  id: string;
  timestamp: number;
  name: string;
  summary: string;
  status: ToolTraceStatus;
  payload?: Record<string, unknown>;
};

type ToolTracePanelProps = {
  events: ToolTraceEvent[];
  onClear: () => void;
  className?: string;
};

export function ToolTracePanel({
  events,
  onClear,
  className,
}: ToolTracePanelProps) {
  const ordered = useMemo(() => [...events].reverse(), [events]);

  return (
    <aside
      className={`rounded-2xl border border-rose-100 bg-white p-3 shadow-sm ${className ?? ""}`}
      aria-label="Tool activity"
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Tool activity</p>
          <p className="text-xs text-gray-500">
            Live trace of agent tool calls
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium text-rose-600 hover:text-rose-700"
        >
          Clear
        </button>
      </div>
      {ordered.length === 0 ? (
        <p className="text-sm text-gray-500">
          Tool calls will appear here while the agent works.
        </p>
      ) : (
        <ul className="flex max-h-[80vh] flex-col gap-2 overflow-y-auto pr-1 text-sm">
          {ordered.map((event) => (
            <li
              key={event.id}
              className="rounded-lg border border-gray-100 bg-gray-50 p-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">
                  {event.summary}
                </span>
                <StatusBadge status={event.status} />
              </div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500">
                {new Date(event.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}{" "}
                · {event.name}
              </p>
              {event.payload ? (
                <pre className="mt-1 max-h-40 overflow-y-auto rounded bg-white p-2 text-xs text-gray-800">
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

function StatusBadge({ status }: { status: ToolTraceStatus }) {
  const styles: Record<ToolTraceStatus, string> = {
    info: "bg-gray-200 text-gray-700",
    pending: "bg-amber-100 text-amber-800",
    success: "bg-emerald-100 text-emerald-800",
    error: "bg-rose-100 text-rose-800",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${styles[status]}`}>
      {status}
    </span>
  );
}

export default ToolTracePanel;
