"use client";

import { useMemo, useState } from "react";
import { Check, Crown, QrCode } from "lucide-react";
import { toast } from "sonner";

import { useActiveLocation } from "@/components/gift-cards/active-location";
import { operationalErrorMessage } from "@/lib/active-location-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FidaraConfirmDialog } from "@/components/ui/fidara-confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  type ApiEnvelope,
  type MembershipLookup,
  membershipStatusLabel,
} from "@/lib/subscriptions";

type UsageResult = {
  usageId: string;
  remainingUses?: number | null;
  discountAmount?: number | null;
  netAmount?: number | null;
  replayed: boolean;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function formatMoney(value: number) {
  return value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

export function SubscriptionScanPanel({
  membership,
  qrToken,
  onReset,
}: {
  membership: MembershipLookup;
  qrToken: string;
  onReset: () => void;
}) {
  const activeLocation = useActiveLocation();
  const [snapshot, setSnapshot] = useState(membership);
  const [entitlementId, setEntitlementId] = useState("");
  const [grossAmount, setGrossAmount] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const selectedBenefit = useMemo(
    () => snapshot.benefits.find((benefit) => benefit.entitlementId === entitlementId),
    [entitlementId, snapshot.benefits],
  );
  const isDiscount = selectedBenefit?.type === 3;
  const canSubmit =
    snapshot.membershipStatus === 2 &&
    Boolean(selectedBenefit?.available) &&
    Boolean(activeLocation.locationId) &&
    (!isDiscount || Number(grossAmount) > 0);

  async function consumeBenefit() {
    if (!selectedBenefit || !canSubmit) return;
    setSubmitting(true);
    const storageKey = `fidara_membership_usage_${snapshot.membershipId}_${selectedBenefit.entitlementId}`;
    try {
      const idempotencyKey = sessionStorage.getItem(storageKey) ?? crypto.randomUUID();
      sessionStorage.setItem(storageKey, idempotencyKey);
      const response = await fetch(
        isDiscount
          ? "/api/subscription-memberships/consume-discount"
          : "/api/subscription-memberships/validate-access",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qrToken,
            entitlementId: selectedBenefit.entitlementId,
            idempotencyKey,
            ...(isDiscount ? { grossAmount: Number(grossAmount) } : {}),
          }),
        },
      );
      const payload = (await response.json()) as ApiEnvelope<UsageResult>;
      if (!response.ok || !payload.data) {
        throw new Error(
          operationalErrorMessage(payload, "No fue posible aplicar el beneficio."),
        );
      }
      sessionStorage.removeItem(storageKey);
      setSnapshot((current) => ({
        ...current,
        benefits: current.benefits.map((benefit) =>
          benefit.entitlementId === selectedBenefit.entitlementId
            ? {
                ...benefit,
                remainingUses: payload.data?.remainingUses ?? benefit.remainingUses,
                usedInWindow:
                  payload.data?.remainingUses == null
                    ? benefit.usedInWindow + 1
                    : Math.max((benefit.usageLimit ?? 0) - payload.data.remainingUses, 0),
              }
            : benefit,
        ),
      }));
      setDialogOpen(false);
      toast.success(
        isDiscount
          ? `Descuento aplicado: ${formatMoney(payload.data.discountAmount ?? 0)}`
          : "Acceso validado correctamente",
        isDiscount && payload.data.netAmount != null
          ? { description: `Total después del descuento: ${formatMoney(payload.data.netAmount)}` }
          : undefined,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible aplicar el beneficio.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="overflow-hidden rounded-[22px] border-[#E5E7EB] bg-white shadow-[0_18px_45px_rgba(17,24,39,0.06)]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-[#FFF1F4] text-[#E11D48]"><Crown size={24} /></span>
          <div className="min-w-0"><small className="font-extrabold uppercase tracking-[0.13em] text-[#E11D48]">Suscripción encontrada</small><h2 className="truncate text-xl font-extrabold sm:text-2xl">{snapshot.customerName}</h2><p className="truncate text-sm text-slate-500">{snapshot.programName}</p></div>
        </div>
        <Button type="button" variant="ghost" className="min-h-12 shrink-0 px-3 font-bold text-slate-600" onClick={onReset}><QrCode className="mr-2 size-4" />Escanear otra</Button>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)] lg:items-start">
        <div className="rounded-[20px] bg-[#111827] p-5 text-white lg:sticky lg:top-4">
          <small className="font-extrabold uppercase tracking-[0.14em] text-rose-300">Plan vigente</small>
          <strong className="mt-1 block text-3xl font-extrabold">{snapshot.planName}</strong>
          <dl className="mt-5 grid gap-4 border-t border-white/15 pt-5 sm:grid-cols-2 lg:grid-cols-1">
            <div><dt className="text-sm text-slate-400">Estado</dt><dd className="font-extrabold">{membershipStatusLabel(snapshot.membershipStatus)}</dd></div>
            <div><dt className="text-sm text-slate-400">Vigencia</dt><dd className="font-extrabold">{formatDate(snapshot.startsAtUtc)} – {formatDate(snapshot.endsAtUtc)}</dd></div>
          </dl>
        </div>

        <div className="min-w-0">
          <h3 className="text-lg font-extrabold">Aplicar beneficio</h3>
          <p className="mt-1 text-sm text-slate-500">Selecciona exactamente el beneficio que se utilizará.</p>
          <div className="mt-4 grid gap-3">
            {snapshot.benefits.map((benefit) => (
              <label key={benefit.entitlementId} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 ${entitlementId === benefit.entitlementId ? "border-[#E11D48] bg-rose-50" : "border-slate-200"} ${!benefit.available ? "cursor-not-allowed opacity-60" : ""}`}>
                <input type="radio" name="membership-benefit" className="mt-1 accent-[#E11D48]" value={benefit.entitlementId} checked={entitlementId === benefit.entitlementId} disabled={!benefit.available} onChange={() => setEntitlementId(benefit.entitlementId)} />
                <span className="min-w-0"><strong className="block">{benefit.name}</strong><span className="text-sm text-slate-500">{benefit.type === 1 ? "Acceso ilimitado" : benefit.type === 2 ? `${benefit.remainingUses ?? 0} usos disponibles` : `${benefit.discountPercent ?? 0}% de descuento`}</span></span>
              </label>
            ))}
          </div>
          {isDiscount && <label className="mt-4 grid gap-2 text-sm font-bold">Importe bruto de la compra<Input type="number" min="0.01" step="0.01" inputMode="decimal" value={grossAmount} onChange={(event) => setGrossAmount(event.target.value)} /></label>}
          <label className="mt-4 grid gap-2 text-sm font-bold">Sucursal<select className="h-12 rounded-xl border border-slate-300 bg-white px-3" value={activeLocation.locationId} disabled={activeLocation.changing || activeLocation.locations.length < 2} onChange={(event) => void activeLocation.selectLocation(event.target.value)}><option value="">Selecciona una sucursal</option>{activeLocation.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
          <Button type="button" className="mt-5 h-12 w-full bg-[#E11D48] font-extrabold hover:bg-[#BE123C]" disabled={!canSubmit || submitting} onClick={() => setDialogOpen(true)}><Check className="mr-2 size-5" />{isDiscount ? "Confirmar descuento" : "Confirmar acceso"}</Button>
          <div className="mt-6 border-t border-slate-200 pt-5"><h3 className="font-extrabold">Beneficios disponibles</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{snapshot.benefits.map((benefit) => <div key={benefit.entitlementId} className="rounded-xl bg-slate-50 p-3 text-sm"><strong>{benefit.name}</strong><p className="text-slate-500">Ventana: {formatDate(benefit.windowStartsAtUtc)} – {formatDate(benefit.windowEndsAtUtc)}</p></div>)}</div></div>
        </div>
      </div>

      <FidaraConfirmDialog open={dialogOpen} onOpenChange={(open) => { if (!submitting) setDialogOpen(open); }} title={isDiscount ? "Confirmar descuento de suscripción" : "Confirmar acceso de suscripción"} description={`La operación quedará registrada en ${activeLocation.location?.name ?? "la sucursal activa"}.`} confirmLabel={isDiscount ? "Sí, aplicar descuento" : "Sí, validar acceso"} busy={submitting} busyLabel="Confirmando…" onConfirm={() => void consumeBenefit()}>
        {selectedBenefit && <div className="rounded-2xl bg-slate-50 p-4"><strong className="block">{selectedBenefit.name}</strong>{isDiscount && <p className="mt-1 text-sm text-slate-600">Compra bruta: {formatMoney(Number(grossAmount))}. El servidor calculará el descuento final.</p>}</div>}
      </FidaraConfirmDialog>
    </Card>
  );
}
