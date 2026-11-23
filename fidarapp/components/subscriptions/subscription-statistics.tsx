"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { type ApiEnvelope } from "@/lib/subscriptions";

type SubscriptionStatisticsData = {
  activeMemberships: number;
  expiredMemberships: number;
  salesCount: number;
  renewalCount: number;
  usageCount: number;
};

const metrics: Array<{
  key: keyof SubscriptionStatisticsData;
  label: string;
}> = [
  { key: "activeMemberships", label: "Membresías activas" },
  { key: "expiredMemberships", label: "Membresías vencidas" },
  { key: "salesCount", label: "Ventas confirmadas" },
  { key: "renewalCount", label: "Renovaciones confirmadas" },
  { key: "usageCount", label: "Usos registrados" },
];

export function SubscriptionStatistics({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<SubscriptionStatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const query = new URLSearchParams({
          fromUtc: new Date(`${from}T00:00:00.000Z`).toISOString(),
          toUtc: new Date(`${to}T23:59:59.999Z`).toISOString(),
        });
        const response = await fetch(
          `/api/subscription-memberships/statistics?${query}`,
          { cache: "no-store", signal: controller.signal },
        );
        const payload = (await response.json()) as ApiEnvelope<SubscriptionStatisticsData>;
        if (!response.ok || !payload.data) {
          throw new Error(payload.message ?? "Las estadísticas de suscripciones no están disponibles.");
        }
        setData(payload.data);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "Las estadísticas de suscripciones no están disponibles.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [from, to]);

  return (
    <section className="mb-6 rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_16px_45px_rgba(0,0,0,0.05)] sm:p-6">
      <span className="text-[10px] font-black tracking-[0.16em] text-[#E11D48]">SUSCRIPCIONES</span>
      <h2 className="mt-1 text-lg font-black">Membresías y usos</h2>
      {loading ? <LoaderCircle className="mt-5 animate-spin text-[#E11D48]" /> : error ? <p className="mt-4 text-sm font-semibold text-slate-500">{error}</p> : data && <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{metrics.map((metric) => <article key={metric.key} className="rounded-2xl bg-slate-50 p-4"><small className="font-bold text-slate-500">{metric.label}</small><strong className="mt-1 block text-2xl font-black">{data[metric.key].toLocaleString("es-MX")}</strong></article>)}</div>}
    </section>
  );
}
