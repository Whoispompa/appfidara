"use client";

import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  Megaphone,
  RefreshCw,
  Send,
  Smartphone,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Audience = "all" | "location";
type CampaignStatus =
  | "queued"
  | "processing"
  | "completed"
  | "partial"
  | "failed";

type Location = {
  id: string;
  name: string;
  isActive?: boolean;
};

type Campaign = {
  id: string;
  title: string;
  message: string;
  audience: Audience;
  locationId?: string | null;
  locationName?: string | null;
  status: CampaignStatus;
  audienceCount: number;
  deliveryCount: number;
  noWalletCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type Toast = {
  type: "success" | "error";
  title: string;
  message: string;
} | null;

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function parseCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeCampaign(campaign: Campaign): Campaign {
  return {
    ...campaign,
    audienceCount: parseCount(campaign.audienceCount),
    deliveryCount: parseCount(campaign.deliveryCount),
    noWalletCount: parseCount(campaign.noWalletCount),
    sentCount: parseCount(campaign.sentCount),
    failedCount: parseCount(campaign.failedCount),
    skippedCount: parseCount(campaign.skippedCount),
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Fecha no disponible" : dateFormatter.format(date);
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const styles: Record<CampaignStatus, string> = {
    queued: "bg-slate-100 text-slate-700",
    processing: "bg-blue-50 text-blue-700",
    completed: "bg-emerald-50 text-emerald-700",
    partial: "bg-amber-50 text-amber-700",
    failed: "bg-rose-50 text-rose-700",
  };
  const labels: Record<CampaignStatus, string> = {
    queued: "En cola",
    processing: "En proceso",
    completed: "Enviada",
    partial: "Parcial",
    failed: "Fallida",
  };

  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${styles[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${status === "processing" ? "animate-pulse" : ""}`} />
      {labels[status]}
    </span>
  );
}

export default function NotificationsPage() {
  const [organizationName, setOrganizationName] = useState("Fidara");
  const [locations, setLocations] = useState<Location[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [locationId, setLocationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const goToLogin = useCallback(() => {
    sessionStorage.removeItem("fidara_session");
    window.location.replace("/login");
  }, []);

  const loadData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);

    try {
      const [campaignResponse, locationResponse] = await Promise.all([
        fetch("/api/notifications?page=1&pageSize=50", { cache: "no-store" }),
        fetch("/api/locations?activeOnly=true", { cache: "no-store" }),
      ]);

      if (campaignResponse.status === 401 || locationResponse.status === 401) {
        goToLogin();
        return;
      }

      const campaignPayload = (await campaignResponse.json().catch(() => ({}))) as ApiEnvelope<Campaign[]>;
      const locationPayload = (await locationResponse.json().catch(() => ({}))) as ApiEnvelope<Location[]>;

      if (!campaignResponse.ok) {
        throw new Error(campaignPayload.message ?? "No fue posible cargar las campañas.");
      }
      if (!locationResponse.ok) {
        throw new Error(locationPayload.message ?? "No fue posible cargar las sucursales.");
      }

      const nextCampaigns = Array.isArray(campaignPayload.data)
        ? campaignPayload.data.map(normalizeCampaign)
        : [];
      const nextLocations = Array.isArray(locationPayload.data)
        ? locationPayload.data.filter((location) => location.isActive !== false)
        : [];

      setCampaigns(nextCampaigns);
      setLocations(nextLocations);
      setLocationId((current) => current || nextLocations[0]?.id || "");
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [goToLogin]);

  useEffect(() => {
    const rawSession = sessionStorage.getItem("fidara_session");
    if (rawSession) {
      try {
        const session = JSON.parse(rawSession) as { organizationName?: string };
        if (session.organizationName?.trim()) setOrganizationName(session.organizationName.trim());
      } catch {
        // La API sigue siendo la fuente de datos de la página.
      }
    }
    void loadData(true);
  }, [loadData]);

  const hasActiveCampaign = campaigns.some(
    (campaign) => campaign.status === "queued" || campaign.status === "processing",
  );

  useEffect(() => {
    if (!hasActiveCampaign) return;
    const interval = window.setInterval(() => void loadData(false), 4000);
    return () => window.clearInterval(interval);
  }, [hasActiveCampaign, loadData]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!confirmationOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [confirmationOpen]);

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === locationId),
    [locationId, locations],
  );
  const audienceLabel = audience === "all" ? "Todos los clientes" : selectedLocation?.name ?? "Sucursal";
  const canSend = title.trim().length > 0 && message.trim().length > 0 && (audience === "all" || Boolean(locationId));

  const metrics = useMemo(() => {
    const sent = campaigns.reduce((total, campaign) => total + campaign.sentCount, 0);
    const failed = campaigns.reduce((total, campaign) => total + campaign.failedCount, 0);
    const attempted = sent + failed;
    return {
      total: campaigns.length,
      sent,
      rate: attempted > 0 ? ((sent / attempted) * 100).toFixed(1) : "0.0",
    };
  }, [campaigns]);

  async function sendCampaign() {
    if (!canSend || sending) return;
    setSending(true);

    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          audience,
          locationId: audience === "location" ? locationId : null,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<Campaign>;

      if (response.status === 401) {
        goToLogin();
        return;
      }
      if (!response.ok) throw new Error(payload.message ?? "No fue posible crear la campaña.");

      setConfirmationOpen(false);
      setTitle("");
      setMessage("");
      setAudience("all");
      setToast({
        type: "success",
        title: "Campaña en cola",
        message: "Fidara comenzó a preparar el envío a las tarjetas Wallet.",
      });
      await loadData(false);
    } catch (caught) {
      setToast({
        type: "error",
        title: "No se pudo enviar",
        message: caught instanceof Error ? caught.message : "Ocurrió un error inesperado.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-full bg-[#F3F4F6] px-4 py-6 text-[#111827] sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-[1480px]">
        <header className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-[11px] font-black tracking-[0.18em] text-[#E11D48]">COMUNICACIÓN</span>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl">Notificaciones</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#6B7280]">
              Envía mensajes directamente a las tarjetas Wallet de tus clientes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadData(false)}
            disabled={refreshing}
            className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-[#E5E7EB] bg-white px-4 text-xs font-extrabold transition hover:bg-slate-50 disabled:opacity-50 sm:self-auto"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            Actualizar
          </button>
        </header>

        <section className="mb-6 grid overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_12px_35px_rgba(17,24,39,0.05)] sm:grid-cols-3">
          {[
            ["Campañas", metrics.total, <Megaphone key="a" size={18} />],
            ["Entregas exitosas", metrics.sent, <CheckCircle2 key="b" size={18} />],
            ["Tasa de entrega", `${metrics.rate}%`, <Send key="c" size={18} />],
          ].map(([label, value, icon], index) => (
            <div key={String(label)} className={`flex items-center gap-3 px-5 py-4 ${index < 2 ? "border-b border-[#E5E7EB] sm:border-b-0 sm:border-r" : ""}`}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-[#E11D48]">{icon}</span>
              <div><small className="text-[11px] font-bold text-[#6B7280]">{label}</small><strong className="mt-0.5 block text-xl font-black">{value}</strong></div>
            </div>
          ))}
        </section>

        {error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
            <span className="flex items-start gap-2"><AlertTriangle className="mt-0.5 shrink-0" size={17} />{error}</span>
            <button type="button" onClick={() => void loadData(true)} className="shrink-0 font-extrabold">Reintentar</button>
          </div>
        )}

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="overflow-hidden rounded-[22px] border border-[#E5E7EB] bg-white shadow-[0_18px_45px_rgba(17,24,39,0.06)]">
            <div className="flex items-start gap-3 border-b border-[#E5E7EB] px-5 py-5 sm:px-6">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-50 text-[#E11D48]"><Megaphone size={20} /></span>
              <div><h2 className="text-base font-black">Crear campaña</h2><p className="mt-1 text-xs leading-5 text-[#6B7280]">Escribe el mensaje y selecciona quién debe recibirlo.</p></div>
            </div>

            <div className="space-y-6 p-5 sm:p-6">
              <label className="block">
                <span className="mb-2 flex items-center justify-between text-xs font-extrabold">Título<small className="font-bold text-[#9CA3AF]">{title.length}/80</small></span>
                <input maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej. Doble sello este viernes" className="h-12 w-full rounded-xl border border-[#E5E7EB] px-4 text-sm font-semibold outline-none transition placeholder:font-normal placeholder:text-[#9CA3AF] focus:border-[#E11D48] focus:ring-4 focus:ring-rose-100" />
              </label>
              <label className="block">
                <span className="mb-2 flex items-center justify-between text-xs font-extrabold">Mensaje<small className="font-bold text-[#9CA3AF]">{message.length}/300</small></span>
                <textarea maxLength={300} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escribe un mensaje breve y claro." className="w-full resize-none rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm font-semibold leading-6 outline-none transition placeholder:font-normal placeholder:text-[#9CA3AF] focus:border-[#E11D48] focus:ring-4 focus:ring-rose-100" />
              </label>

              <div>
                <span className="mb-3 block text-xs font-extrabold">Audiencia</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    ["all", "Todos", "Clientes con tarjeta Wallet", <Users key="all" size={18} />],
                    ["location", "Por sucursal", "Clientes de una ubicación", <MapPin key="location" size={18} />],
                  ] as const).map(([value, label, copy, icon]) => (
                    <button key={value} type="button" onClick={() => setAudience(value)} className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${audience === value ? "border-[#E11D48] bg-rose-50/60 ring-1 ring-[#E11D48]" : "border-[#E5E7EB] hover:border-slate-300"}`}>
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${audience === value ? "bg-[#E11D48] text-white" : "bg-[#F3F4F6] text-[#6B7280]"}`}>{icon}</span>
                      <span><strong className="block text-sm font-extrabold">{label}</strong><small className="mt-1 block text-xs leading-5 text-[#6B7280]">{copy}</small></span>
                    </button>
                  ))}
                </div>
              </div>

              {audience === "location" && (
                <label className="block">
                  <span className="mb-2 block text-xs font-extrabold">Sucursal</span>
                  <select value={locationId} onChange={(event) => setLocationId(event.target.value)} disabled={locations.length === 0} className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold outline-none focus:border-[#E11D48] focus:ring-4 focus:ring-rose-100 disabled:bg-slate-50">
                    {locations.length === 0 && <option value="">No hay sucursales activas</option>}
                    {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                  </select>
                </label>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-[#E5E7EB] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <span className="inline-flex items-center gap-2 text-xs font-bold text-[#6B7280]"><Clock3 size={15} />Envío inmediato</span>
                <button type="button" disabled={!canSend || sending} onClick={() => setConfirmationOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-5 text-sm font-extrabold text-white shadow-lg shadow-rose-600/20 transition hover:bg-[#BE123C] disabled:cursor-not-allowed disabled:opacity-40">
                  <Send size={17} />Revisar y enviar
                </button>
              </div>
            </div>
          </section>

          <aside className="xl:sticky xl:top-6">
            <div className="overflow-hidden rounded-[22px] border border-[#E5E7EB] bg-white shadow-[0_18px_45px_rgba(17,24,39,0.06)]">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4"><div><h2 className="text-sm font-black">Vista previa</h2><p className="mt-1 text-[11px] text-[#6B7280]">Así podría verla tu cliente</p></div><Smartphone size={19} className="text-[#6B7280]" /></div>
              <div className="bg-[radial-gradient(circle_at_top_right,rgba(225,29,72,0.16),transparent_45%),#111827] p-5 sm:p-7">
                <div className="mx-auto max-w-[340px] rounded-[30px] border border-white/10 bg-black/30 p-3 shadow-2xl">
                  <div className="mb-3 flex justify-between px-2 pt-1 text-[10px] font-bold text-white/75"><span>11:11</span><span>● ● ●</span></div>
                  <div className="rounded-[22px] bg-white p-4 shadow-xl">
                    <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E11D48] text-white"><Bell size={18} /></span><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><strong className="truncate text-xs font-black">{organizationName}</strong><small className="shrink-0 text-[10px] text-[#9CA3AF]">ahora</small></div><p className="mt-2 text-sm font-extrabold leading-5">{title.trim() || "Título de la notificación"}</p><p className="mt-1 text-xs leading-5 text-[#6B7280]">{message.trim() || "Tu mensaje aparecerá aquí mientras lo escribes."}</p></div></div>
                  </div>
                  <p className="py-3 text-center text-[10px] font-bold text-white/65">Apple Wallet · Google Wallet</p>
                </div>
              </div>
              <div className="flex items-center justify-between px-5 py-4 text-xs"><span className="text-[#6B7280]">Audiencia</span><strong className="max-w-[240px] truncate text-right">{audienceLabel}</strong></div>
            </div>
          </aside>
        </div>

        <section className="mt-6 overflow-hidden rounded-[22px] border border-[#E5E7EB] bg-white shadow-[0_18px_45px_rgba(17,24,39,0.05)]">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-5 sm:px-6"><div><h2 className="text-base font-black">Historial de campañas</h2><p className="mt-1 text-xs text-[#6B7280]">Resultados reportados por la API.</p></div>{hasActiveCampaign && <span className="inline-flex items-center gap-2 text-xs font-bold text-blue-700"><LoaderCircle size={15} className="animate-spin" />Actualizando</span>}</div>
          {loading ? (
            <div className="grid min-h-52 place-items-center"><LoaderCircle className="animate-spin text-[#E11D48]" size={28} /></div>
          ) : campaigns.length === 0 ? (
            <div className="px-6 py-14 text-center"><Megaphone className="mx-auto text-slate-300" size={34} /><h3 className="mt-4 text-sm font-black">Todavía no hay campañas</h3><p className="mt-1 text-xs text-[#6B7280]">La primera campaña aparecerá aquí cuando la envíes.</p></div>
          ) : (
            <div className="divide-y divide-[#E5E7EB]">
              {campaigns.map((campaign) => (
                <article key={campaign.id} className="grid gap-4 px-5 py-5 transition hover:bg-rose-50/30 sm:px-6 lg:grid-cols-[minmax(240px,1.6fr)_minmax(150px,.8fr)_100px_minmax(190px,1fr)] lg:items-center lg:gap-5">
                  <div className="min-w-0"><strong className="block truncate text-sm font-extrabold">{campaign.title}</strong><p className="mt-1 truncate text-xs text-[#6B7280]">{campaign.message}</p><small className="mt-2 block text-[10px] font-bold text-[#9CA3AF]">{formatDate(campaign.createdAt)}</small></div>
                  <div className="flex min-w-0 items-center gap-2 text-xs font-bold text-[#6B7280]">{campaign.audience === "all" ? <Users size={14} className="shrink-0 text-[#E11D48]" /> : <MapPin size={14} className="shrink-0 text-[#E11D48]" />}<span className="truncate">{campaign.audience === "all" ? "Todos los clientes" : campaign.locationName || "Sucursal"}</span></div>
                  <StatusBadge status={campaign.status} />
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs"><span className="font-extrabold text-emerald-700">{campaign.sentCount} enviadas</span>{campaign.failedCount > 0 && <span className="font-bold text-rose-700">{campaign.failedCount} fallidas</span>}{campaign.skippedCount + campaign.noWalletCount > 0 && <span className="font-bold text-[#6B7280]">{campaign.skippedCount + campaign.noWalletCount} omitidas</span>}</div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {confirmationOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#111827]/65 p-4 backdrop-blur-sm" onMouseDown={() => !sending && setConfirmationOpen(false)}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="send-title" className="w-full max-w-md rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-[0_30px_90px_rgba(17,24,39,0.35)]" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-[#E11D48]"><Send size={21} /></span><button type="button" disabled={sending} onClick={() => setConfirmationOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl bg-[#F3F4F6] text-[#6B7280]"><X size={18} /></button></div>
            <h2 id="send-title" className="mt-5 text-xl font-black">¿Enviar esta campaña?</h2>
            <p className="mt-2 text-sm leading-6 text-[#6B7280]">Se enviará “{title.trim()}” a {audienceLabel.toLowerCase()}.</p>
            <div className="mt-5 rounded-2xl bg-[#F8FAFC] p-4"><strong className="block text-sm font-extrabold">{title.trim()}</strong><p className="mt-1 text-xs leading-5 text-[#6B7280]">{message.trim()}</p></div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2"><button type="button" disabled={sending} onClick={() => setConfirmationOpen(false)} className="min-h-11 rounded-xl border border-[#E5E7EB] text-sm font-extrabold">Seguir editando</button><button type="button" disabled={sending} onClick={() => void sendCampaign()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-5 text-sm font-extrabold text-white disabled:opacity-60">{sending ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={17} />}{sending ? "Enviando…" : "Enviar ahora"}</button></div>
          </section>
        </div>
      )}

      {toast && (
        <div className={`fixed right-4 top-4 z-[200] flex w-[calc(100%_-_2rem)] max-w-sm items-start gap-3 rounded-2xl border bg-white px-4 py-4 shadow-[0_20px_60px_rgba(17,24,39,0.18)] ${toast.type === "success" ? "border-emerald-200" : "border-rose-200"}`} role="status">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${toast.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-[#E11D48]"}`}>{toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}</span>
          <div className="min-w-0 flex-1"><strong className="block text-sm font-extrabold">{toast.title}</strong><p className="mt-1 text-xs leading-5 text-[#6B7280]">{toast.message}</p></div>
          <button type="button" onClick={() => setToast(null)} className="grid h-8 w-8 place-items-center text-[#6B7280]"><X size={16} /></button>
        </div>
      )}
    </main>
  );
}
