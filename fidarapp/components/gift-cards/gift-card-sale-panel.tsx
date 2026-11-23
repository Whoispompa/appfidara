"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, RotateCcw, Send, Share2, ShoppingBag } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { FidaraConfirmDialog } from "@/components/ui/fidara-confirm-dialog";
import { useActiveLocation } from "./active-location";
import styles from "@/app/dashboard/gift-cards/gift-cards.module.css";

type Program = {
  id: string;
  name: string;
  programType: number;
  isActive?: boolean;
  giftCardAllowCustomAmount?: boolean;
  giftCardCustomMinAmount?: number | null;
  giftCardCustomMaxAmount?: number | null;
  giftCardPresetAmounts?: Array<{ amount: number; isActive: boolean; displayOrder: number }>;
};

type SaleForm = {
  loyaltyProgramId: string;
  amount: string;
  buyerName: string;
  recipientName: string;
  recipientWhatsApp: string;
  personalMessage: string;
};

type SaleResult = {
  id?: string;
  amount?: number;
  recipientName?: string;
  status?: number;
  balance?: number;
  publicUrl?: string;
  whatsAppUrl?: string;
  replayed?: boolean;
};

type SaleRequest = Omit<SaleForm, "amount" | "personalMessage"> & {
  amount: number;
  personalMessage: string | null;
  locationId: string;
  idempotencyKey: string;
};

type PaymentRequest = {
  locationId: string;
  paymentMethod: number;
  paymentReference: string | null;
  idempotencyKey: string;
};

type SaleAttempt = {
  saleRequest: SaleRequest;
  pending?: SaleResult;
  paymentRequest?: PaymentRequest;
};

const EMPTY_SALE = (programId: string): SaleForm => ({
  loyaltyProgramId: programId,
  amount: "",
  buyerName: "",
  recipientName: "",
  recipientWhatsApp: "+52 ",
  personalMessage: "",
});

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const dataOf = <T,>(payload: unknown) => (((payload as { data?: T })?.data ?? payload) as T);
const messageOf = (payload: unknown, fallback: string) =>
  (payload as { message?: string })?.message ?? fallback;

function attemptStorageKey(programId: string) {
  return `fidara_gift_sale_attempt_${programId}`;
}

function saveAttempt(programId: string, attempt: SaleAttempt | null) {
  const key = attemptStorageKey(programId);
  if (attempt) sessionStorage.setItem(key, JSON.stringify(attempt));
  else sessionStorage.removeItem(key);
}

function restoreAttempt(programId: string) {
  try {
    const serialized = sessionStorage.getItem(attemptStorageKey(programId));
    return serialized ? (JSON.parse(serialized) as SaleAttempt) : null;
  } catch {
    sessionStorage.removeItem(attemptStorageKey(programId));
    return null;
  }
}

