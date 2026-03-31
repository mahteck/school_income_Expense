"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar, { type DashboardTab } from "@/components/dashboard/Sidebar";
import CollectionForm from "@/components/dashboard/CollectionForm";
import ExpenseForm from "@/components/dashboard/ExpenseForm";
import RecordsTable from "@/components/dashboard/RecordsTable";
import SummaryPanel from "@/components/dashboard/SummaryPanel";
import HeadsManager from "@/components/dashboard/HeadsManager";
import {
  getMonthOptions,
  monthKeyFromDate,
} from "@/lib/financial/month";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { SupabaseClient } from "@supabase/supabase-js";

type HeadApiResponse = { id: string; name: string; type: "income" | "expense" };

function getErrorMessage(json: unknown) {
  if (json && typeof json === "object" && "error" in json) {
    const maybe = (json as { error?: unknown }).error;
    if (typeof maybe === "string") return maybe;
  }
  return null;
}

export default function DashboardClient() {
  const router = useRouter();
  const [supabase] = useState<SupabaseClient | null>(() => {
    // Avoid constructing Supabase client during SSR/build.
    if (typeof window === "undefined") return null;
    return getSupabaseBrowserClient();
  });

  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("summary");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const defaultMonthKey = useMemo(() => monthKeyFromDate(new Date()), []);
  const monthOptions = useMemo(
    () =>
      getMonthOptions({
        center: new Date(),
        pastMonths: 12,
        futureMonths: 0,
      }),
    [],
  );

  const [incomeHeads, setIncomeHeads] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [expenseHeads, setExpenseHeads] = useState<Array<{ id: string; name: string }>>(
    [],
  );

  async function loadHeads() {
    const [incRes, expRes] = await Promise.all([
      fetch(`/api/heads?type=income`, { method: "GET" }),
      fetch(`/api/heads?type=expense`, { method: "GET" }),
    ]);
    const [incJson, expJson] = await Promise.all([incRes.json(), expRes.json()]);
    if (!incRes.ok) {
      throw new Error(getErrorMessage(incJson) ?? "Failed to load income heads");
    }
    if (!expRes.ok) {
      throw new Error(getErrorMessage(expJson) ?? "Failed to load expense heads");
    }

    const incHeads = (incJson ?? []) as HeadApiResponse[];
    const expHeads = (expJson ?? []) as HeadApiResponse[];
    setIncomeHeads(incHeads.map((h) => ({ id: h.id, name: h.name })));
    setExpenseHeads(expHeads.map((h) => ({ id: h.id, name: h.name })));
  }

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (data.user?.email) setUserEmail(data.user.email);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadHeads();
      } catch {
        // If heads fail to load, dashboard still renders (forms will show empty selects).
      }
      if (!cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSignal]);

  async function onSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function bumpRefresh() {
    setRefreshSignal((s) => s + 1);
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="flex">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((v) => !v)}
          userEmail={userEmail}
          onSignOut={onSignOut}
        />
        <main className="flex-1 p-3 md:p-6 overflow-x-hidden">
          <div className="max-w-6xl mx-auto space-y-4">
            {activeTab === "collection" ? (
              <section className="space-y-3">
                <div>
                  <h2 className="text-xl font-semibold">Add Collection</h2>
                  <div className="text-sm text-zinc-600">
                    Record fee collection per student and head.
                  </div>
                </div>
                <CollectionForm
                  incomeHeads={incomeHeads}
                  monthOptions={monthOptions}
                  onCreated={() => {
                    bumpRefresh();
                    loadHeads();
                  }}
                />
              </section>
            ) : null}

            {activeTab === "expense" ? (
              <section className="space-y-3">
                <div>
                  <h2 className="text-xl font-semibold">Add Expense</h2>
                  <div className="text-sm text-zinc-600">
                    Record expenses against expense heads.
                  </div>
                </div>
                <ExpenseForm
                  expenseHeads={expenseHeads}
                  monthOptions={monthOptions}
                  onCreated={() => {
                    bumpRefresh();
                    loadHeads();
                  }}
                />
              </section>
            ) : null}

            {activeTab === "records" ? (
              <section className="space-y-3">
                <div>
                  <h2 className="text-xl font-semibold">Records</h2>
                  <div className="text-sm text-zinc-600">
                    View, edit, and delete collections + expenses.
                  </div>
                </div>
                <RecordsTable
                  monthOptions={monthOptions}
                  defaultMonthKey={defaultMonthKey}
                  incomeHeads={incomeHeads}
                  expenseHeads={expenseHeads}
                  onAfterMutation={() => {
                    bumpRefresh();
                    loadHeads();
                  }}
                />
              </section>
            ) : null}

            {activeTab === "summary" ? (
              <section className="space-y-3">
                <div>
                  <h2 className="text-xl font-semibold">Summary</h2>
                  <div className="text-sm text-zinc-600">
                    Monthly totals, head-wise reporting, and progress.
                  </div>
                </div>
                <SummaryPanel
                  defaultMonthKey={defaultMonthKey}
                  monthOptions={monthOptions}
                  refreshSignal={refreshSignal}
                />
              </section>
            ) : null}

            {activeTab === "heads" ? (
              <section className="space-y-3">
                <div>
                  <h2 className="text-xl font-semibold">Heads (Income / Expense)</h2>
                  <div className="text-sm text-zinc-600">
                    Manage your fee and expense heads.
                  </div>
                </div>
                <HeadsManager refreshSignal={refreshSignal} />
              </section>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}

