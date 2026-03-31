"use client";

import { useMemo, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";

export type DashboardTab = "collection" | "expense" | "records" | "summary" | "heads";

const tabs: Array<{ id: DashboardTab; label: string; icon: ReactNode }> = [
  { id: "collection", label: "Add Collection", icon: <span className="text-lg">💰</span> },
  { id: "expense", label: "Add Expense", icon: <span className="text-lg">🧾</span> },
  { id: "records", label: "Records", icon: <span className="text-lg">📚</span> },
  { id: "summary", label: "Summary", icon: <span className="text-lg">📈</span> },
  { id: "heads", label: "Heads", icon: <span className="text-lg">⚙️</span> },
];

export default function Sidebar(props: {
  activeTab: DashboardTab;
  onSelectTab: (t: DashboardTab) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  userEmail?: string | null;
  onSignOut?: () => void;
}) {
  const userInitials = useMemo(() => {
    const email = props.userEmail ?? "";
    if (!email) return "";
    const parts = email.split("@")[0].split(/[._-]/).filter(Boolean);
    const a = parts[0]?.[0] ?? "";
    const b = parts[1]?.[0] ?? "";
    return (a + b).toUpperCase();
  }, [props.userEmail]);

  return (
    <aside
      className={`h-[calc(100vh-0px)] sticky top-0 bg-white border-r shadow-sm transition-all duration-200 ${
        props.collapsed ? "w-[76px]" : "w-72"
      }`}
    >
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-semibold">
            KM
          </div>
          {!props.collapsed ? (
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-4">Coach Finance</div>
              <div className="text-xs text-zinc-500">ERP-style dashboard</div>
            </div>
          ) : null}
        </div>
        <button
          className="p-2 rounded-lg hover:bg-zinc-100"
          onClick={props.onToggleCollapsed}
          aria-label="Toggle sidebar"
        >
          {props.collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="mt-1 px-2">
        {tabs.map((t) => {
          const selected = props.activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => props.onSelectTab(t.id)}
              className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl transition ${
                selected ? "bg-zinc-900 text-white" : "hover:bg-zinc-100 text-zinc-800"
              }`}
            >
              <span className="shrink-0">{t.icon}</span>
              {!props.collapsed ? (
                <span className="text-sm font-medium truncate">{t.label}</span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="p-3 mt-auto">
        {props.userEmail ? (
          <div className="flex items-center gap-3 rounded-xl border bg-zinc-50 p-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-semibold text-sm">
              {userInitials || props.userEmail.slice(0, 1).toUpperCase()}
            </div>
            {!props.collapsed ? (
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{props.userEmail}</div>
                <div className="text-xs text-zinc-500">Signed in</div>
              </div>
            ) : null}
          </div>
        ) : null}

        {props.onSignOut ? (
          <button
            className={`mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl hover:bg-zinc-100 ${
              props.collapsed ? "" : "text-zinc-800"
            }`}
            onClick={props.onSignOut}
          >
            <LogOut size={16} />
            {!props.collapsed ? <span className="text-sm font-medium">Sign out</span> : null}
          </button>
        ) : null}
      </div>
    </aside>
  );
}

