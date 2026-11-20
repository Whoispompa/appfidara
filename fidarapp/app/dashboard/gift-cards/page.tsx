"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  History,
  LoaderCircle,
  Search,
  Send,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import styles from "./gift-cards.module.css";

type Tab = "overview" | "sale" | "search" | "reminders";
type JsonObject = Record<string, unknown>;
type Program = {
  id: string;
  name: string;
  programType: number;
  giftCardAllowCustomAmount?: boolean;
  giftCardCustomMinAmount?: number | null;
  giftCardCustomMaxAmount?: number | null;
  giftCardPresetAmounts?: Array<{
    amount: number;
    isActive: boolean;
    displayOrder: number;
  }>;
};
type SessionLocation = { id: string; name: string };
type SessionData = {
  activeLocationId?: string;
  activeLocationName?: string;
  locations?: SessionLocation[];
};
type Statistics = {
  sold?: number;
  collectedAmount?: number;
  outstandingBalance?: number;
  redeemedAmount?: number;
  active?: number;
  depleted?: number;
  expired?: number;
  activeCards?: number;
  depletedCards?: number;
  expiredCards?: number;
};
type SaleResult = {
  id?: string;
  amount?: number;
  currency?: string;
  recipientName?: string;
  status?: number;
  paymentStatus?: number;
  expiresAtUtc?: string | null;
  loyaltyCardId?: string | null;
  balance?: number;
  publicUrl?: string;
  whatsAppUrl?: string;
  replayed?: boolean;
};
type LookupResult = {
  id?: string;
  programName?: string;
  recipientName?: string;
  balance?: number;
  originalAmount?: number;
  amount?: number;
  currency?: string;
  status?: number;
  expiresAtUtc?: string | null;
};
type Reminder = {
  id?: string;
  recipientName?: string;
  balance?: number;
  currency?: string;
  expiresAtUtc?: string;
  whatsAppUrl?: string;
};

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function dataOf<T>(payload: unknown): T {
  const object = payload as JsonObject;
  return ((object?.data as T | undefined) ?? payload) as T;
}

function messageOf(payload: unknown, fallback: string) {
  return (payload as JsonObject)?.message?.toString() || fallback;
}

function statusLabel(status?: number) {
  return (
    { 1: "Pago pendiente", 2: "Activa", 3: "Agotada", 4: "Vencida", 5: "Cancelada" }[
      status ?? 0
    ] ?? "Sin confirmar"
  );
}

function stableKey(storageKey: string, prefix: string) {
  const saved = sessionStorage.getItem(storageKey);
  if (saved) return saved;
  const key = `${prefix}-${crypto.randomUUID()}`;
  sessionStorage.setItem(storageKey, key);
  return key;
}

