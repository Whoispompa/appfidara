"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, LoaderCircle, Plus, Search, Settings2, Users, X } from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";
import { toast } from "sonner";

import { useActiveLocation } from "@/components/gift-cards/active-location";
import { Button } from "@/components/ui/button";
import { FidaraConfirmDialog } from "@/components/ui/fidara-confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  type ApiEnvelope,
  type MembershipPaymentOperation,
  type MembershipPlan,
  type MembershipPlanBenefit,
  isValidSubscriptionProgramId,
  periodLabel,
  subscriptionsEnabled,
} from "@/lib/subscriptions";

type Customer = {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  isActive: boolean;
};

type CustomerMode = "new" | "existing";

type AdministrativeCustomer = {
  customerId: string;
  firstName: string;
  lastName?: string | null;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  isActive: boolean;
};

type AdministrativeCustomerResponse = ApiEnvelope<AdministrativeCustomer> & {
  code?: string;
  created?: boolean;
  requiresSelection?: boolean;
};

type PlanDraft = {
  name: string;
  description: string;
  price: string;
  periodUnit: 1 | 2 | 3 | 4;
  periodCount: string;
  benefits: MembershipPlanBenefit[];
};

const emptyDraft: PlanDraft = {
  name: "",
  description: "",
  price: "",
  periodUnit: 3,
  periodCount: "1",
  benefits: [],
};

function newBenefit(type: 1 | 2 | 3): MembershipPlanBenefit {
  return {
    type,
    name:
      type === 1
        ? "Acceso ilimitado"
        : type === 2
          ? "Usos incluidos"
          : "Descuento para socios",
    description: "",
    usageLimit: type === 2 ? 1 : null,
    resetPeriod: type === 2 ? { unit: 3, count: 1 } : null,
    carryOver: false,
    discountPercent: type === 3 ? 10 : null,
    minimumPurchase: null,
    maximumDiscount: null,
  };
}

function planToDraft(plan: MembershipPlan): PlanDraft {
  return {
    name: plan.name,
    description: plan.description ?? "",
    price: String(plan.currentVersion.price),
    periodUnit: plan.currentVersion.billingPeriod.unit,
    periodCount: String(plan.currentVersion.billingPeriod.count),
    benefits: plan.currentVersion.benefits.map((benefit) => ({ ...benefit })),
  };
}

async function readPlanResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<ApiEnvelope<T>> {
  const raw = await response.text();
  if (!raw.trim()) {
    throw new Error(
      response.ok
        ? `Fidara.Api respondió sin contenido (HTTP ${response.status}).`
        : `${fallbackMessage} (HTTP ${response.status}).`,
    );
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("json")) {
    throw new Error(
      `${fallbackMessage} La respuesta no es JSON (HTTP ${response.status}).`,
    );
  }

  try {
    return JSON.parse(raw) as ApiEnvelope<T>;
  } catch {
    throw new Error(`${fallbackMessage} La respuesta contiene JSON inválido.`);
  }
}

