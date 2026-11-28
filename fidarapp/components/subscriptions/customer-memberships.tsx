"use client";

import { useCallback, useEffect, useState } from "react";
import { Crown, ExternalLink, LoaderCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useActiveLocation } from "@/components/gift-cards/active-location";
import { FidaraConfirmDialog } from "@/components/ui/fidara-confirm-dialog";
import { Input } from "@/components/ui/input";
import { operationalErrorMessage } from "@/lib/active-location-client";
import {
  type ApiEnvelope,
  type MembershipDetail,
  type MembershipListItem,
  type MembershipPaymentOperation,
  membershipStatusLabel,
} from "@/lib/subscriptions";

type CustomerCard = { id: string; qrToken: string };

function formatDate(value?: string | null) {
  if (!value) return "Sin vigencia";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function CustomerMemberships({
  customerId,
  customerName,
  cards,
}: {
  customerId: string;
  customerName: string;
  cards: CustomerCard[];
}) {
  const activeLocation = useActiveLocation();
  const [memberships, setMemberships] = useState<MembershipDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewingId, setRenewingId] = useState("");
  const [pending, setPending] = useState<MembershipPaymentOperation | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<1 | 2 | 3>(1);
  const [paymentReference, setPaymentReference] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [openingGoogleWallet, setOpeningGoogleWallet] = useState("");

  const loadMemberships = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        search: customerName,
        page: "1",
        pageSize: "100",
      });
      const response = await fetch(`/api/subscription-memberships?${query}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiEnvelope<{
        items: MembershipListItem[];
      }>;
      if (!response.ok) throw new Error(payload.message ?? "No fue posible consultar las membresías.");
      const exact = (payload.data?.items ?? []).filter(
        (membership) => membership.customerId === customerId,
      );
      const details = await Promise.all(
        exact.map(async (membership) => {
          const detailResponse = await fetch(
            `/api/subscription-memberships/${encodeURIComponent(membership.id)}`,
            { cache: "no-store" },
          );
          const detailPayload = (await detailResponse.json()) as ApiEnvelope<MembershipDetail>;
          if (!detailResponse.ok || !detailPayload.data) {
            throw new Error(detailPayload.message ?? "No fue posible cargar una membresía.");
          }
          return detailPayload.data;
        }),
      );
      setMemberships(details);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible consultar las membresías.");
    } finally {
      setLoading(false);
    }
  }, [customerId, customerName]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadMemberships(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadMemberships]);

  async function createRenewal(membership: MembershipDetail) {
    const latestTerm = [...membership.terms].sort(
      (left, right) =>
        new Date(right.endsAtUtc).getTime() - new Date(left.endsAtUtc).getTime(),
    )[0];
    if (!latestTerm) {
      toast.error("La membresía no tiene un plan renovable.");
      return;
    }
    setRenewingId(membership.id);
    try {
      const storageKey = `fidara_membership_renewal_${membership.id}`;
      const idempotencyKey = sessionStorage.getItem(storageKey) ?? crypto.randomUUID();
      sessionStorage.setItem(storageKey, idempotencyKey);
      const response = await fetch(
        `/api/subscription-memberships/${encodeURIComponent(membership.id)}/renewals`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: latestTerm.planId, idempotencyKey }),
        },
      );
      const payload = (await response.json()) as ApiEnvelope<MembershipPaymentOperation>;
      if (!response.ok || !payload.data) {
        throw new Error(
          operationalErrorMessage(payload, "No fue posible preparar la renovación."),
        );
      }
      setPending(payload.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible preparar la renovación.");
    } finally {
      setRenewingId("");
    }
  }

  async function confirmRenewal() {
    if (!pending || (paymentMethod !== 1 && !paymentReference.trim())) return;
    setConfirming(true);
    const storageKey = `fidara_membership_renewal_payment_${pending.paymentId}`;
    try {
      const idempotencyKey = sessionStorage.getItem(storageKey) ?? crypto.randomUUID();
      sessionStorage.setItem(storageKey, idempotencyKey);
      const response = await fetch(
        `/api/subscription-memberships/${encodeURIComponent(pending.membershipId)}/renewals/${encodeURIComponent(pending.paymentId)}/confirm-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentMethod,
            paymentReference: paymentReference.trim() || null,
            evidenceNote: evidenceNote.trim() || null,
            idempotencyKey,
            rowVersion: pending.membershipRowVersion,
          }),
        },
      );
      const payload = (await response.json()) as ApiEnvelope<unknown>;
      if (!response.ok) {
        throw new Error(
          operationalErrorMessage(payload, "No fue posible confirmar la renovación."),
        );
      }
      sessionStorage.removeItem(storageKey);
      sessionStorage.removeItem(`fidara_membership_renewal_${pending.membershipId}`);
      toast.success("Renovación y pago confirmados");
      setPending(null);
      setPaymentReference("");
      setEvidenceNote("");
      await loadMemberships();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible confirmar la renovación.");
    } finally {
      setConfirming(false);
    }
  }

  async function openGoogleWallet(loyaltyCardId: string) {
    setOpeningGoogleWallet(loyaltyCardId);
    try {
      const response = await fetch(
        `/api/wallet/google/${encodeURIComponent(loyaltyCardId)}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
      );
      const payload = (await response.json()) as {
        message?: string;
        saveUrl?: string;
        SaveUrl?: string;
      };
      if (!response.ok) throw new Error(payload.message ?? "No fue posible abrir Google Wallet.");
      const saveUrl = payload.saveUrl ?? payload.SaveUrl;
      if (!saveUrl) throw new Error("La API no devolvió el enlace de Google Wallet.");
      window.open(saveUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible abrir Google Wallet.");
    } finally {
      setOpeningGoogleWallet("");
    }
  }

  return (
    <section className="rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_12px_35px_rgba(17,24,39,0.05)] sm:p-6">
      <div className="flex items-center justify-between gap-3"><div><span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#E11D48]">Suscripciones</span><h2 className="text-2xl font-extrabold">Membresías</h2></div><Crown className="text-[#E11D48]" /></div>
      {loading ? <LoaderCircle className="mt-5 animate-spin text-[#E11D48]" /> : memberships.length === 0 ? <p className="mt-4 text-sm text-slate-500">Este cliente no tiene membresías registradas.</p> : <div className="mt-5 grid gap-4 lg:grid-cols-2">{memberships.map((membership) => {
        const card = cards.find((candidate) => candidate.id === membership.loyaltyCardId);
        return <article key={membership.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-extrabold">{membership.programName}</h3><p className="text-sm text-slate-500">{membership.currentPlanName ?? "Plan pendiente"}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold">{membershipStatusLabel(membership.status)}</span></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Inicio</dt><dd className="font-bold">{formatDate(membership.currentTermStartsAtUtc)}</dd></div><div><dt className="text-slate-500">Vigencia</dt><dd className="font-bold">{formatDate(membership.currentTermEndsAtUtc)}</dd></div></dl><div className="mt-4 flex flex-wrap gap-2"><Button type="button" className="bg-[#E11D48] font-bold hover:bg-[#BE123C]" disabled={renewingId === membership.id || membership.status === 4} onClick={() => void createRenewal(membership)}>{renewingId === membership.id ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}Renovar</Button><a className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-bold" href={`/api/wallet/apple/${encodeURIComponent(membership.loyaltyCardId)}`}><ExternalLink className="mr-2 size-4" />Apple Wallet</a><Button type="button" variant="outline" disabled={openingGoogleWallet === membership.loyaltyCardId} onClick={() => void openGoogleWallet(membership.loyaltyCardId)}>{openingGoogleWallet === membership.loyaltyCardId ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <ExternalLink className="mr-2 size-4" />}Google Wallet</Button>{card && <a className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-bold" href={`${process.env.NEXT_PUBLIC_GET_APP_URL ?? "https://get.fidara.mx"}/card/${encodeURIComponent(card.qrToken)}`} target="_blank" rel="noreferrer">QR</a>}</div></article>;
      })}</div>}

      <FidaraConfirmDialog open={Boolean(pending)} onOpenChange={(open) => { if (!open && !confirming) setPending(null); }} title="Confirmar renovación de membresía" description={`Confirma únicamente después de recibir el pago en ${activeLocation.location?.name ?? "la sucursal activa"}. El servidor conservará la misma membresía, tarjeta y QR.`} confirmLabel="Confirmar pago y renovar" busy={confirming} busyLabel="Confirmando…" confirmDisabled={paymentMethod !== 1 && !paymentReference.trim()} onConfirm={() => void confirmRenewal()}>
        {pending && <div className="grid gap-4"><div className="rounded-2xl bg-slate-50 p-4"><small className="font-bold text-slate-500">Importe calculado por servidor</small><strong className="block text-2xl">{pending.amount.toLocaleString("es-MX", { style: "currency", currency: pending.currency })}</strong><p className="text-sm text-slate-500">{formatDate(pending.proposedStartsAtUtc)} – {formatDate(pending.proposedEndsAtUtc)}</p></div><label className="grid gap-2 text-sm font-bold">Método<select className="h-12 rounded-xl border border-slate-300 bg-white px-3" value={paymentMethod} onChange={(event) => setPaymentMethod(Number(event.target.value) as 1 | 2 | 3)}><option value={1}>Efectivo</option><option value={2}>Tarjeta</option><option value={3}>Transferencia</option></select></label>{paymentMethod !== 1 && <label className="grid gap-2 text-sm font-bold">Referencia<Input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} /></label>}<label className="grid gap-2 text-sm font-bold">Nota de evidencia (opcional)<Input value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} /></label></div>}
      </FidaraConfirmDialog>
    </section>
  );
}
