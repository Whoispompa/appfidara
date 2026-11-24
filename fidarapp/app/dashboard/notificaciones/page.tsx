"use client";
import { Dialog } from "@base-ui/react/dialog";
import { Tabs } from "@base-ui/react/tabs";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  LoaderCircle,
  MapPin,
  Megaphone,
  RefreshCw,
  Plus,
  Send,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { formatDateTime } from "@/components/lib/date-time";
import { GeoPushPanel } from "@/components/marketing/geo-push-panel";
import pageStyles from "../clientes/customers.module.css";

type Audience = "all" | "location";
type CampaignStatus =
  | "queued"
  | "processing"
  | "completed"
  | "partial"
  | "failed";

type CampaignProgram = {
  id: string;
  name: string;
  isActive?: boolean;
  cardLogoUrl?: string | null;
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
  const [programs, setPrograms] = useState<CampaignProgram[]>([]);
  const [programId, setProgramId] = useState("");
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [programError, setProgramError] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [step, setStep] = useState<"configure" | "review">("configure");
  const stepHeading = useRef<HTMLHeadingElement>(null);

  const goToLogin = useCallback(() => {
    sessionStorage.removeItem("fidara_session");
    window.location.replace("/login");
  }, []);

  const loadData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);

    try {
      const campaignResponse = await fetch("/api/notifications?page=1&pageSize=50", { cache: "no-store" });

      if (campaignResponse.status === 401) {
        goToLogin();
        return;
      }

      const campaignPayload = (await campaignResponse.json().catch(() => ({}))) as ApiEnvelope<Campaign[]>;

      if (!campaignResponse.ok) {
        throw new Error(campaignPayload.message ?? "No fue posible cargar las campañas.");
      }

      const nextCampaigns = Array.isArray(campaignPayload.data)
        ? campaignPayload.data.map(normalizeCampaign)
        : [];
      setCampaigns(nextCampaigns);
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

  async function loadPrograms() {
    setLoadingPrograms(true);
    setProgramError("");

    try {
      const response = await fetch("/api/programs", { cache: "no-store" });
      if (response.status === 401) {
        goToLogin();
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<CampaignProgram[]>;
      if (!response.ok || payload.success === false || !Array.isArray(payload.data)) {
        throw new Error(payload.message ?? "No fue posible cargar los programas.");
      }

      const activePrograms = payload.data.filter((program) => program.isActive !== false);
      setPrograms(activePrograms);
      setProgramId((current) => activePrograms.some((program) => program.id === current) ? current : "");
    } catch (caught) {
      setProgramError(caught instanceof Error ? caught.message : "No fue posible cargar los programas.");
    } finally {
      setLoadingPrograms(false);
    }
  }

  function handleComposerOpen(open: boolean) {
    setComposerOpen(open);
    if (open) {
      setStep("configure");
      if (!loadingPrograms) void loadPrograms();
    }
  }

  useEffect(() => {
    if (composerOpen) stepHeading.current?.focus();
  }, [composerOpen, step]);

  const selectedProgram = programs.find((program) => program.id === programId);
  const canReview = Boolean(selectedProgram && title.trim() && message.trim() && !loadingPrograms && !programError);

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

  return (
    <Dialog.Root open={composerOpen} onOpenChange={handleComposerOpen}>
      <div className={pageStyles.page}>
        <header className={pageStyles.heading}>
          <div>
            <span className={pageStyles.eyebrow}>COMUNICACIÓN</span>
            <h1>Marketing y notificaciones</h1>
            <p>Gestiona campañas y recordatorios para las tarjetas Wallet de tus clientes.</p>
          </div>
          <div className={pageStyles.headingActions}>
            <button
              type="button"
              onClick={() => void loadData(false)}
              disabled={refreshing || loading}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[14px] border border-[#E5E7EB] bg-white px-4 text-sm font-extrabold hover:bg-[#F3F4F6] focus-visible:outline-2 focus-visible:outline-[#E11D48] disabled:opacity-50"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              Actualizar
            </button>
            <Dialog.Trigger className={pageStyles.primaryButton + " focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E11D48]"}>
              <Plus size={18} />
              Nueva campaña
            </Dialog.Trigger>
          </div>
        </header>

        <section aria-label="Métricas de campañas" className="@container rounded-2xl border border-[#E5E7EB] bg-white">
          <dl className="grid divide-y divide-[#E5E7EB] @min-[34rem]:grid-cols-3 @min-[34rem]:divide-x @min-[34rem]:divide-y-0">
            {[
              { label: "Campañas", value: metrics.total, Icon: Megaphone },
              { label: "Entregas exitosas", value: metrics.sent, Icon: CheckCircle2 },
              { label: "Tasa de entrega", value: metrics.rate + "%", Icon: Send },
            ].map(({ label, value, Icon }) => (
              <div key={label} className="flex min-w-0 items-center gap-3 px-4 py-3 sm:px-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-[#E11D48]">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div>
                  <dt className="text-xs font-bold text-[#6B7280]">{label}</dt>
                  <dd className="text-xl font-extrabold">{loading ? "—" : value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>

        {error && (
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
            <span className="flex min-w-0 items-start gap-2 [overflow-wrap:anywhere]">
              <AlertTriangle className="mt-0.5 shrink-0" size={17} />
              {error}
            </span>
            <button type="button" onClick={() => void loadData(true)} className="font-extrabold">
              Reintentar
            </button>
          </div>
        )}

        <Tabs.Root defaultValue="campaigns" className="min-w-0">
          <Tabs.List
            aria-label="Secciones de marketing"
            className="mb-4 flex max-w-full flex-wrap gap-1 rounded-xl border border-[#E5E7EB] bg-white p-1 sm:w-fit"
          >
            {[
              { value: "campaigns", label: "Campañas" },
              { value: "proximity", label: "Recordatorios por cercanía" },
              { value: "history", label: "Historial" },
            ].map(({ value, label }) => (
              <Tabs.Tab
                key={value}
                value={value}
                className="min-h-10 rounded-lg px-3 py-2 text-sm font-bold text-[#4B5563] hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-[#E11D48] data-[active]:bg-rose-50 data-[active]:text-[#BE123C]"
              >
                {label}
              </Tabs.Tab>
            ))}
          </Tabs.List>

          <Tabs.Panel value="campaigns">
            <CampaignHistory
              heading="Campañas recientes"
              campaigns={campaigns.slice(0, 5)}
              loading={loading}
              hasActiveCampaign={hasActiveCampaign}
            />
          </Tabs.Panel>

          <Tabs.Panel value="proximity" keepMounted>
            <GeoPushPanel />
          </Tabs.Panel>

          <Tabs.Panel value="history">
            <CampaignHistory
              heading="Historial de campañas"
              campaigns={campaigns}
              loading={loading}
              hasActiveCampaign={hasActiveCampaign}
            />
          </Tabs.Panel>
        </Tabs.Root>
      </div>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[45] bg-[#111827]/60 backdrop-blur-sm" />
        <Dialog.Popup className="@container fixed top-1/2 left-1/2 z-[46] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-[24px] border border-[#E5E7EB] bg-white text-[#111827] shadow-[0_30px_90px_rgba(17,24,39,0.30)] outline-none">
          <div className="flex items-start gap-3 border-b border-[#E5E7EB] p-4 sm:p-6">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-rose-50 text-[#E11D48]">
              <Megaphone size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <Dialog.Title ref={stepHeading} tabIndex={-1} className="text-xl font-extrabold tracking-tight outline-none">
                {step === "configure" ? "Configurar campaña" : "Revisar campaña"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-[#6B7280]">
                {step === "configure" ? "Paso 1 de 2 · Programa y mensaje" : "Paso 2 de 2 · Vista previa y alcance"}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Cerrar"
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#F3F4F6] text-[#6B7280] hover:text-[#111827] focus-visible:outline-2 focus-visible:outline-[#E11D48]"
            >
              <X size={18} />
            </Dialog.Close>
          </div>

          <div className="grid items-start gap-5 p-4 sm:p-6 @min-[42rem]:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-4">
              {step === "configure" ? (
                <>
                  <label className="block">
                    <span className="mb-2 block text-xs font-extrabold">Programa para la vista previa</span>
                    <select
                      value={programId}
                      onChange={(event) => setProgramId(event.target.value)}
                      disabled={loadingPrograms || Boolean(programError) || programs.length === 0}
                      className={"h-11 truncate disabled:bg-[#F3F4F6] " + campaignField}
                    >
                      <option value="">
                        {loadingPrograms ? "Cargando programas…" : programs.length ? "Selecciona un programa" : "Sin programas disponibles"}
                      </option>
                      {programs.map((program) => (
                        <option key={program.id} value={program.id}>{program.name}</option>
                      ))}
                    </select>
                  </label>
                  {programError && (
                    <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-rose-50 p-3 text-xs text-[#881337] [overflow-wrap:anywhere]">
                      <span>{programError}</span>
                      <button type="button" onClick={() => void loadPrograms()} className="font-extrabold underline">
                        Reintentar
                      </button>
                    </div>
                  )}

                  <label className="block">
                    <span className="mb-2 flex justify-between gap-2 text-xs font-extrabold">
                      Título <small className="font-bold text-[#6B7280]">{title.length}/80</small>
                    </span>
                    <input
                      maxLength={80}
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Ej. Doble sello este viernes"
                      className={"h-11 " + campaignField}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 flex justify-between gap-2 text-xs font-extrabold">
                      Mensaje <small className="font-bold text-[#6B7280]">{message.length}/300</small>
                    </span>
                    <textarea
                      maxLength={300}
                      rows={3}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="Escribe un mensaje breve y claro."
                      className={"resize-y py-2.5 leading-6 " + campaignField}
                    />
                  </label>
                </>
              ) : (
                <dl className="rounded-xl border border-[#E5E7EB] p-3 text-sm [overflow-wrap:anywhere]">
                  <dt className="text-xs font-bold text-[#6B7280]">Programa de la vista previa</dt>
                  <dd className="mt-1 font-extrabold">{selectedProgram?.name}</dd>
                </dl>
              )}

              <div id="campaign-audience-note" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-950">
                <h2 className="font-extrabold">Envío por programa no disponible</h2>
                <p className="mt-1">
                  La API de campañas aún no ofrece un filtro por programa confirmado. Las opciones anteriores
                  de todos los clientes o por sucursal podían abarcar varios programas. El programa de arriba
                  solo configura la vista previa.
                </p>
              </div>
            </div>

            <CampaignPreview
              organizationName={organizationName}
              logoUrl={selectedProgram?.cardLogoUrl}
              title={title}
              message={message}
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#E5E7EB] p-4 sm:px-6">
            {step === "configure" ? (
              <button
                type="button"
                disabled={!canReview}
                onClick={() => setStep("review")}
                className={campaignPrimaryAction}
              >
                Revisar campaña
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep("configure")}
                  className="min-h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-5 text-sm font-extrabold hover:bg-[#F3F4F6] focus-visible:outline-2 focus-visible:outline-[#E11D48] sm:w-auto"
                >
                  Volver a configurar
                </button>
                <button type="button" disabled aria-describedby="campaign-audience-note" className={campaignPrimaryAction}>
                  <Send size={17} aria-hidden="true" />
                  Confirmar envío
                </button>
              </>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const campaignField =
  "w-full min-w-0 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#111827] outline-none transition placeholder:font-normal placeholder:text-[#6B7280] focus:border-[#E11D48] focus:ring-4 focus:ring-rose-100";

const campaignPrimaryAction =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-5 text-sm font-extrabold text-white transition-colors enabled:hover:bg-[#BE123C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E11D48] disabled:cursor-not-allowed disabled:bg-[#FBCDD8] disabled:text-[#881337] sm:w-auto";

const apiUrl = process.env.NEXT_PUBLIC_FIDARA_API_URL ?? "https://api.fidara.mx";

function CampaignPreview({
  organizationName,
  logoUrl,
  title,
  message,
}: {
  organizationName: string;
  logoUrl?: string | null;
  title: string;
  message: string;
}) {
  const [failedLogo, setFailedLogo] = useState<string>();
  const logo = logoUrl && (/^https?:\/\//i.test(logoUrl) ? logoUrl : apiUrl.replace(/\/$/, "") + "/" + logoUrl.replace(/^\/+/, ""));

  return (
    <aside className="min-w-0 rounded-2xl bg-linear-to-br from-slate-900 to-slate-600 p-4 text-white">
      <h2 className="text-sm font-extrabold">Vista previa en iOS</h2>
      <p className="mt-1 text-xs text-white/80">Apariencia aproximada en la pantalla bloqueada.</p>
      <div className="mt-4 rounded-[22px] border border-white/60 bg-white/95 p-3 text-[#111827] shadow-lg">
        <div className="flex items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-rose-50 text-[#E11D48]">
            {logo && logo !== failedLogo ? (
              // eslint-disable-next-line @next/next/no-img-element -- El logo puede venir de la URL pública configurada por Fidara.
              <img src={logo} alt="" className="size-full object-contain" onError={() => setFailedLogo(logo)} />
            ) : (
              <Bell size={16} aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0 flex-1 text-xs font-semibold [overflow-wrap:anywhere]">{organizationName}</span>
          <small className="shrink-0 text-[11px] text-[#6B7280]">ahora</small>
        </div>
        <p className="mt-2 text-sm font-extrabold [overflow-wrap:anywhere]">{title.trim() || "Título de la notificación"}</p>
        <p className="mt-0.5 whitespace-pre-wrap text-sm leading-5 [overflow-wrap:anywhere]">
          {message.trim() || "Tu mensaje aparecerá aquí mientras lo escribes."}
        </p>
      </div>
    </aside>
  );
}

function CampaignHistory({
  heading,
  campaigns,
  loading,
  hasActiveCampaign,
}: {
  heading: string;
  campaigns: Campaign[];
  loading: boolean;
  hasActiveCampaign: boolean;
}) {
  return (
    <section className="@container min-w-0 rounded-[22px] border border-[#E5E7EB] bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] px-4 py-3 sm:px-5">
        <h2 className="text-base font-extrabold">{heading}</h2>
        {hasActiveCampaign && (
          <span className="inline-flex items-center gap-2 text-xs font-bold text-blue-700">
            <LoaderCircle size={15} className="animate-spin" /> Actualizando
          </span>
        )}
      </header>

      {loading ? (
        <div role="status" className="grid min-h-36 place-items-center">
          <span className="sr-only">Cargando campañas</span>
          <LoaderCircle className="animate-spin text-[#E11D48]" size={28} />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <Megaphone className="mx-auto text-[#9CA3AF]" size={28} aria-hidden="true" />
          <h3 className="mt-3 text-sm font-extrabold">Todavía no hay campañas</h3>
          <p className="mt-1 text-xs text-[#6B7280]">La primera campaña aparecerá aquí cuando la envíes.</p>
        </div>
      ) : (
        <ul className="divide-y divide-[#E5E7EB]">
          {campaigns.map((campaign) => (
            <li key={campaign.id} className="grid min-w-0 items-start gap-2 px-4 py-4 sm:px-5 @min-[34rem]:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] @min-[50rem]:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto_minmax(0,1fr)] @min-[50rem]:items-center @min-[50rem]:gap-4">
              <div className="min-w-0 [overflow-wrap:anywhere]">
                <strong className="block text-sm font-extrabold">{campaign.title}</strong>
                <p className="mt-1 text-xs leading-5 text-[#6B7280]">{campaign.message}</p>
                <time dateTime={campaign.createdAt} className="mt-1 block text-[11px] text-[#6B7280]">
                  {formatDateTime(campaign.createdAt)}
                </time>
              </div>
              <div className="flex min-w-0 items-start gap-2 text-xs font-bold text-[#6B7280]">
                {campaign.audience === "all"
                  ? <Users size={14} className="shrink-0 text-[#E11D48]" />
                  : <MapPin size={14} className="shrink-0 text-[#E11D48]" />}
                <span className="[overflow-wrap:anywhere]">
                  {campaign.audience === "all" ? "Todos los clientes" : campaign.locationName || "Sucursal"}
                </span>
              </div>
              <StatusBadge status={campaign.status} />
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                <span className="font-extrabold text-emerald-700">{campaign.sentCount} enviadas</span>
                {campaign.failedCount > 0 && <span className="font-bold text-rose-700">{campaign.failedCount} fallidas</span>}
                {campaign.skippedCount + campaign.noWalletCount > 0 && (
                  <span className="font-bold text-[#6B7280]">{campaign.skippedCount + campaign.noWalletCount} omitidas</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