export function SubscriptionProgramPanel({ programId }: { programId: string }) {
  const activeLocation = useActiveLocation();
  const hasSavedProgram = isValidSubscriptionProgramId(programId);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [membershipPlanId, setMembershipPlanId] = useState("");
  const [draft, setDraft] = useState<PlanDraft>(emptyDraft);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);
  const [customerMode, setCustomerMode] = useState<CustomerMode>(
    subscriptionsEnabled ? "new" : "existing",
  );
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [createdCustomer, setCreatedCustomer] =
    useState<AdministrativeCustomer | null>(null);
  const [customerMatches, setCustomerMatches] = useState<
    AdministrativeCustomer[]
  >([]);
  const [selectedMatchCustomerId, setSelectedMatchCustomerId] = useState("");
  const [newCustomerError, setNewCustomerError] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearchAttempted, setCustomerSearchAttempted] = useState(false);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [creatingMembership, setCreatingMembership] = useState(false);
  const [pendingPayment, setPendingPayment] =
    useState<MembershipPaymentOperation | null>(null);
  const [pendingCustomerId, setPendingCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<1 | 2 | 3>(1);
  const [paymentReference, setPaymentReference] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [membershipDialogOpen, setMembershipDialogOpen] = useState(false);

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
  const hasValidMembershipPlan = plans.some(
    (plan) => plan.id === membershipPlanId && plan.isActive,
  );
  const preparedNewCustomerId =
    createdCustomer?.customerId ?? selectedMatchCustomerId;
  const hasValidNewCustomerEmail =
    !newCustomerEmail.trim() ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomerEmail.trim());
  const registrationMissing = [
    !hasSavedProgram ? "guardar el programa" : null,
    customerMode === "existing" && !selectedCustomerId
      ? "seleccionar un cliente de los resultados"
      : null,
    customerMode === "new" && !subscriptionsEnabled
      ? "activar el alta administrativa de clientes"
      : null,
    customerMode === "new" &&
    !preparedNewCustomerId &&
    !newCustomerName.trim()
      ? "capturar el nombre completo"
      : null,
    customerMode === "new" &&
    !preparedNewCustomerId &&
    !newCustomerPhone.trim()
      ? "capturar el WhatsApp"
      : null,
    customerMode === "new" &&
    !preparedNewCustomerId &&
    !hasValidNewCustomerEmail
      ? "capturar un correo válido"
      : null,
    !hasValidMembershipPlan ? "seleccionar un plan activo" : null,
    !activeLocation.locationId ? "seleccionar una sucursal" : null,
  ].filter((requirement): requirement is string => Boolean(requirement));

  const loadPlans = useCallback(async () => {
    if (!isValidSubscriptionProgramId(programId)) {
      setPlans([]);
      setLoadingPlans(false);
      return;
    }

    setLoadingPlans(true);
    try {
      const response = await fetch(
        `/api/programs/${encodeURIComponent(programId)}/subscription-plans`,
        { cache: "no-store" },
      );
      const payload = await readPlanResponse<MembershipPlan[]>(
        response,
        "No fue posible cargar los planes.",
      );
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message ?? "No fue posible cargar los planes.");
      }
      if (!Array.isArray(payload.data)) {
        throw new Error("Fidara.Api no devolvió la lista de planes esperada.");
      }
      setPlans(payload.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible cargar los planes.");
    } finally {
      setLoadingPlans(false);
    }
  }, [programId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadPlans(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadPlans]);

  function updateBenefit(index: number, patch: Partial<MembershipPlanBenefit>) {
    setDraft((current) => ({
      ...current,
      benefits: current.benefits.map((benefit, benefitIndex) =>
        benefitIndex === index ? { ...benefit, ...patch } : benefit,
      ),
    }));
  }

  async function savePlan() {
    if (!hasSavedProgram) {
      toast.error("Guarda el programa antes de crear planes.");
      return;
    }

    const price = Number(draft.price);
    const count = Number(draft.periodCount);
    if (!draft.name.trim() || !Number.isFinite(price) || price <= 0) {
      toast.error("Captura un nombre y precio válidos.");
      return;
    }
    if (!Number.isInteger(count) || count <= 0 || draft.benefits.length === 0) {
      toast.error("Define una periodicidad y al menos un beneficio.");
      return;
    }

    const body = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      price,
      currency: "MXN",
      billingPeriod: { unit: draft.periodUnit, count },
      validity: { unit: draft.periodUnit, count },
      benefits: draft.benefits.map((benefit) => ({
        type: benefit.type,
        name: benefit.name,
        description: benefit.description,
        usageLimit: benefit.usageLimit,
        resetPeriod: benefit.resetPeriod,
        carryOver: benefit.carryOver,
        discountPercent: benefit.discountPercent,
        minimumPurchase: benefit.minimumPurchase,
        maximumDiscount: benefit.maximumDiscount,
      })),
      ...(selectedPlan ? { rowVersion: selectedPlan.rowVersion } : {}),
    };
    setSavingPlan(true);
    try {
      const url = selectedPlan
        ? `/api/programs/${encodeURIComponent(programId)}/subscription-plans/${encodeURIComponent(selectedPlan.id)}`
        : `/api/programs/${encodeURIComponent(programId)}/subscription-plans`;
      const response = await fetch(url, {
        method: selectedPlan ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await readPlanResponse<MembershipPlan>(
        response,
        "No fue posible guardar el plan.",
      );
      if (!response.ok || payload.success === false || !payload.data) {
        throw new Error(payload.message ?? "No fue posible guardar el plan.");
      }
      toast.success(selectedPlan ? "Plan actualizado" : "Plan creado");
      setDraft(emptyDraft);
      setSelectedPlanId("");
      await loadPlans();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible guardar el plan.");
    } finally {
      setSavingPlan(false);
    }
  }

  async function searchCustomers() {
    const search = customerSearch.trim();
    if (search.length < 2) {
      setCustomerSearchAttempted(false);
      setCustomers([]);
      setSelectedCustomerId("");
      toast.error("Escribe al menos 2 caracteres para buscar un cliente.");
      return;
    }
    setSearchingCustomers(true);
    setCustomerSearchAttempted(true);
    setCustomers([]);
    setSelectedCustomerId("");
    try {
      const params = new URLSearchParams({ page: "1", pageSize: "10", search, isActive: "true" });
      const response = await fetch(`/api/customers?${params}`, { cache: "no-store" });
      const payload = (await response.json()) as {
        message?: string;
        data?: Customer[];
      };
      if (!response.ok) throw new Error(payload.message ?? "No fue posible buscar clientes.");
      setCustomers(payload.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible buscar clientes.");
    } finally {
      setSearchingCustomers(false);
    }
  }

  async function createAdministrativeCustomer() {
    if (!subscriptionsEnabled) {
      setNewCustomerError(
        "El alta de nuevos socios estará disponible cuando se publique la API compatible.",
      );
      return null;
    }
    if (createdCustomer) return createdCustomer.customerId;
    if (selectedMatchCustomerId) return selectedMatchCustomerId;

    const fullName = newCustomerName.trim();
    const phone = newCustomerPhone.trim();
    if (!fullName || !phone) {
      setNewCustomerError("Captura nombre completo y WhatsApp.");
      return null;
    }

    setCreatingCustomer(true);
    setNewCustomerError("");
    setCustomerMatches([]);
    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: fullName,
          lastName: null,
          phone,
          email: newCustomerEmail.trim() || null,
          birthDate: null,
          marketingConsent: false,
        }),
      });
      const payload = (await response.json()) as AdministrativeCustomerResponse;

      if (
        response.status === 409 &&
        payload.code === "AMBIGUOUS_CUSTOMER_MATCH"
      ) {
        setNewCustomerError(
          payload.message ??
            "El correo o WhatsApp coincide con más de un cliente. Usa Cliente existente para elegirlo manualmente.",
        );
        return null;
      }
      if (!response.ok || !payload.data) {
        throw new Error(payload.message ?? "No fue posible crear el cliente.");
      }
      if (payload.requiresSelection) {
        setCustomerMatches([payload.data]);
        setNewCustomerError(
          payload.message ??
            "Ya existe un cliente con estos datos. Selecciónalo para continuar.",
        );
        return null;
      }
      if (!payload.created || !payload.data.customerId) {
        throw new Error("Fidara.Api no devolvió el customerId creado.");
      }

      setCreatedCustomer(payload.data);
      toast.success("Cliente creado", {
        description: "Continuaremos con el registro de la membresía.",
      });
      return payload.data.customerId;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No fue posible crear el cliente.";
      setNewCustomerError(message);
      return null;
    } finally {
      setCreatingCustomer(false);
    }
  }

  async function createMembership(customerId: string) {
    if (
      !hasSavedProgram ||
      !customerId ||
      !hasValidMembershipPlan ||
      !activeLocation.locationId
    ) {
      toast.error(`Falta ${registrationMissing.join(", ")}.`);
      return;
    }
    setCreatingMembership(true);
    try {
      const storageKey = `fidara_membership_enrollment_${programId}_${customerId}`;
      const idempotencyKey = sessionStorage.getItem(storageKey) ?? crypto.randomUUID();
      sessionStorage.setItem(storageKey, idempotencyKey);
      const response = await fetch("/api/subscription-memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          programId,
          planId: membershipPlanId,
          idempotencyKey,
        }),
      });
      const payload = (await response.json()) as ApiEnvelope<MembershipPaymentOperation>;
      if (!response.ok || !payload.data) throw new Error(payload.message ?? "No fue posible registrar la membresía.");
      setPendingCustomerId(customerId);
      setPendingPayment(payload.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible registrar la membresía.");
    } finally {
      setCreatingMembership(false);
    }
  }

  async function registerMembership() {
    if (registrationMissing.length > 0) {
      toast.error(`Falta ${registrationMissing.join(", ")}.`);
      return;
    }

    const customerId =
      customerMode === "existing"
        ? selectedCustomerId
        : preparedNewCustomerId || (await createAdministrativeCustomer());
    if (!customerId) return;
    await createMembership(customerId);
  }

  async function confirmPayment() {
    if (!pendingPayment || (paymentMethod !== 1 && !paymentReference.trim())) return;
    setConfirmingPayment(true);
    try {
      const storageKey = `fidara_membership_payment_${pendingPayment.paymentId}`;
      const idempotencyKey = sessionStorage.getItem(storageKey) ?? crypto.randomUUID();
      sessionStorage.setItem(storageKey, idempotencyKey);
      const response = await fetch(
        `/api/subscription-memberships/${encodeURIComponent(pendingPayment.membershipId)}/confirm-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentMethod,
            paymentReference: paymentReference.trim() || null,
            evidenceNote: evidenceNote.trim() || null,
            idempotencyKey,
            rowVersion: pendingPayment.membershipRowVersion,
          }),
        },
      );
      const payload = (await response.json()) as ApiEnvelope<unknown>;
      if (!response.ok) throw new Error(payload.message ?? "No fue posible confirmar el pago.");
      sessionStorage.removeItem(storageKey);
      sessionStorage.removeItem(`fidara_membership_enrollment_${programId}_${pendingCustomerId}`);
      toast.success("Membresía activada y pago confirmado");
      setPendingPayment(null);
      setPaymentReference("");
      setEvidenceNote("");
      setCustomerSearch("");
      setCustomers([]);
      setSelectedCustomerId("");
      setCustomerSearchAttempted(false);
      setPendingCustomerId("");
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerEmail("");
      setCreatedCustomer(null);
      setCustomerMatches([]);
      setSelectedMatchCustomerId("");
      setNewCustomerError("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible confirmar el pago.");
    } finally {
      setConfirmingPayment(false);
    }
  }

  return (
    <section className="subscription-program-panel mt-6" aria-labelledby="subscription-management-title">
      <div className="rounded-[22px] border border-[#E5E7EB] bg-white p-5 lg:flex lg:items-center lg:justify-between lg:gap-6 sm:p-6">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#E11D48]">
            Suscripciones
          </span>
          <h2 id="subscription-management-title" className="mt-1 text-xl font-extrabold text-slate-950">
            Gestión de socios y planes
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-600">
            Administra la operación cuando termines de personalizar tu tarjeta.
          </p>
        </div>
        <div className="mt-4 grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:mt-0 lg:min-w-[560px] lg:max-w-[620px]">
          <Button
            type="button"
            className="h-12 w-full justify-center bg-[#E11D48] px-4 font-extrabold hover:bg-[#BE123C]"
            onClick={() => setMembershipDialogOpen(true)}
          >
            <Users className="mr-2 size-4" />
            Alta de socio
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full justify-center border-slate-300 bg-white px-4 font-extrabold text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-[#111827]"
            onClick={() => {
              if (selectedPlanId) {
                setSelectedPlanId("");
                setDraft(emptyDraft);
              }
              setPlanDialogOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            Crear plan
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full justify-center border-slate-300 bg-white px-4 font-extrabold text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-[#111827]"
            onClick={() => setPlanDialogOpen(true)}
          >
            <Settings2 className="mr-2 size-4" />
            Administrar planes
          </Button>
        </div>
      </div>

      <Dialog.Root open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-[#111827]/60 backdrop-blur-sm" />
          <Dialog.Popup className="subscription-dialog fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[min(920px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_30px_90px_rgba(17,24,39,0.30)] outline-none sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#E11D48]">
                  Planes de suscripción
                </span>
                <Dialog.Title className="mt-1 text-2xl font-extrabold text-[#111827]">
                  Crear y administrar planes
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-sm font-medium leading-6 text-slate-600">
                  Etapa 1: configura precio y periodicidad. Etapa 2: agrega los beneficios incluidos.
                </Dialog.Description>
              </div>
              <Dialog.Close className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-rose-50 hover:text-[#E11D48]" aria-label="Cerrar planes">
                <X size={18} />
              </Dialog.Close>
            </div>

        {selectedPlan && <div className="flex justify-end"><Button variant="ghost" onClick={() => { setSelectedPlanId(""); setDraft(emptyDraft); }}>Nuevo plan</Button></div>}

        {loadingPlans ? <LoaderCircle className="mt-5 animate-spin text-[#E11D48]" /> : plans.length > 0 && (
          <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
            {plans.map((plan) => (
              <button key={plan.id} type="button" onClick={() => { setSelectedPlanId(plan.id); setDraft(planToDraft(plan)); }} className={`min-w-44 rounded-2xl border p-3 text-left ${selectedPlanId === plan.id ? "border-[#E11D48] bg-rose-50" : "border-slate-200 bg-white"}`}>
                <strong className="block">{plan.name}</strong>
                <span className="text-sm text-slate-500">${plan.currentVersion.price.toLocaleString("es-MX")} · {periodLabel(plan.currentVersion.billingPeriod)}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold">Nombre<Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label>
          <label className="grid gap-2 text-sm font-bold">Precio mensual<Input type="number" min="0.01" step="0.01" value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Descripción<Input value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></label>
          <label className="grid gap-2 text-sm font-bold">Periodicidad<select className="h-12 rounded-xl border border-slate-300 bg-white px-3" value={draft.periodUnit} onChange={(event) => setDraft((current) => ({ ...current, periodUnit: Number(event.target.value) as 1 | 2 | 3 | 4 }))}><option value={1}>Días</option><option value={2}>Semanas</option><option value={3}>Meses</option><option value={4}>Años</option></select></label>
          <label className="grid gap-2 text-sm font-bold">Cantidad<Input type="number" min="1" step="1" value={draft.periodCount} onChange={(event) => setDraft((current) => ({ ...current, periodCount: event.target.value }))} /></label>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><h3 className="font-extrabold">Beneficios</h3><div className="flex flex-wrap gap-2">{([1, 2, 3] as const).map((type) => <Button key={type} type="button" variant="outline" className="h-10" onClick={() => setDraft((current) => ({ ...current, benefits: [...current.benefits, newBenefit(type)] }))}><Plus className="mr-1 size-4" />{type === 1 ? "Acceso" : type === 2 ? "Usos" : "Descuento"}</Button>)}</div></div>
        <div className="mt-3 grid gap-3">
          {draft.benefits.map((benefit, index) => (
            <div key={`${benefit.type}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-bold">Nombre<Input value={benefit.name} onChange={(event) => updateBenefit(index, { name: event.target.value })} /></label>
                {benefit.type === 2 && <label className="grid gap-1 text-sm font-bold">Usos por periodo<Input type="number" min="1" value={benefit.usageLimit ?? ""} onChange={(event) => updateBenefit(index, { usageLimit: Number(event.target.value) })} /></label>}
                {benefit.type === 3 && <><label className="grid gap-1 text-sm font-bold">Descuento %<Input type="number" min="0.01" max="100" step="0.01" value={benefit.discountPercent ?? ""} onChange={(event) => updateBenefit(index, { discountPercent: Number(event.target.value) })} /></label><label className="grid gap-1 text-sm font-bold">Compra mínima<Input type="number" min="0" step="0.01" value={benefit.minimumPurchase ?? ""} onChange={(event) => updateBenefit(index, { minimumPurchase: event.target.value ? Number(event.target.value) : null })} /></label></>}
              </div>
              <Button type="button" variant="ghost" className="mt-2 text-slate-500" onClick={() => setDraft((current) => ({ ...current, benefits: current.benefits.filter((_, benefitIndex) => benefitIndex !== index) }))}>Eliminar beneficio</Button>
            </div>
          ))}
        </div>
        <Button type="button" className="mt-5 h-12 w-full bg-[#E11D48] font-extrabold hover:bg-[#BE123C]" disabled={savingPlan} onClick={() => void savePlan()}>{savingPlan && <LoaderCircle className="mr-2 size-5 animate-spin" />}{selectedPlan ? "Guardar nueva versión" : "Crear plan"}</Button>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={membershipDialogOpen} onOpenChange={setMembershipDialogOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-[#111827]/60 backdrop-blur-sm" />
          <Dialog.Popup className="subscription-dialog fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[min(720px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_30px_90px_rgba(17,24,39,0.30)] outline-none sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#E11D48]">
                  Alta de socio · {pendingPayment ? "Etapa 2 de 2" : "Etapa 1 de 2"}
                </span>
                <Dialog.Title className="mt-1 text-2xl font-extrabold text-[#111827]">
                  Registrar socio
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-sm font-medium leading-6 text-slate-600">
                  Selecciona o crea el cliente, elige su plan y sucursal; después confirma el pago.
                </Dialog.Description>
              </div>
              <Dialog.Close className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-rose-50 hover:text-[#E11D48]" aria-label="Cerrar alta de socio">
                <X size={18} />
              </Dialog.Close>
            </div>

        <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1" role="group" aria-label="Tipo de cliente">
          <button
            type="button"
            className={`min-h-10 rounded-lg px-3 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 ${customerMode === "new" ? "bg-white text-[#E11D48] shadow-sm" : "text-slate-600"}`}
            disabled={!subscriptionsEnabled}
            aria-pressed={customerMode === "new"}
            onClick={() => setCustomerMode("new")}
          >
            Nuevo socio
          </button>
          <button
            type="button"
            className={`min-h-10 rounded-lg px-3 text-sm font-extrabold transition ${customerMode === "existing" ? "bg-white text-[#E11D48] shadow-sm" : "text-slate-600"}`}
            aria-pressed={customerMode === "existing"}
            onClick={() => setCustomerMode("existing")}
          >
            Cliente existente
          </button>
        </div>

        {!subscriptionsEnabled && (
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
            Nuevo socio se habilitará cuando la API compatible esté publicada y se active la integración.
          </p>
        )}

        {customerMode === "new" && subscriptionsEnabled && (
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2 text-sm font-bold">
              Nombre completo
              <Input
                autoComplete="name"
                maxLength={100}
                value={newCustomerName}
                disabled={Boolean(createdCustomer)}
                onChange={(event) => {
                  setNewCustomerName(event.target.value);
                  setCustomerMatches([]);
                  setSelectedMatchCustomerId("");
                  setNewCustomerError("");
                }}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              WhatsApp
              <Input
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                maxLength={30}
                placeholder="+52 664 123 4567"
                value={newCustomerPhone}
                disabled={Boolean(createdCustomer)}
                onChange={(event) => {
                  setNewCustomerPhone(event.target.value);
                  setCustomerMatches([]);
                  setSelectedMatchCustomerId("");
                  setNewCustomerError("");
                }}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Correo <span className="font-medium text-slate-500">(opcional)</span>
              <Input
                type="email"
                autoComplete="email"
                maxLength={150}
                value={newCustomerEmail}
                disabled={Boolean(createdCustomer)}
                onChange={(event) => {
                  setNewCustomerEmail(event.target.value);
                  setCustomerMatches([]);
                  setSelectedMatchCustomerId("");
                  setNewCustomerError("");
                }}
              />
            </label>

            {createdCustomer && (
              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800" role="status">
                Cliente creado: {createdCustomer.fullName}. Si la membresía falla, puedes reintentar sin crear otro cliente.
              </div>
            )}

            {customerMatches.length > 0 && (
              <div className="grid gap-2">
                <p className="text-sm font-bold text-slate-700">Selecciona explícitamente la coincidencia:</p>
                {customerMatches.map((customer) => (
                  <button
                    key={customer.customerId}
                    type="button"
                    className={`rounded-xl border p-3 text-left text-sm ${selectedMatchCustomerId === customer.customerId ? "border-[#E11D48] bg-rose-50" : "border-slate-200 bg-white"}`}
                    onClick={() => {
                      setSelectedMatchCustomerId(customer.customerId);
                      setNewCustomerError("");
                    }}
                  >
                    <strong className="block">{customer.fullName}</strong>
                    <span className="text-slate-600">{customer.phone ?? customer.email ?? "Sin contacto visible"}</span>
                  </button>
                ))}
              </div>
            )}

            {newCustomerError && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900" role="alert">
                {newCustomerError}
              </p>
            )}
          </div>
        )}

        {customerMode === "existing" && (
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-600">
              Escribir el nombre no selecciona al cliente; busca y elige un resultado.
            </p>
            <label className="mt-4 grid gap-2 text-sm font-bold" htmlFor="subscription-customer-search">
              Buscar cliente
            </label>
            <div className="mt-2 flex gap-2">
              <Input
                id="subscription-customer-search"
                placeholder="Nombre, correo o teléfono"
                value={customerSearch}
                onChange={(event) => {
                  setCustomerSearch(event.target.value);
                  setCustomers([]);
                  setSelectedCustomerId("");
                  setCustomerSearchAttempted(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void searchCustomers();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                aria-label="Buscar cliente"
                disabled={searchingCustomers || customerSearch.trim().length < 2}
                onClick={() => void searchCustomers()}
              >
                {searchingCustomers ? <LoaderCircle className="size-5 animate-spin" /> : <Search className="size-5" />}
              </Button>
            </div>

            {customerSearchAttempted && customers.length === 0 && !searchingCustomers && (
              <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600" role="status">
                No encontramos clientes activos con esa búsqueda.
              </p>
            )}

            {customers.length > 0 && (
              <label className="mt-4 grid gap-2 text-sm font-bold">
                Cliente encontrado
                <select
                  className="h-12 rounded-xl border border-slate-300 bg-white px-3"
                  value={selectedCustomerId}
                  onChange={(event) => setSelectedCustomerId(event.target.value)}
                >
                  <option value="">Selecciona un cliente</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.fullName}{customer.email ? ` · ${customer.email}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}

        <label className="mt-4 grid gap-2 text-sm font-bold">
          Plan
          <select
            className="h-12 rounded-xl border border-slate-300 bg-white px-3"
            value={membershipPlanId}
            onChange={(event) => setMembershipPlanId(event.target.value)}
          >
            <option value="">Selecciona un plan</option>
            {plans.filter((plan) => plan.isActive).map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} · ${plan.currentVersion.price.toLocaleString("es-MX")}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 grid gap-2 text-sm font-bold">
          Sucursal
          <select
            className="h-12 rounded-xl border border-slate-300 bg-white px-3"
            value={activeLocation.locationId}
            disabled={activeLocation.changing || activeLocation.locations.length < 2}
            onChange={(event) => void activeLocation.selectLocation(event.target.value)}
          >
            <option value="">Selecciona una sucursal</option>
            {activeLocation.locations.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </label>

        <div className={`mt-5 rounded-xl px-3 py-2 text-sm font-semibold ${registrationMissing.length > 0 ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-800"}`} aria-live="polite">
          {registrationMissing.length > 0
            ? `Para continuar falta ${registrationMissing.join(", ")}.`
            : "Todo listo para registrar la venta de la membresía."}
        </div>

        <Button
          type="button"
          className="mt-4 h-12 w-full bg-[#E11D48] font-extrabold hover:bg-[#BE123C]"
          disabled={creatingCustomer || creatingMembership || registrationMissing.length > 0}
          onClick={() => void registerMembership()}
        >
          {creatingCustomer || creatingMembership ? <LoaderCircle className="mr-2 size-5 animate-spin" /> : <Users className="mr-2 size-5" />}
          {customerMode === "new" && !preparedNewCustomerId
            ? "Crear socio y registrar membresía"
            : "Registrar membresía"}
        </Button>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <FidaraConfirmDialog open={Boolean(pendingPayment)} onOpenChange={(open) => { if (!open && !confirmingPayment) setPendingPayment(null); }} title="Confirmar pago de membresía" description="Confirma únicamente después de recibir el pago. El precio y la vigencia fueron calculados por el servidor." confirmLabel="Confirmar pago y activar" busy={confirmingPayment} busyLabel="Confirmando…" confirmDisabled={paymentMethod !== 1 && !paymentReference.trim()} onConfirm={() => void confirmPayment()}>
        {pendingPayment && <div className="grid gap-4"><div className="rounded-2xl bg-slate-50 p-4"><small className="font-bold text-slate-500">Importe confirmado por servidor</small><strong className="block text-2xl">{pendingPayment.amount.toLocaleString("es-MX", { style: "currency", currency: pendingPayment.currency })}</strong></div><label className="grid gap-2 text-sm font-bold">Método<select className="h-12 rounded-xl border border-slate-300 bg-white px-3" value={paymentMethod} disabled={confirmingPayment} onChange={(event) => setPaymentMethod(Number(event.target.value) as 1 | 2 | 3)}><option value={1}>Efectivo</option><option value={2}>Tarjeta</option><option value={3}>Transferencia</option></select></label>{paymentMethod !== 1 && <label className="grid gap-2 text-sm font-bold">Referencia<Input value={paymentReference} disabled={confirmingPayment} onChange={(event) => setPaymentReference(event.target.value)} /></label>}<label className="grid gap-2 text-sm font-bold">Nota de evidencia (opcional)<Input value={evidenceNote} disabled={confirmingPayment} onChange={(event) => setEvidenceNote(event.target.value)} /></label><p className="flex items-center gap-2 text-sm font-semibold text-slate-600"><Check className="size-4 text-[#E11D48]" />La membresía conserva la misma tarjeta y QR al renovarse.</p></div>}
      </FidaraConfirmDialog>
    </section>
  );
}