export default function GiftCardsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statistics, setStatistics] = useState<Statistics>({});
  const [programs, setPrograms] = useState<Program[]>([]);
  const [session, setSession] = useState<SessionData>({});
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sale, setSale] = useState({
    loyaltyProgramId: "",
    amount: "",
    buyerName: "",
    recipientName: "",
    recipientWhatsApp: "+52 ",
    personalMessage: "",
  });
  const [pendingSale, setPendingSale] = useState<SaleResult | null>(null);
  const [saleBusy, setSaleBusy] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(1);
  const [paymentReference, setPaymentReference] = useState("");
  const [confirmed, setConfirmed] = useState<SaleResult | null>(null);
  const [qrToken, setQrToken] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [cardId, setCardId] = useState("");
  const [share, setShare] = useState<SaleResult | null>(null);
  const [movementCount, setMovementCount] = useState<number | null>(null);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [days, setDays] = useState(3);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [remindersBusy, setRemindersBusy] = useState(false);

  const selectedProgram = programs.find(
    (program) => program.id === sale.loyaltyProgramId,
  );
  const presets = useMemo(
    () =>
      (selectedProgram?.giftCardPresetAmounts ?? [])
        .filter((preset) => preset.isActive)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [selectedProgram],
  );

  const handleUnauthorized = useCallback(
    (response: Response) => {
      if (response.status !== 401) return false;
      sessionStorage.removeItem("fidara_session");
      router.replace("/login");
      return true;
    },
    [router],
  );

  const loadStatistics = useCallback(async () => {
    const query = new URLSearchParams();
    if (from) query.set("fromUtc", new Date(`${from}T00:00:00`).toISOString());
    if (to) query.set("toUtc", new Date(`${to}T23:59:59.999`).toISOString());
    const response = await fetch(`/api/gift-cards/statistics?${query}`, {
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (handleUnauthorized(response)) return;
    if (!response.ok) throw new Error(messageOf(payload, "No fue posible cargar las estadísticas."));
    setStatistics(dataOf<Statistics>(payload));
  }, [from, handleUnauthorized, to]);

  const initialize = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rawSession = sessionStorage.getItem("fidara_session");
      if (rawSession) setSession(JSON.parse(rawSession) as SessionData);
      const programsResponse = await fetch("/api/programs", { cache: "no-store" });
      const programsPayload = await programsResponse.json().catch(() => ({}));
      if (handleUnauthorized(programsResponse)) return;
      if (!programsResponse.ok) throw new Error(messageOf(programsPayload, "No fue posible cargar los programas."));
      const giftPrograms = dataOf<Program[]>(programsPayload).filter(
        (program) => Number(program.programType) === 5,
      );
      setPrograms(giftPrograms);
      setSale((current) => ({
        ...current,
        loyaltyProgramId: current.loyaltyProgramId || giftPrograms[0]?.id || "",
      }));
      const statisticsResponse = await fetch("/api/gift-cards/statistics", {
        cache: "no-store",
      });
      const statisticsPayload = await statisticsResponse.json().catch(() => ({}));
      if (handleUnauthorized(statisticsResponse)) return;
      if (!statisticsResponse.ok) {
        throw new Error(
          messageOf(statisticsPayload, "No fue posible cargar las estadísticas."),
        );
      }
      setStatistics(dataOf<Statistics>(statisticsPayload));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible cargar Gift Cards.");
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    // La carga inicial sincroniza esta vista cliente con el BFF autenticado.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void initialize();
  }, [initialize]);

  async function registerSale() {
    if (saleBusy) return;
    const amount = Number(sale.amount);
    const minimum = selectedProgram?.giftCardCustomMinAmount ?? 0;
    const maximum = selectedProgram?.giftCardCustomMaxAmount ?? Number.MAX_SAFE_INTEGER;
    if (!sale.loyaltyProgramId || !session.activeLocationId) {
      toast.error("Selecciona un programa y una sucursal activa.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) {
      toast.error("Ingresa un importe positivo con máximo dos decimales.");
      return;
    }
    if (amount < minimum || amount > maximum) {
      toast.error(`El importe debe estar entre ${money.format(minimum)} y ${money.format(maximum)}.`);
      return;
    }
    if (!sale.buyerName.trim() || !sale.recipientName.trim() || !/^\+[1-9]\d[\d\s()-]{7,}$/.test(sale.recipientWhatsApp.trim())) {
      toast.error("Completa comprador, destinatario y WhatsApp con código de país.");
      return;
    }
    setSaleBusy(true);
    try {
      const idempotencyKey = stableKey("fidara_gift_sale_key", "sale");
      const response = await fetch("/api/gift-cards/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loyaltyProgramId: sale.loyaltyProgramId,
          locationId: session.activeLocationId,
          amount,
          buyerName: sale.buyerName.trim(),
          recipientName: sale.recipientName.trim(),
          recipientWhatsApp: sale.recipientWhatsApp.trim(),
          personalMessage: sale.personalMessage.trim() || null,
          idempotencyKey,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (handleUnauthorized(response)) return;
      if (!response.ok) throw new Error(messageOf(payload, "No se pudo registrar la venta. Puedes reintentar con la misma operación."));
      const result = dataOf<SaleResult>(payload);
      setPendingSale({ ...result, amount: result.amount ?? amount, recipientName: result.recipientName ?? sale.recipientName });
      toast.success(result.replayed ? "Venta pendiente recuperada" : "Venta pendiente registrada");
    } catch (caught) {
      toast.error("No se confirmó la venta", { description: caught instanceof Error ? caught.message : "Reintenta sin cambiar los datos." });
    } finally {
      setSaleBusy(false);
    }
  }

  async function confirmPayment() {
    if (!pendingSale?.id || saleBusy) return;
    if ((paymentMethod === 2 || paymentMethod === 3) && !paymentReference.trim()) {
      toast.error("La referencia es obligatoria para tarjeta externa o transferencia.");
      return;
    }
    setSaleBusy(true);
    try {
      const idempotencyKey = stableKey("fidara_gift_payment_key", "payment");
      const response = await fetch(`/api/gift-cards/${pendingSale.id}/confirm-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: session.activeLocationId,
          paymentMethod,
          paymentReference: paymentReference.trim() || null,
          idempotencyKey,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (handleUnauthorized(response)) return;
      if (!response.ok) throw new Error(messageOf(payload, "No fue posible confirmar el pago. Reintenta con la misma clave."));
      const result = { ...pendingSale, ...dataOf<SaleResult>(payload) };
      setConfirmed(result);
      setPaymentDialog(false);
      sessionStorage.removeItem("fidara_gift_sale_key");
      sessionStorage.removeItem("fidara_gift_payment_key");
      toast.success(result.replayed ? "Pago recuperado" : "Pago confirmado");
      void loadStatistics();
    } catch (caught) {
      toast.error("El estado del pago no se pudo confirmar", { description: caught instanceof Error ? caught.message : "Reintenta la misma confirmación." });
    } finally {
      setSaleBusy(false);
    }
  }

  async function lookupCard() {
    if (!qrToken.trim() || lookupBusy) return;
    setLookupBusy(true);
    setLookup(null);
    try {
      const response = await fetch("/api/gift-cards/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken: qrToken.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (handleUnauthorized(response)) return;
      if (!response.ok) throw new Error(messageOf(payload, "No se encontró la Gift Card."));
      setLookup(dataOf<LookupResult>(payload));
    } catch (caught) {
      toast.error("No se pudo consultar la Gift Card", { description: caught instanceof Error ? caught.message : undefined });
    } finally {
      setLookupBusy(false);
    }
  }

  async function recoverCard() {
    if (!cardId.trim() || recoveryBusy) return;
    setRecoveryBusy(true);
    setShare(null);
    setMovementCount(null);
    try {
      const [shareResponse, movementsResponse] = await Promise.all([
        fetch(`/api/gift-cards/${encodeURIComponent(cardId.trim())}/share`, { cache: "no-store" }),
        fetch(`/api/gift-cards/${encodeURIComponent(cardId.trim())}/movements`, { cache: "no-store" }),
      ]);
      const [sharePayload, movementsPayload] = await Promise.all([
        shareResponse.json().catch(() => ({})),
        movementsResponse.json().catch(() => ({})),
      ]);
      if (handleUnauthorized(shareResponse) || handleUnauthorized(movementsResponse)) return;
      if (!shareResponse.ok) throw new Error(messageOf(sharePayload, "No fue posible recuperar los enlaces."));
      if (!movementsResponse.ok) throw new Error(messageOf(movementsPayload, "No fue posible recuperar los movimientos."));
      setShare(dataOf<SaleResult>(sharePayload));
      const movementData = dataOf<unknown>(movementsPayload);
      const movementList = Array.isArray(movementData)
        ? movementData
        : Object.values((movementData ?? {}) as JsonObject).find(Array.isArray);
      setMovementCount(movementList?.length ?? 0);
    } catch (caught) {
      toast.error("No se pudo recuperar la Gift Card", { description: caught instanceof Error ? caught.message : undefined });
    } finally {
      setRecoveryBusy(false);
    }
  }

  async function loadReminders() {
    setRemindersBusy(true);
    try {
      const response = await fetch(`/api/gift-cards/expiration-reminders?days=${days}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (handleUnauthorized(response)) return;
      if (!response.ok) throw new Error(messageOf(payload, "No fue posible cargar los recordatorios."));
      const result = dataOf<unknown>(payload);
      const reminderList = Array.isArray(result)
        ? result
        : Object.values((result ?? {}) as JsonObject).find(Array.isArray) ?? [];
      setReminders(reminderList as Reminder[]);
    } catch (caught) {
      toast.error("No se pudieron cargar los recordatorios", { description: caught instanceof Error ? caught.message : undefined });
    } finally {
      setRemindersBusy(false);
    }
  }

  async function copyLink(url?: string) {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success("Enlace copiado");
  }

  const metrics = [
    ["Tarjetas vendidas", statistics.sold ?? 0],
    ["Importe cobrado", money.format(statistics.collectedAmount ?? 0)],
    ["Saldo pendiente", money.format(statistics.outstandingBalance ?? 0)],
    ["Importe canjeado", money.format(statistics.redeemedAmount ?? 0)],
    ["Tarjetas activas", statistics.activeCards ?? statistics.active ?? 0],
    ["Tarjetas agotadas", statistics.depletedCards ?? statistics.depleted ?? 0],
    ["Tarjetas vencidas", statistics.expiredCards ?? statistics.expired ?? 0],
  ] as const;

  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Gift Cards</span>
          <h1>Tarjetas de regalo</h1>
          <p>Vende, consulta y comparte saldo digital. Los cobros se registran fuera de Fidara y requieren confirmación explícita.</p>
        </div>
      </header>

      <nav className={styles.tabs} aria-label="Secciones de Gift Cards">
        {([
          ["overview", "Estadísticas", BarChart3],
          ["sale", "Nueva venta", ShoppingBag],
          ["search", "Consultar", Search],
          ["reminders", "Vencimientos", Clock3],
        ] as const).map(([value, label, Icon]) => (
          <button key={value} type="button" className={`${styles.tab} ${tab === value ? styles.tabActive : ""}`} onClick={() => setTab(value)} aria-current={tab === value ? "page" : undefined}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>

      {error && <div className={styles.error} role="alert">{error} <button type="button" onClick={() => void initialize()}>Reintentar</button></div>}

      {tab === "overview" && (
        <>
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <div><h2>Resumen</h2><p>Ventas y canjes se muestran por separado para evitar duplicar ingresos.</p></div>
              <div className={styles.actions}>
                <label className={styles.field}>Desde<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
                <label className={styles.field}>Hasta<input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} /></label>
                <button type="button" className={styles.secondary} onClick={() => void loadStatistics()}>Aplicar</button>
              </div>
            </div>
            <div className={styles.grid} aria-live="polite">
              {loading ? Array.from({ length: 7 }, (_, index) => <div key={index} className={styles.skeleton} />) : metrics.map(([label, value]) => <article key={label} className={styles.metric}><span>{label}</span><strong>{value}</strong></article>)}
            </div>
          </section>
          <div className={styles.notice}>Las agrupaciones por sucursal se conservan en la respuesta del backend. No se muestran gráficas temporales porque el contrato no define series de tiempo.</div>
        </>
      )}

      {tab === "sale" && (
        <section className={styles.section}>
          <div className={styles.sectionHeading}><div><h2>1–4. Registrar venta pendiente</h2><p>Selecciona el programa, confirma el importe y captura los datos del regalo.</p></div></div>
          {programs.length === 0 ? <div className={styles.empty}>Primero crea un programa Gift Card en <strong>Mi tarjeta</strong>.</div> : (
            <div className={styles.formGrid}>
              <label className={styles.field}>Programa<select value={sale.loyaltyProgramId} onChange={(event) => setSale((current) => ({ ...current, loyaltyProgramId: event.target.value, amount: "" }))}>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label>
              <label className={styles.field}>Sucursal activa<input value={session.activeLocationName ?? "Sin sucursal seleccionada"} readOnly aria-readonly="true" /></label>
              {presets.length > 0 && <div className={`${styles.field} ${styles.full}`}><span>Montos preestablecidos</span><div className={styles.presets}>{presets.map((preset) => <button key={preset.amount} type="button" className={`${styles.preset} ${Number(sale.amount) === preset.amount ? styles.presetActive : ""}`} onClick={() => setSale((current) => ({ ...current, amount: String(preset.amount) }))}>{money.format(preset.amount)}</button>)}</div></div>}
              {selectedProgram?.giftCardAllowCustomAmount !== false && <label className={styles.field}>Importe personalizado (MXN)<input type="number" min={selectedProgram?.giftCardCustomMinAmount ?? 0.01} max={selectedProgram?.giftCardCustomMaxAmount ?? undefined} step="0.01" value={sale.amount} onChange={(event) => setSale((current) => ({ ...current, amount: event.target.value }))} /></label>}
              <label className={styles.field}>Comprador<input maxLength={100} value={sale.buyerName} onChange={(event) => setSale((current) => ({ ...current, buyerName: event.target.value }))} /></label>
              <label className={styles.field}>Destinatario<input maxLength={100} value={sale.recipientName} onChange={(event) => setSale((current) => ({ ...current, recipientName: event.target.value }))} /></label>
              <label className={styles.field}>WhatsApp con código de país<input type="tel" inputMode="tel" value={sale.recipientWhatsApp} onChange={(event) => setSale((current) => ({ ...current, recipientWhatsApp: event.target.value }))} /></label>
              <label className={`${styles.field} ${styles.full}`}>Mensaje opcional<textarea maxLength={500} value={sale.personalMessage} onChange={(event) => setSale((current) => ({ ...current, personalMessage: event.target.value }))} /></label>
              <div className={`${styles.summary} ${styles.full}`}><div><span>Importe</span><strong>{money.format(Number(sale.amount) || 0)}</strong></div><div><span>Destinatario</span><strong>{sale.recipientName || "Pendiente"}</strong></div><div><span>Sucursal</span><strong>{session.activeLocationName || "Pendiente"}</strong></div></div>
              <div className={`${styles.actions} ${styles.full}`}><button type="button" className={styles.button} disabled={saleBusy} onClick={() => void registerSale()}>{saleBusy ? <LoaderCircle className="scanner-spinner" size={17} /> : <ShoppingBag size={17} />} Registrar venta pendiente</button></div>
            </div>
          )}
          {pendingSale && !confirmed && <div className={styles.result}><div className={styles.notice}>La tarjeta sigue inactiva hasta que el servidor confirme el pago.</div><div className={styles.summary}><div><span>Importe</span><strong>{money.format(pendingSale.amount ?? 0)}</strong></div><div><span>Destinatario</span><strong>{pendingSale.recipientName ?? sale.recipientName}</strong></div><div><span>Estado</span><strong>{statusLabel(pendingSale.status)}</strong></div></div><div className={styles.actions}><button type="button" className={styles.button} onClick={() => setPaymentDialog(true)}>Confirmar pago recibido</button></div></div>}
          {confirmed && <div className={styles.result}><div className={styles.notice}><CheckCircle2 size={18} /> Pago confirmado por el servidor. Abrir WhatsApp no confirma entrega ni lectura.</div><div className={styles.resultGrid}><div className={styles.resultItem}><span>Importe</span><strong>{money.format(confirmed.amount ?? confirmed.balance ?? 0)}</strong></div><div className={styles.resultItem}><span>Destinatario</span><strong>{confirmed.recipientName ?? sale.recipientName}</strong></div><div className={styles.resultItem}><span>Estado</span><strong>{statusLabel(confirmed.status ?? 2)}</strong></div>{confirmed.loyaltyCardId && <div className={styles.resultItem}><span>Tarjeta</span><strong>{confirmed.loyaltyCardId}</strong></div>}</div><div className={styles.actions}>{confirmed.whatsAppUrl && <a className={styles.button} href={confirmed.whatsAppUrl} target="_blank" rel="noreferrer"><Send size={17} /> Enviar por WhatsApp</a>}<button type="button" className={styles.secondary} disabled={!confirmed.publicUrl} onClick={() => void copyLink(confirmed.publicUrl)}><Copy size={17} /> Copiar enlace</button></div></div>}
        </section>
      )}

      {tab === "search" && <div className={styles.page}>
        <section className={styles.section}><div className={styles.sectionHeading}><div><h2>Consultar por QR</h2><p>Usa la ruta de consulta disponible. No existe un listado paginado de todas las Gift Cards.</p></div></div><div className={styles.formGrid}><label className={`${styles.field} ${styles.full}`}>Token QR<input type="password" autoComplete="off" value={qrToken} onChange={(event) => setQrToken(event.target.value)} /></label><div className={`${styles.actions} ${styles.full}`}><button className={styles.button} type="button" disabled={lookupBusy || !qrToken.trim()} onClick={() => void lookupCard()}>{lookupBusy ? <LoaderCircle className="scanner-spinner" size={17} /> : <Search size={17} />} Consultar</button></div></div>{lookup && <div className={styles.resultGrid}><div className={styles.resultItem}><span>Programa</span><strong>{lookup.programName ?? "Gift Card"}</strong></div><div className={styles.resultItem}><span>Destinatario</span><strong>{lookup.recipientName ?? "Sin nombre"}</strong></div><div className={styles.resultItem}><span>Saldo</span><strong>{money.format(lookup.balance ?? 0)}</strong></div><div className={styles.resultItem}><span>Importe original</span><strong>{money.format(lookup.originalAmount ?? lookup.amount ?? 0)}</strong></div><div className={styles.resultItem}><span>Estado</span><strong>{statusLabel(lookup.status)}</strong></div><div className={styles.resultItem}><span>Vencimiento</span><strong>{lookup.expiresAtUtc ? new Date(lookup.expiresAtUtc).toLocaleDateString("es-MX") : "Sin vencimiento"}</strong></div></div>}</section>
        <section className={styles.section}><div className={styles.sectionHeading}><div><h2>Recuperar enlace e historial</h2><p>Consulta una tarjeta conocida por su identificador administrativo.</p></div></div><div className={styles.formGrid}><label className={`${styles.field} ${styles.full}`}>ID de Gift Card<input value={cardId} onChange={(event) => setCardId(event.target.value)} /></label><div className={`${styles.actions} ${styles.full}`}><button className={styles.secondary} type="button" disabled={recoveryBusy || !cardId.trim()} onClick={() => void recoverCard()}>{recoveryBusy ? <LoaderCircle className="scanner-spinner" size={17} /> : <History size={17} />} Recuperar</button></div></div>{share && <div className={styles.result}><div className={styles.resultGrid}><div className={styles.resultItem}><span>Movimientos</span><strong>{movementCount ?? 0}</strong></div><div className={styles.resultItem}><span>Enlace público</span><strong>{share.publicUrl ? "Disponible" : "No disponible"}</strong></div><div className={styles.resultItem}><span>WhatsApp</span><strong>{share.whatsAppUrl ? "Disponible" : "No disponible"}</strong></div></div><div className={styles.actions}>{share.whatsAppUrl && <a className={styles.button} href={share.whatsAppUrl} target="_blank" rel="noreferrer"><ExternalLink size={17} /> Compartir nuevamente</a>}<button className={styles.secondary} type="button" disabled={!share.publicUrl} onClick={() => void copyLink(share.publicUrl)}><Copy size={17} /> Copiar enlace</button></div></div>}</section>
      </div>}

      {tab === "reminders" && <section className={styles.section}><div className={styles.sectionHeading}><div><h2>Próximas a vencer</h2><p>La consulta y apertura de WhatsApp no marcan el recordatorio como enviado.</p></div></div><div className={styles.formGrid}><label className={styles.field}>Días de anticipación<input type="number" min={1} max={90} step={1} value={days} onChange={(event) => setDays(Math.max(1, Number(event.target.value) || 1))} /></label><div className={styles.actions}><button className={styles.button} type="button" disabled={remindersBusy} onClick={() => void loadReminders()}>{remindersBusy ? <LoaderCircle className="scanner-spinner" size={17} /> : <Clock3 size={17} />} Consultar</button></div></div><div className={styles.reminderList}>{reminders.length === 0 ? <div className={styles.empty}>Consulta para ver las tarjetas autorizadas próximas a vencer.</div> : reminders.map((reminder, index) => <article key={reminder.id ?? index} className={styles.reminder}><div><strong>{reminder.recipientName ?? "Destinatario"}</strong><p>Saldo {money.format(reminder.balance ?? 0)} · vence {reminder.expiresAtUtc ? new Date(reminder.expiresAtUtc).toLocaleDateString("es-MX") : "sin fecha"}</p></div>{reminder.whatsAppUrl && <a className={styles.secondary} href={reminder.whatsAppUrl} target="_blank" rel="noreferrer"><Send size={16} /> Abrir WhatsApp</a>}</article>)}</div></section>}

      <AlertDialog open={paymentDialog} onOpenChange={(open) => !saleBusy && setPaymentDialog(open)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar pago recibido</AlertDialogTitle><AlertDialogDescription>Confirma que recibiste {money.format(pendingSale?.amount ?? 0)} por la Gift Card de {pendingSale?.recipientName ?? sale.recipientName}. Esta operación activa saldo real.</AlertDialogDescription></AlertDialogHeader><label className={styles.field}>Método de pago<select value={paymentMethod} onChange={(event) => setPaymentMethod(Number(event.target.value))}><option value={1}>Efectivo</option><option value={2}>Tarjeta externa</option><option value={3}>Transferencia</option></select></label>{paymentMethod !== 1 && <label className={styles.field}>Referencia<input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} /></label>}<AlertDialogFooter><AlertDialogCancel disabled={saleBusy}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={saleBusy} onClick={(event) => { event.preventDefault(); void confirmPayment(); }}>{saleBusy ? "Confirmando…" : "Sí, recibí el pago"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </main>
  );
}
