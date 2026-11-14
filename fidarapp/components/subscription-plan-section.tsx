"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Crown,
  ExternalLink,
  LoaderCircle,
  MessageCircle,
  ReceiptText,
} from "lucide-react";

type BillingCycle = "monthly" | "quarterly" | "annual";

type SubscriptionAccess = {
  planCode: string;
  planName: string;
  effectiveStatus: string;
  billingCycle: number;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  isPremiumActive: boolean;
  isReadOnly: boolean;
  startsAt: string | null;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  trialDaysRemaining: number;
  maxLocations: number | null;
  maxUsers: number | null;
  maxPrograms: number | null;
};

type PremiumPlan = {
  planId: number;
  code: string;
  name: string;
  monthlyPrice: number;
  quarterlyPrice: number;
  annualPrice: number;
};

type SubscriptionPayment = {
  id: string;
  amount: number;
  currency: string;
  status: number;
  statusName: string;
  billingCycle: number;
  billingCycleName: string;
  periodStartsAt: string;
  periodEndsAt: string;
  paidAt: string | null;
  paymentMethod: string | null;
  createdAt: string;
};

type SubscriptionOverview = {
  access: SubscriptionAccess;
  premiumPlan: PremiumPlan | null;
  premiumSubscribedAt: string | null;
  totalPaid: number;
  coveredMonths: number;
  whatsAppNumber: string;
  whatsAppUrl: string;
  payments: SubscriptionPayment[];
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "No disponible";

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function SubscriptionPlanSection() {
  const [overview, setOverview] =
    useState<SubscriptionOverview | null>(null);

  const [selectedCycle, setSelectedCycle] =
    useState<BillingCycle>("quarterly");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadSubscription();
  }, []);

  async function loadSubscription() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/subscription/overview",
        {
          cache: "no-store",
        },
      );

      const payload = (await response
        .json()
        .catch(() => ({}))) as ApiResponse<SubscriptionOverview>;

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(
          payload.message ??
            "No fue posible cargar la información del plan.",
        );
      }

      setOverview(payload.data);

      if (payload.data.access.billingCycle === 1) {
        setSelectedCycle("monthly");
      }

      if (payload.data.access.billingCycle === 2) {
        setSelectedCycle("quarterly");
      }

      if (payload.data.access.billingCycle === 3) {
        setSelectedCycle("annual");
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible cargar la información del plan.",
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedOption = useMemo(() => {
    if (!overview?.premiumPlan) return null;

    const plan = overview.premiumPlan;

    const options = {
      monthly: {
        label: "Mensual",
        price: plan.monthlyPrice,
        months: 1,
        saving: null,
      },
      quarterly: {
        label: "Trimestral",
        price: plan.quarterlyPrice,
        months: 3,
        saving: "Ahorra 10%",
      },
      annual: {
        label: "Anual",
        price: plan.annualPrice,
        months: 12,
        saving: "Ahorra 16.7%",
      },
    };

    return options[selectedCycle];
  }, [overview, selectedCycle]);

  const whatsAppUrl = useMemo(() => {
    if (
      !overview ||
      !selectedOption ||
      !overview.whatsAppNumber
    ) {
      return "#";
    }

    const message = [
      "Hola, quiero contratar Fidara Premium.",
      `Paquete: ${selectedOption.label}.`,
      `Precio: ${formatCurrency(selectedOption.price)} MXN.`,
      "¿Me pueden compartir los datos para realizar la transferencia?",
    ].join(" ");

    return `https://wa.me/${overview.whatsAppNumber}?text=${encodeURIComponent(
      message,
    )}`;
  }, [overview, selectedOption]);

  if (loading) {
    return (
      <section
        id="plan"
        className="mb-5 grid min-h-52 place-items-center rounded-[22px] border border-[#E5E7EB] bg-white p-6"
      >
        <div className="flex items-center gap-3 text-sm font-bold text-[#6B7280]">
          <LoaderCircle
            className="animate-spin text-[#E11D48]"
            size={21}
          />
          Cargando plan y facturación...
        </div>
      </section>
    );
  }

  if (error || !overview) {
    return (
      <section
        id="plan"
        className="mb-5 flex flex-col gap-4 rounded-[22px] border border-rose-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="text-[#E11D48]" size={20} />

          <div>
            <strong className="block text-sm font-extrabold text-black">
              No pudimos cargar tu plan
            </strong>
            <span className="text-xs text-[#6B7280]">
              {error}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadSubscription()}
          className="rounded-xl border border-[#E5E7EB] px-4 py-2 text-xs font-extrabold text-black transition hover:bg-[#F3F4F6]"
        >
          Intentar nuevamente
        </button>
      </section>
    );
  }

  const { access, premiumPlan, payments } = overview;

  const statusTitle = access.isPremiumActive
    ? "Fidara Premium"
    : access.isTrialExpired
      ? "Tu prueba terminó"
      : "Prueba gratuita";

  const statusDescription = access.isPremiumActive
    ? `Tu plan está activo hasta el ${formatDate(
        access.currentPeriodEndsAt,
      )}.`
    : access.isTrialExpired
      ? "Puedes consultar tu información, pero las acciones están temporalmente bloqueadas."
      : `Te quedan ${access.trialDaysRemaining} días para explorar todas las herramientas.`;

  return (
    <section
      id="plan"
      className="mb-5 overflow-hidden rounded-[22px] border border-[#E5E7EB] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.045)]"
    >
      <div className="border-b border-[#E5E7EB] bg-[linear-gradient(120deg,#fff1f4_0%,#ffffff_55%)] p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#E11D48] text-white shadow-lg shadow-[#E11D48]/20">
              <Crown size={22} />
            </span>

            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#E11D48]">
                Plan y facturación
              </span>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-extrabold tracking-[-0.035em] text-black">
                  {statusTitle}
                </h2>

                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${
                    access.isPremiumActive
                      ? "bg-black text-white"
                      : access.isTrialExpired
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {access.isPremiumActive
                    ? "Activo"
                    : access.isTrialExpired
                      ? "Vencido"
                      : "En prueba"}
                </span>
              </div>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7280]">
                {statusDescription}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-[#E5E7EB] pt-5 lg:min-w-[330px] lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
            <PlanLimit
              label="Sucursales"
              value={access.maxLocations}
            />
            <PlanLimit
              label="Usuarios"
              value={access.maxUsers}
            />
            <PlanLimit
              label="Programas"
              value={access.maxPrograms}
            />
          </div>
        </div>
      </div>

      {access.isTrialExpired && (
        <div className="mx-5 mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 sm:mx-7">
          <AlertTriangle className="mt-0.5 shrink-0" size={19} />

          <div>
            <strong className="block text-sm font-extrabold">
              Tu espacio está en modo de consulta
            </strong>
            <p className="mt-1 text-xs leading-5">
              Conservamos tus clientes, programas y tarjetas. Activa
              Premium para volver a realizar cambios.
            </p>
          </div>
        </div>
      )}

      {premiumPlan && (
        <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#E11D48]">
                Activa todas las funciones
              </span>

              <h3 className="mt-2 text-xl font-extrabold tracking-[-0.025em] text-black">
                Elige cómo pagar Fidara Premium
              </h3>

              <p className="mt-1 text-sm text-[#6B7280]">
                El mismo plan Premium con diferentes periodos de
                facturación.
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <BillingOption
                active={selectedCycle === "monthly"}
                title="Mensual"
                price={premiumPlan.monthlyPrice}
                description="Cada mes"
                onClick={() => setSelectedCycle("monthly")}
              />

              <BillingOption
                active={selectedCycle === "quarterly"}
                title="Trimestral"
                price={premiumPlan.quarterlyPrice}
                description="Ahorra 10%"
                onClick={() => setSelectedCycle("quarterly")}
              />

              <BillingOption
                active={selectedCycle === "annual"}
                title="Anual"
                price={premiumPlan.annualPrice}
                description="Ahorra 16.7%"
                onClick={() => setSelectedCycle("annual")}
              />
            </div>

            <div className="mt-6 grid gap-3 border-t border-[#E5E7EB] pt-5 text-sm sm:grid-cols-2">
              <PremiumFeature text="Sucursales sin límite" />
              <PremiumFeature text="Usuarios sin límite" />
              <PremiumFeature text="Programas de lealtad sin límite" />
              <PremiumFeature text="Soporte y activación personalizada" />
            </div>
          </div>

          {selectedOption && (
            <aside className="flex flex-col justify-between rounded-[20px] bg-black p-5 text-white sm:p-6">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#FB7185]">
                  Fidara Premium
                </span>

                <p className="mt-4 text-sm text-white/60">
                  Paquete {selectedOption.label.toLowerCase()}
                </p>

                <strong className="mt-1 block text-[32px] font-extrabold tracking-[-0.04em]">
                  {formatCurrency(selectedOption.price)}
                </strong>

                <span className="text-xs font-semibold text-white/50">
                  MXN por {selectedOption.months}{" "}
                  {selectedOption.months === 1 ? "mes" : "meses"}
                </span>

                {selectedOption.saving && (
                  <span className="mt-4 inline-flex rounded-full bg-[#E11D48] px-3 py-1.5 text-[11px] font-extrabold">
                    {selectedOption.saving}
                  </span>
                )}
              </div>

              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#BE123C]"
              >
                <MessageCircle size={18} />
                Solicitar por WhatsApp
                <ExternalLink size={15} />
              </a>
            </aside>
          )}
        </div>
      )}

      <div className="border-t border-[#E5E7EB] px-5 py-6 sm:px-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#E11D48]">
              Historial
            </span>
            <h3 className="mt-2 text-lg font-extrabold text-black">
              Pagos y periodos
            </h3>
          </div>

          <div className="flex gap-6 text-sm">
            <div>
              <span className="block text-xs text-[#6B7280]">
                Total pagado
              </span>
              <strong className="text-black">
                {formatCurrency(overview.totalPaid)}
              </strong>
            </div>

            <div>
              <span className="block text-xs text-[#6B7280]">
                Meses cubiertos
              </span>
              <strong className="text-black">
                {overview.coveredMonths}
              </strong>
            </div>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="mt-5 flex items-center gap-4 border-t border-dashed border-[#D1D5DB] py-6">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#F3F4F6] text-[#6B7280]">
              <ReceiptText size={20} />
            </span>

            <div>
              <strong className="block text-sm font-extrabold text-black">
                Aún no hay pagos registrados
              </strong>
              <p className="mt-1 text-xs text-[#6B7280]">
                Tus transferencias confirmadas aparecerán aquí.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-5 divide-y divide-[#E5E7EB] border-t border-[#E5E7EB]">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="grid gap-3 py-4 sm:grid-cols-[1fr_1fr_auto] sm:items-center"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                    <CheckCircle2 size={18} />
                  </span>

                  <div>
                    <strong className="block text-sm text-black">
                      Plan {payment.billingCycleName}
                    </strong>
                    <span className="text-xs text-[#6B7280]">
                      {payment.paymentMethod ?? "Transferencia"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                  <CalendarDays size={15} />
                  {formatDate(payment.periodStartsAt)}
                  {" — "}
                  {formatDate(payment.periodEndsAt)}
                </div>

                <div className="sm:text-right">
                  <strong className="block text-sm text-black">
                    {formatCurrency(payment.amount)}
                  </strong>
                  <span className="text-xs font-bold text-emerald-700">
                    {payment.statusName}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PlanLimit({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div>
      <strong className="block text-lg font-extrabold text-black">
        {value === null ? "∞" : value}
      </strong>
      <span className="text-[11px] font-semibold text-[#6B7280]">
        {label}
      </span>
    </div>
  );
}

function BillingOption({
  active,
  title,
  price,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  price: number;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[118px] rounded-2xl border p-4 text-left transition ${
        active
          ? "border-[#E11D48] bg-rose-50 shadow-[0_0_0_3px_rgba(225,29,72,0.08)]"
          : "border-[#E5E7EB] bg-white hover:border-[#E11D48]/40"
      }`}
    >
      <span className="text-sm font-extrabold text-black">
        {title}
      </span>

      <strong className="mt-3 block text-xl font-extrabold text-black">
        {formatCurrency(price)}
      </strong>

      <span
        className={`mt-1 block text-[11px] font-bold ${
          active ? "text-[#E11D48]" : "text-[#6B7280]"
        }`}
      >
        {description}
      </span>
    </button>
  );
}

function PremiumFeature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 font-semibold text-black">
      <CheckCircle2
        className="shrink-0 text-[#E11D48]"
        size={17}
      />
      {text}
    </div>
  );
}