export function GiftCardSalePanel({ programId }: { programId: string }) {
  const location = useActiveLocation();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [attempt, setAttempt] = useState<SaleAttempt | null>(null);
  const [confirmed, setConfirmed] = useState<SaleResult | null>(null);
  const [paymentMethod, setPaymentMethod] = useState(1);
  const [paymentReference, setPaymentReference] = useState("");
  const [sale, setSale] = useState<SaleForm>(() => EMPTY_SALE(programId));

  useEffect(() => {
    void (async () => {
      const restored = restoreAttempt(programId);
      if (restored) {
        setAttempt(restored);
        setSale({
          loyaltyProgramId: restored.saleRequest.loyaltyProgramId,
          amount: String(restored.saleRequest.amount),
          buyerName: restored.saleRequest.buyerName,
          recipientName: restored.saleRequest.recipientName,
          recipientWhatsApp: restored.saleRequest.recipientWhatsApp,
          personalMessage: restored.saleRequest.personalMessage ?? "",
        });
        if (restored.paymentRequest) {
          setPaymentMethod(restored.paymentRequest.paymentMethod);
          setPaymentReference(restored.paymentRequest.paymentReference ?? "");
        }
      }

      try {
        const response = await fetch("/api/programs", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (response.status === 401) {
          sessionStorage.removeItem("fidara_session");
          window.location.replace("/login");
          return;
        }
        if (!response.ok) throw new Error(messageOf(payload, "No fue posible cargar los programas."));
        const list = dataOf<Program[]>(payload).filter(
          (item) => Number(item.programType) === 5 && item.isActive !== false && item.id === programId,
        );
        setPrograms(list);
        if (!restored) {
          setSale((current) => ({ ...current, loyaltyProgramId: list[0]?.id ?? "" }));
        }
      } catch (caught) {
        toast.error("No se pudieron cargar las Gift Cards", {
          description: caught instanceof Error ? caught.message : undefined,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [programId]);

  const program = programs.find((item) => item.id === sale.loyaltyProgramId);
  const presets = useMemo(
    () => (program?.giftCardPresetAmounts ?? [])
      .filter((item) => item.isActive)
      .sort((left, right) => left.displayOrder - right.displayOrder),
    [program],
  );

  function validateSale() {
    const amount = Number(sale.amount);
    if (!location.locationId) {
      toast.error("Selecciona una sucursal activa.");
      return false;
    }
    if (!program || !Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) {
      toast.error("Selecciona un programa e importe válido.");
      return false;
    }
    const isPreset = presets.some((preset) => preset.amount === amount);
    if (!isPreset && program.giftCardAllowCustomAmount === false) {
      toast.error("Selecciona uno de los importes disponibles.");
      return false;
    }
    if (!isPreset && (amount < Number(program.giftCardCustomMinAmount ?? 0) || amount > Number(program.giftCardCustomMaxAmount ?? Number.MAX_SAFE_INTEGER))) {
      toast.error("El importe está fuera del rango configurado.");
      return false;
    }
    if (!sale.buyerName.trim() || !sale.recipientName.trim() || !/^\+[1-9]\d[\d\s()-]{7,}$/.test(sale.recipientWhatsApp.trim())) {
      toast.error("Completa comprador, destinatario y WhatsApp con código de país.");
      return false;
    }
    return true;
  }

  function openConfirmation() {
    if (!attempt && !validateSale()) return;
    setDialogOpen(true);
  }

  async function confirmSale() {
    if (!program || !location.locationId || busy) return;
    if (attempt && location.locationId !== attempt.saleRequest.locationId) {
      toast.error("Selecciona la sucursal original para recuperar esta venta.");
      return;
    }
    if (paymentMethod !== 1 && !paymentReference.trim()) {
      toast.error("La referencia de pago es obligatoria.");
      return;
    }

    let currentAttempt = attempt;
    if (!currentAttempt) {
      currentAttempt = {
        saleRequest: {
          ...sale,
          amount: Number(sale.amount),
          buyerName: sale.buyerName.trim(),
          recipientName: sale.recipientName.trim(),
          recipientWhatsApp: sale.recipientWhatsApp.trim(),
          personalMessage: sale.personalMessage.trim() || null,
          locationId: location.locationId,
          idempotencyKey: `sale-${crypto.randomUUID()}`,
        },
      };
    }
    if (!currentAttempt.paymentRequest) {
      currentAttempt = {
        ...currentAttempt,
        paymentRequest: {
          locationId: currentAttempt.saleRequest.locationId,
          paymentMethod,
          paymentReference: paymentReference.trim() || null,
          idempotencyKey: `payment-${crypto.randomUUID()}`,
        },
      };
    }

    setAttempt(currentAttempt);
    saveAttempt(programId, currentAttempt);
    setBusy(true);
    try {
      let pending = currentAttempt.pending;
      if (!pending?.id) {
        const response = await fetch("/api/gift-cards/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentAttempt.saleRequest),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (response.status >= 400 && response.status < 500 && response.status !== 409) {
            setAttempt(null);
            saveAttempt(programId, null);
          }
          throw new Error(messageOf(payload, "No se pudo registrar la venta."));
        }
        const result = dataOf<SaleResult>(payload);
        pending = {
          ...result,
          amount: result.amount ?? currentAttempt.saleRequest.amount,
          recipientName: result.recipientName ?? currentAttempt.saleRequest.recipientName,
        };
        currentAttempt = { ...currentAttempt, pending };
        setAttempt(currentAttempt);
        saveAttempt(programId, currentAttempt);
      }
      if (!pending.id) throw new Error("El servidor no devolvió el identificador de la venta.");

      const response = await fetch(`/api/gift-cards/${encodeURIComponent(pending.id)}/confirm-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentAttempt.paymentRequest),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status >= 400 && response.status < 500 && response.status !== 409) {
          const recoverableAttempt = { ...currentAttempt, paymentRequest: undefined };
          setAttempt(recoverableAttempt);
          saveAttempt(programId, recoverableAttempt);
        }
        throw new Error(messageOf(payload, "No fue posible confirmar el pago."));
      }

      const result = { ...pending, ...dataOf<SaleResult>(payload) };
      setConfirmed(result);
      setAttempt(null);
      saveAttempt(programId, null);
      setDialogOpen(false);
      toast.success(result.replayed ? "Venta recuperada y confirmada" : "Venta confirmada");
    } catch (caught) {
      toast.error("No se pudo completar la venta", {
        description: caught instanceof Error ? caught.message : "El intento se conservó para reanudarlo sin crear otra Gift Card.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!confirmed?.publicUrl) return;
    await navigator.clipboard.writeText(confirmed.publicUrl);
    toast.success("Enlace copiado");
  }

  async function share() {
    if (!confirmed?.publicUrl || !navigator.share) return;
    await navigator.share({
      title: "Tu Gift Card",
      text: `Gift Card para ${confirmed.recipientName ?? sale.recipientName}`,
      url: confirmed.publicUrl,
    });
  }

  function newSale() {
    setConfirmed(null);
    setAttempt(null);
    saveAttempt(programId, null);
    setPaymentMethod(1);
    setPaymentReference("");
    setSale(EMPTY_SALE(programId));
  }

  if (loading) return <div className={styles.skeleton} role="status" aria-label="Cargando venta" />;
  if (programs.length === 0) return <div className={styles.empty}>Este programa no está disponible para vender como Gift Card.</div>;

  const formLocked = busy || Boolean(attempt);
  const pending = attempt?.pending;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeading}>
        <div>
          <h2>Vender una Gift Card</h2>
          <p>Captura la venta. El QR se habilita únicamente cuando el servidor confirma el pago.</p>
        </div>
      </div>

      {!confirmed && <div className={styles.formGrid}>
        <label className={styles.field}>Programa<input value={program?.name ?? ""} readOnly aria-readonly="true" /></label>
        <label className={styles.field}>Sucursal autorizada<select value={location.locationId} disabled={busy || location.changing || location.locations.length < 2} onChange={(event) => void location.selectLocation(event.target.value)}><option value="">Selecciona una sucursal</option>{location.locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {presets.length > 0 && <div className={`${styles.field} ${styles.full}`}><span>Importes disponibles</span><div className={styles.presets}>{presets.map((preset) => <button key={`${preset.displayOrder}-${preset.amount}`} type="button" disabled={formLocked} className={`${styles.preset} ${Number(sale.amount) === preset.amount ? styles.presetActive : ""}`} onClick={() => setSale((current) => ({ ...current, amount: String(preset.amount) }))}>{money.format(preset.amount)}</button>)}</div></div>}
        {program?.giftCardAllowCustomAmount !== false && <label className={styles.field}>Importe<input type="number" min={program?.giftCardCustomMinAmount ?? 0.01} max={program?.giftCardCustomMaxAmount ?? undefined} step=".01" disabled={formLocked} value={sale.amount} onChange={(event) => setSale((current) => ({ ...current, amount: event.target.value }))} /></label>}
        <label className={styles.field}>Comprador<input maxLength={100} disabled={formLocked} value={sale.buyerName} onChange={(event) => setSale((current) => ({ ...current, buyerName: event.target.value }))} /></label>
        <label className={styles.field}>Destinatario<input maxLength={100} disabled={formLocked} value={sale.recipientName} onChange={(event) => setSale((current) => ({ ...current, recipientName: event.target.value }))} /></label>
        <label className={styles.field}>WhatsApp con código de país<input type="tel" disabled={formLocked} value={sale.recipientWhatsApp} onChange={(event) => setSale((current) => ({ ...current, recipientWhatsApp: event.target.value }))} /></label>
        <label className={`${styles.field} ${styles.full}`}>Mensaje personalizado opcional<textarea maxLength={500} disabled={formLocked} value={sale.personalMessage} onChange={(event) => setSale((current) => ({ ...current, personalMessage: event.target.value }))} /></label>
        {attempt && <div className={`${styles.notice} ${styles.full}`} role="status">{pending?.id ? <>La venta pendiente quedó guardada. Reintenta la confirmación del pago; no se creará otra Gift Card. <span className="break-all">Identificador: {pending.id}</span></> : "El intento se conservó con la misma clave de idempotencia. Reinténtalo sin modificar los datos."}{location.locationId !== attempt.saleRequest.locationId && <span className="mt-2 block font-bold">Selecciona nuevamente la sucursal original para continuar.</span>}</div>}
        <div className={`${styles.actions} ${styles.full}`}><button className={styles.button} type="button" disabled={busy || !location.locationId || Boolean(attempt && location.locationId !== attempt.saleRequest.locationId)} onClick={openConfirmation}><ShoppingBag size={17} />{attempt ? "Reintentar venta y generar QR" : "Confirmar venta y generar QR"}</button></div>
      </div>}

      {confirmed && <div className={styles.result}>
        <div className={styles.notice}><CheckCircle2 size={18} /> Venta confirmada por el servidor. Abrir una app no confirma envío, entrega ni lectura.</div>
        <div className={styles.resultGrid}><div className={styles.resultItem}><span>Importe</span><strong>{money.format(confirmed.amount ?? confirmed.balance ?? 0)}</strong></div><div className={styles.resultItem}><span>Destinatario</span><strong>{confirmed.recipientName ?? sale.recipientName}</strong></div><div className={styles.resultItem}><span>Estado</span><strong>Venta confirmada</strong></div></div>
        {confirmed.publicUrl && <div className="mx-auto grid max-w-sm place-items-center gap-3 rounded-2xl bg-white p-4 text-center"><QRCodeSVG value={confirmed.publicUrl} size={220} level="M" marginSize={2} /><strong>QR para entregar el regalo</strong><small className="text-slate-500">Codifica el enlace público de entrega; no es el QR financiero de canje.</small></div>}
        <div className={styles.actions}>{confirmed.whatsAppUrl && <a className={styles.button} href={confirmed.whatsAppUrl} target="_blank" rel="noreferrer"><Send size={17} /> Abrir WhatsApp</a>}{typeof navigator !== "undefined" && "share" in navigator && <button className={styles.secondary} type="button" onClick={() => void share()}><Share2 size={17} /> Compartir</button>}<button className={styles.secondary} type="button" disabled={!confirmed.publicUrl} onClick={() => void copyLink()}><Copy size={17} /> Copiar enlace</button><button className={styles.secondary} type="button" onClick={newSale}><RotateCcw size={17} /> Nueva venta</button></div>
      </div>}

      <FidaraConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Confirmar venta de Gift Card"
        description={<>Confirma que recibiste {money.format(Number(sale.amount) || 0)} antes de registrar la venta y activar saldo real. El sistema ejecutará la venta pendiente y la confirmación de pago por separado.</>}
        confirmLabel="Sí, confirmar venta"
        busyLabel="Confirmando venta…"
        busy={busy}
        confirmDisabled={paymentMethod !== 1 && !paymentReference.trim()}
        onConfirm={() => void confirmSale()}
      >
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label className={styles.field}>Método de pago<select value={paymentMethod} disabled={busy || Boolean(attempt?.paymentRequest)} onChange={(event) => setPaymentMethod(Number(event.target.value))}><option value={1}>Efectivo</option><option value={2}>Tarjeta externa</option><option value={3}>Transferencia</option></select></label>
          {paymentMethod !== 1 && <label className={styles.field}>Referencia<input value={paymentReference} disabled={busy || Boolean(attempt?.paymentRequest)} onChange={(event) => setPaymentReference(event.target.value)} /></label>}
        </div>
      </FidaraConfirmDialog>
    </section>
  );
}
