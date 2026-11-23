"use client";

import { useEffect, useState } from "react";
import { Clock3, Gift, LoaderCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { GIFT_CARD_COMPLEMENTARY_PAYMENT_ENABLED } from "@/lib/gift-card-complementary-payment";

type Statistics = { sold?: number; collectedAmount?: number; outstandingBalance?: number; redeemedAmount?: number; complementaryPaymentConfirmedAmount?: number; complementaryPaymentUnverifiedAmount?: number; complementaryPaymentUnverifiedOperations?: number; active?: number; depleted?: number; expired?: number; activeCards?: number; depletedCards?: number; expiredCards?: number };
type Reminder = { id?: string; recipientName?: string; balance?: number; expiresAtUtc?: string; whatsAppUrl?: string };
const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const dataOf = <T,>(payload: unknown) => (((payload as { data?: T })?.data ?? payload) as T);

export function GiftCardStatistics({ from, to }: { from: string; to: string }) {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(3);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [remindersBusy, setRemindersBusy] = useState(false);

  useEffect(() => { void (async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (from) query.set("fromUtc", new Date(`${from}T00:00:00`).toISOString());
      if (to) query.set("toUtc", new Date(`${to}T23:59:59.999`).toISOString());
      const response = await fetch(`/api/gift-cards/statistics?${query}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message ?? "No fue posible cargar las métricas de Gift Cards.");
      setStatistics(dataOf<Statistics>(payload));
    } catch (caught) { toast.error("Métricas de Gift Cards no disponibles", { description: caught instanceof Error ? caught.message : undefined }); }
    finally { setLoading(false); }
  })(); }, [from, to]);

  async function loadReminders() {
    setRemindersBusy(true);
    try {
      const response = await fetch(`/api/gift-cards/expiration-reminders?days=${days}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message ?? "No fue posible consultar vencimientos.");
      const data = dataOf<unknown>(payload);
      setReminders((Array.isArray(data) ? data : Object.values((data ?? {}) as Record<string, unknown>).find(Array.isArray) ?? []) as Reminder[]);
    } catch (caught) { toast.error("No se pudieron cargar los vencimientos", { description: caught instanceof Error ? caught.message : undefined }); }
    finally { setRemindersBusy(false); }
  }

  const metrics = [
    ["Tarjetas vendidas", statistics?.sold ?? 0],
    ["Importe cobrado", money.format(statistics?.collectedAmount ?? 0)],
    ["Saldo pendiente", money.format(statistics?.outstandingBalance ?? 0)],
    ["Importe canjeado", money.format(statistics?.redeemedAmount ?? 0)],
    ...(GIFT_CARD_COMPLEMENTARY_PAYMENT_ENABLED
      ? [
          ["Complemento confirmado", money.format(statistics?.complementaryPaymentConfirmedAmount ?? 0)],
          ["Complemento no verificado", money.format(statistics?.complementaryPaymentUnverifiedAmount ?? 0)],
          ["Operaciones no verificadas", statistics?.complementaryPaymentUnverifiedOperations ?? 0],
        ]
      : []),
    ["Activas", statistics?.activeCards ?? statistics?.active ?? 0],
    ["Agotadas", statistics?.depletedCards ?? statistics?.depleted ?? 0],
    ["Vencidas", statistics?.expiredCards ?? statistics?.expired ?? 0],
  ] as const;

  return <section className="mb-6 rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_16px_45px_rgba(0,0,0,0.05)] sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><span className="text-[10px] font-black tracking-[.16em] text-[#E11D48]">GIFT CARDS</span><h2 className="mt-1 text-xl font-black">Tarjetas de regalo</h2><p className="mt-1 text-sm text-slate-500">Ventas, saldo y vencimientos sin duplicar los ingresos de canje.</p></div><Gift className="text-rose-600" /></div>
    {loading ? <LoaderCircle className="mt-6 animate-spin text-rose-600" /> : <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 p-4"><small className="font-bold text-slate-500">{label}</small><strong className="mt-1 block text-xl font-black">{value}</strong></div>)}</div>}
    <div className="mt-6 border-t border-slate-200 pt-5"><div className="flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm font-bold">Vencen en los próximos días<input className="h-11 w-28 rounded-xl border border-slate-300 px-3" type="number" min={1} max={90} value={days} onChange={(event) => setDays(Math.max(1, Number(event.target.value) || 1))}/></label><button type="button" className="inline-flex h-11 items-center gap-2 rounded-xl bg-black px-4 text-sm font-extrabold text-white" disabled={remindersBusy} onClick={() => void loadReminders()}>{remindersBusy ? <LoaderCircle className="animate-spin" size={16}/> : <Clock3 size={16}/>}Consultar vencimientos</button></div><div className="mt-4 grid gap-2">{reminders.map((item, index) => <div key={item.id ?? index} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div><strong>{item.recipientName ?? "Destinatario"}</strong><p className="text-sm text-slate-500">Saldo {money.format(item.balance ?? 0)} · vence {item.expiresAtUtc ? new Date(item.expiresAtUtc).toLocaleDateString("es-MX") : "sin fecha"}</p></div>{item.whatsAppUrl && <a className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold" href={item.whatsAppUrl} target="_blank" rel="noreferrer"><Send size={15}/>Abrir WhatsApp</a>}</div>)}</div>{reminders.length === 0 && <p className="mt-3 text-sm text-slate-500">La consulta no marca recordatorios como enviados ni leídos.</p>}</div>
  </section>;
}
