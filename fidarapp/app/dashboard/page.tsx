"use client";



import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { formatShortDateTime } from "@/components/lib/date-time";
import {
  complementaryPaymentMethodLabel,
  type GiftCardComplementaryPaymentStatus,
} from "@/lib/gift-card-complementary-payment";



import Link from "next/link";

import { useRouter } from "next/navigation";

import {

  ArrowRight,

  Banknote,

  ChartNoAxesColumnIncreasing,

  CircleDollarSign,

  Coins,

  CreditCard,

  Gift,

  LoaderCircle,

  QrCode,

  RefreshCw,

  Stamp,

  TrendingUp,

  Users,

  WalletCards,

  TicketPercent,

} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import { useCallback, useEffect, useState } from "react";



type MovementType =

  | "StampAdded"

  | "PointsAdded"

  | "CashbackPurchase"

  | "CashbackRedeemed"

  | "CouponRedeemed"

  | "RewardRedeemed"

  | "GiftCardSale"

  | "GiftCardRedeemed"

  | "Unknown";



type RecentTransaction = {

  id: string;

  operationId?: string | null;

  transactionType: number;

  programType: number;

  type: MovementType;

  customerName: string;

  programName: string;

  rewardName?: string | null;

  recipientName: string | null;

  amount: number;

  grossPurchaseAmount: number;

  paidAmount: number;

  cashbackApplied: number;

  cashbackGenerated: number;

  discountApplied: number;

  chargedAmount: number | null;

  purchaseAmount: number | null;

  giftCardAppliedAmount: number | null;

  remainingToPay: number | null;

  remainingBalance: number | null;

  complementaryPaymentStatus?: GiftCardComplementaryPaymentStatus | null;

  complementaryPaymentMethod?: number | null;

  complementaryPaymentReference?: string | null;

  complementaryPaymentDueAmount?: number | null;

  complementaryPaymentCollectedAmount?: number | null;

  complementaryPaymentPendingAmount?: number | null;

  complementaryPaymentUnverifiedAmount?: number | null;

  balanceBefore: number;

  balanceAfter: number;

  createdAtUtc: string;

};



type PeriodMetrics = {

  operations: number;

  customers: number;

  grossSales: number;

  netSales: number;

  stampsAdded: number;

  pointsAdded: number;

  cashbackGenerated: number;

  cashbackUsed: number;

  rewardsRedeemed: number;

};



type DailyActivity = {

  date: string;

  operations: number;

  customers: number;

  grossSales: number;

  netSales: number;

  rewardsRedeemed: number;

  cashbackGenerated: number;

  cashbackUsed: number;

};



type DashboardSummary = {

  organizationName: string;

  date: string;

  installedCards: number;



  installedCardsByPlatform: {

    apple: number;

    google: number;

  };



  today: PeriodMetrics;

  month: PeriodMetrics;

  lastSevenDays: DailyActivity[];

  recentTransactions: RecentTransaction[];

};



type ApiResponse<T> = {

  success?: boolean;

  message?: string;

  data?: T;

};



type Period = "today" | "month";



type ChartMetric = "netSales" | "operations" | "customers";



function formatCurrency(value: number) {

  return new Intl.NumberFormat("es-MX", {

    style: "currency",

    currency: "MXN",

    minimumFractionDigits: 0,

    maximumFractionDigits: 2,

  }).format(value);

}



function formatNullableCurrency(value: number | null) {

  return value === null ? "—" : formatCurrency(value);

}



function formatNumber(value: number) {

  return new Intl.NumberFormat("es-MX", {

    maximumFractionDigits: 2,

  }).format(value);

}



function formatDay(date: string) {

  return new Intl.DateTimeFormat("es-MX", {

    weekday: "short",

  })

    .format(new Date(`${date}T12:00:00`))

    .replace(".", "")

    .slice(0, 3);

}



function formatChartValue(value: number, metric: ChartMetric) {

  if (metric === "netSales") {

    return formatCurrency(value);

  }



  return formatNumber(value);

}



function getMovementPresentation(movement: RecentTransaction): {

  title: string;

  description: string;

  value: string;

  icon: LucideIcon;

  iconClassName: string;

} {

  switch (movement.type) {

    case "StampAdded":

      return {

        title: "Sello agregado",

        description: movement.programName,

        value: `+${formatNumber(movement.amount)}`,

        icon: Stamp,

        iconClassName: "bg-rose-50 text-[#E11D48]",

      };



    case "PointsAdded":

      return {

        title: "Puntos agregados",

        description: movement.programName,

        value: `+${formatNumber(movement.amount)}`,

        icon: Coins,

        iconClassName: "bg-amber-50 text-amber-700",

      };



    case "CashbackPurchase":

      return {

        title: "Compra con cashback",

        description: movement.programName,

        value: formatCurrency(movement.grossPurchaseAmount),

        icon: Banknote,

        iconClassName: "bg-emerald-50 text-emerald-700",

      };



    case "CashbackRedeemed":

      return {

        title: "Cashback utilizado",

        description: movement.programName,

        value: formatCurrency(Math.abs(movement.amount)),

        icon: CircleDollarSign,

        iconClassName: "bg-emerald-50 text-emerald-700",

      };



	    case "CouponRedeemed":

	      return {

	        title: "Cupón canjeado",

	        description: movement.programName,

	        value: formatCurrency(movement.paidAmount),

	        icon: TicketPercent,

	        iconClassName: "bg-amber-50 text-amber-700",

	      };



    case "RewardRedeemed":

      return {

        title: "Recompensa canjeada",

        description: movement.rewardName ?? movement.programName,

        value: "Canje",

        icon: Gift,

        iconClassName: "bg-violet-50 text-violet-700",

      };



    case "GiftCardSale":

      return {

        title: "Gift Card vendida",

        description: movement.programName,

        value: formatNullableCurrency(movement.chargedAmount),

        icon: Gift,

        iconClassName: "bg-violet-50 text-violet-700",

      };



    case "GiftCardRedeemed":

      return {

        title: "Gift Card canjeada",

        description: movement.programName,

        value: formatNullableCurrency(movement.purchaseAmount),

        icon: WalletCards,

        iconClassName: "bg-rose-50 text-[#E11D48]",

      };



    default:

      return {

        title: "Movimiento registrado",

        description: movement.programName,

        value: formatNumber(movement.amount),

        icon: TrendingUp,

        iconClassName: "bg-[#F3F4F6] text-[#6B7280]",

      };

  }

}



const dashboardMainClass = "min-h-full px-5 py-8 text-black sm:px-8 lg:px-[46px] lg:pb-12";

export default function DashboardPage() {

  const router = useRouter();



  const [summary, setSummary] = useState<DashboardSummary | null>(null);



  const [period, setPeriod] = useState<Period>("today");



  const [chartMetric, setChartMetric] = useState<ChartMetric>("netSales");



  const [loading, setLoading] = useState(true);



  const [error, setError] = useState("");



  const loadDashboard = useCallback(async () => {

    try {

      const response = await fetch("/api/dashboard/summary", {

        cache: "no-store",

      });



      const payload = (await response.json()) as ApiResponse<DashboardSummary>;



      if (response.status === 401) {

        router.replace("/login");

        return;

      }



      if (!response.ok || !payload.success || !payload.data) {

        throw new Error(

          payload.message ?? "No fue posible cargar el dashboard.",

        );

      }



      setSummary(payload.data);

    } catch (caught) {

      setError(

        caught instanceof Error

          ? caught.message

          : "No fue posible cargar el dashboard.",

      );

    } finally {

      setLoading(false);

    }

  }, [router]);



  useEffect(() => {

    void Promise.resolve().then(loadDashboard);

  }, [loadDashboard]);



  function reloadDashboard() {
    setLoading(true);
    setError("");
    void loadDashboard();
  }

  const errorNotice = error && (
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between">

      <span className="font-bold">{error}</span>



      <button

        type="button"

        onClick={reloadDashboard}

        className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-extrabold"

      >

        Intentar nuevamente

      </button>

    </div>
  );

  if (!summary) {
    return (
      <main className={dashboardMainClass}>
        <div className="mx-auto max-w-[1560px]">
          {loading ? <DashboardSkeleton /> : errorNotice}
        </div>
      </main>
    );
  }

  const metrics = summary[period];



  const periodLabel =

    period === "today" ? "durante el día" : "durante este mes";



  const metricCards = [

    {

      label: "Operaciones",

      value: formatNumber(metrics.operations),

      note: `Movimientos ${periodLabel}`,

      icon: TrendingUp,

      iconClassName: "bg-rose-50 text-[#E11D48]",

    },

    {

      label: "Clientes atendidos",

      value: formatNumber(metrics.customers),

      note: `Clientes distintos ${periodLabel}`,

      icon: Users,

      iconClassName: "bg-sky-50 text-sky-700",

    },

    {

      label: "Ventas registradas",

      value: formatCurrency(metrics.netSales ?? metrics.grossSales),

      note: "Importe después de descuentos",

      icon: Banknote,

      iconClassName: "bg-emerald-50 text-emerald-700",

    },

    {

      label: "Recompensas canjeadas",

      value: formatNumber(metrics.rewardsRedeemed),

      note:

        metrics.cashbackUsed > 0

          ? `${formatCurrency(metrics.cashbackUsed)} de cashback utilizado`

          : "Canjes realizados en el periodo",

      icon: Gift,

      iconClassName: "bg-violet-50 text-violet-700",

    },

  ];



  const chartValues = summary.lastSevenDays.map((item) => {

    const value =

      chartMetric === "netSales"

        ? item.netSales ?? item.grossSales

        : chartMetric === "operations"

          ? item.operations

          : item.customers;



    return {

      ...item,

      value,

    };

  });



  const maximumChartValue = Math.max(

    ...chartValues.map((item) => item.value),

    1,

  );



  const applePercentage =

    summary.installedCards > 0

      ? Math.round(

          (summary.installedCardsByPlatform.apple / summary.installedCards) *

            100,

        )

      : 0;



  const googlePercentage =

    summary.installedCards > 0

      ? Math.round(

          (summary.installedCardsByPlatform.google / summary.installedCards) *

            100,

        )

      : 0;



  return (

    <main className={dashboardMainClass}>

      <div className="mx-auto max-w-[1560px]">

        <section className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#E11D48]">

              Resumen del negocio

            </span>



            <h1 className="mt-3 text-[34px] font-extrabold tracking-[-0.045em] text-black sm:text-5xl">

              Tu negocio, en movimiento.

            </h1>



            <p className="mt-2 text-sm text-[#6B7280]">

              Actividad de{" "}

              <strong className="text-black">

                {summary.organizationName ?? "tu negocio"}

              </strong>

              .

            </p>

          </div>



          <div className="flex flex-col gap-3 sm:flex-row">


            <Link

              href="/dashboard/escanear"

              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-5 text-sm font-extrabold text-white shadow-lg shadow-[#E11D48]/20 transition hover:-translate-y-0.5 hover:bg-[#BE123C]"

            >

              <QrCode size={20} />

              Escanear tarjeta

            </Link>

          </div>

        </section>



        {errorNotice}



        <div className="mb-5 flex w-fit rounded-xl bg-[#F3F4F6] p-1">

          <button

            type="button"

            onClick={() => setPeriod("today")}

            className={`rounded-lg px-5 py-2.5 text-xs font-extrabold transition ${

              period === "today"

                ? "bg-black text-white shadow-sm"

                : "text-[#6B7280] hover:text-black"

            }`}

          >

            Hoy

          </button>



          <button

            type="button"

            onClick={() => setPeriod("month")}

            className={`rounded-lg px-5 py-2.5 text-xs font-extrabold transition ${

              period === "month"

                ? "bg-black text-white shadow-sm"

                : "text-[#6B7280] hover:text-black"

            }`}

          >

            Este mes

          </button>

        </div>



        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {metricCards.map((metric) => {

            const Icon = metric.icon;



            return (

              <article

                key={metric.label}

                className="rounded-[20px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.035)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_35px_rgba(0,0,0,0.06)]"

              >

                <div className="flex items-start justify-between gap-4">

                  <span

                    className={`grid h-11 w-11 place-items-center rounded-2xl ${metric.iconClassName}`}

                  >

                    <Icon size={20} />

                  </span>



                  <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#6B7280]">

                    {period === "today" ? "Hoy" : "Mes"}

                  </span>

                </div>



                <p className="mt-5 text-xs font-bold text-[#6B7280]">

                  {metric.label}

                </p>



                <strong className="mt-1 block text-[28px] font-extrabold tracking-[-0.04em] text-black">

                  {metric.value}

                </strong>



                <small className="mt-2 block text-[11px] leading-5 text-[#6B7280]">

                  {metric.note}

                </small>

              </article>

            );

          })}

        </section>



        <section className="my-5 grid gap-5 rounded-[22px] bg-black p-5 text-white sm:p-6 lg:grid-cols-[1.1fr_repeat(4,0.7fr)] lg:items-center">

          <div>

            <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#FB7185]">

              Lealtad generada

            </span>



            <h2 className="mt-2 text-xl font-extrabold tracking-[-0.025em]">

              Actividad del {period === "today" ? "día" : "mes"}

            </h2>



            <p className="mt-1 text-xs leading-5 text-white/55">

              Beneficios entregados a tus clientes.

            </p>

          </div>



          <LoyaltyMetric

            label="Sellos"

            value={formatNumber(metrics.stampsAdded)}

            icon={Stamp}

            color="text-[#FB7185]"

          />



          <LoyaltyMetric

            label="Puntos"

            value={formatNumber(metrics.pointsAdded)}

            icon={Coins}

            color="text-amber-400"

          />



          <LoyaltyMetric

            label="Cashback generado"

            value={formatCurrency(metrics.cashbackGenerated)}

            icon={CircleDollarSign}

            color="text-emerald-400"

          />



          <LoyaltyMetric

            label="Cashback utilizado"

            value={formatCurrency(metrics.cashbackUsed)}

            icon={WalletCards}

            color="text-sky-400"

          />

        </section>



        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(310px,0.5fr)]">

          <article className="rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.035)] sm:p-6">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

              <div>

                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#E11D48]">

                  Tendencia semanal

                </span>



                <h2 className="mt-2 text-xl font-extrabold tracking-[-0.025em] text-black">

                  Últimos siete días

                </h2>



                <p className="mt-1 text-xs text-[#6B7280]">

                  Comparación diaria de la actividad.

                </p>

              </div>



              <div className="flex flex-wrap gap-1 rounded-xl bg-[#F3F4F6] p-1">

                <ChartButton

                  active={chartMetric === "netSales"}

                  onClick={() => setChartMetric("netSales")}

                >

                  Ventas

                </ChartButton>



                <ChartButton

                  active={chartMetric === "operations"}

                  onClick={() => setChartMetric("operations")}

                >

                  Operaciones

                </ChartButton>



                <ChartButton

                  active={chartMetric === "customers"}

                  onClick={() => setChartMetric("customers")}

                >

                  Clientes

                </ChartButton>

              </div>

            </div>



            <div className="mt-8 grid h-[245px] grid-cols-7 gap-2 sm:gap-4">

              {chartValues.map((item) => {

                const percentage =

                  item.value > 0

                    ? Math.max((item.value / maximumChartValue) * 100, 6)

                    : 0;



                return (

                  <div

                    key={item.date}

                    className="flex min-w-0 flex-col items-center"

                  >

                    <div className="flex h-[180px] w-full items-end justify-center">

                      <div

                        title={formatChartValue(item.value, chartMetric)}

                        className="relative w-full max-w-[52px] rounded-t-xl bg-[#E11D48] transition-[height] duration-700 ease-out hover:bg-[#BE123C]"

                        style={{

                          height: `${percentage}%`,

                        }}

                      >

                        {item.value > 0 && (

                          <span className="absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-[9px] font-extrabold text-black sm:block">

                            {chartMetric === "netSales"

                              ? `$${Math.round(item.value).toLocaleString(

                                  "es-MX",

                                )}`

                              : formatNumber(item.value)}

                          </span>

                        )}

                      </div>

                    </div>



                    <span className="mt-3 text-[10px] font-extrabold uppercase text-[#6B7280]">

                      {formatDay(item.date)}

                    </span>



                    <small className="mt-1 text-[9px] text-[#9CA3AF]">

                      {item.operations} op.

                    </small>

                  </div>

                );

              })}

            </div>

          </article>



          <aside className="rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.035)] sm:p-6">

            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-50 text-[#E11D48]">

              <CreditCard size={21} />

            </span>



            <span className="mt-5 block text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#E11D48]">

              Wallet

            </span>



            <h2 className="mt-2 text-xl font-extrabold tracking-[-0.025em] text-black">

              Tarjetas instaladas

            </h2>



            <strong className="mt-5 block text-[40px] font-extrabold tracking-[-0.05em] text-black">

              {summary.installedCards}

            </strong>



            <p className="text-xs text-[#6B7280]">

              Clientes con Fidara en su teléfono.

            </p>



            <div className="mt-7 space-y-5">

              <WalletPlatform

                label="Apple Wallet"

                value={summary.installedCardsByPlatform.apple}

                percentage={applePercentage}

              />



              <WalletPlatform

                label="Google Wallet"

                value={summary.installedCardsByPlatform.google}

                percentage={googlePercentage}

              />

            </div>



            <Link

              href="/dashboard/clientes"

              className="mt-7 inline-flex items-center gap-2 text-xs font-extrabold text-[#E11D48] hover:underline hover:underline-offset-4"

            >

              Ver todos los clientes

              <ArrowRight size={15} />

            </Link>

          </aside>

        </section>



        <section className="mt-5 rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.035)] sm:p-6">

          <div className="flex items-start justify-between gap-4">

            <div>

              <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#E11D48]">

                Actividad

              </span>



              <h2 className="mt-2 text-xl font-extrabold tracking-[-0.025em] text-black">

                Movimientos recientes

              </h2>



              <p className="mt-1 text-xs text-[#6B7280]">

                Operaciones recientes de todos tus programas.

              </p>

            </div>



            <ChartNoAxesColumnIncreasing className="text-[#D1D5DB]" size={24} />

          </div>



          {summary.recentTransactions.length === 0 ? (

            <div className="mt-6 flex flex-col items-center border-t border-dashed border-[#D1D5DB] py-10 text-center">

              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-[#E11D48]">

                <TrendingUp size={22} />

              </span>



              <h3 className="mt-4 text-sm font-extrabold text-black">

                Aún no hay movimientos

              </h3>



              <p className="mt-1 max-w-sm text-xs leading-5 text-[#6B7280]">

                Las compras, sellos, puntos y canjes aparecerán aquí.

              </p>



              <Link

                href="/dashboard/escanear"

                className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold text-[#E11D48]"

              >

                Realizar primera operación

                <ArrowRight size={15} />

              </Link>

            </div>

          ) : (

            <div className="mt-6 divide-y divide-[#E5E7EB] border-t border-[#E5E7EB]">

              {summary.recentTransactions.map((movement) => (

                <MovementRow

                  key={movement.operationId ?? movement.id}

                  movement={movement}

                />

              ))}

            </div>

          )}

        </section>

      </div>

    </main>

  );

}



function LoyaltyMetric({

  label,

  value,

  icon: Icon,

  color,

}: {

  label: string;

  value: string;

  icon: LucideIcon;

  color: string;

}) {

  return (

    <div className="border-t border-white/10 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">

      <Icon className={color} size={18} />



      <strong className="mt-3 block text-xl font-extrabold tracking-[-0.03em]">

        {value}

      </strong>



      <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-white/45">

        {label}

      </span>

    </div>

  );

}



function ChartButton({

  active,

  onClick,

  children,

}: {

  active: boolean;

  onClick: () => void;

  children: React.ReactNode;

}) {

  return (

    <button

      type="button"

      onClick={onClick}

      className={`rounded-lg px-3 py-2 text-[10px] font-extrabold transition ${

        active

          ? "bg-black text-white shadow-sm"

          : "text-[#6B7280] hover:text-black"

      }`}

    >

      {children}

    </button>

  );

}



function WalletPlatform({

  label,

  value,

  percentage,

}: {

  label: string;

  value: number;

  percentage: number;

}) {

  return (

    <div>

      <div className="flex items-center justify-between gap-4">

        <span className="text-xs font-bold text-[#6B7280]">{label}</span>



        <strong className="text-sm text-black">{value}</strong>

      </div>



      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#F3F4F6]">

        <div

          className="h-full rounded-full bg-[#E11D48] transition-[width] duration-700"

          style={{

            width: `${percentage}%`,

          }}

        />

      </div>



      <span className="mt-1 block text-right text-[9px] font-bold text-[#9CA3AF]">

        {percentage}%

      </span>

    </div>

  );

}



function MovementRow({ movement }: { movement: RecentTransaction }) {

  const presentation = getMovementPresentation(movement);



  const Icon = presentation.icon;



  const isCashbackPurchase = movement.type === "CashbackPurchase";

  const isCouponRedemption = movement.type === "CouponRedeemed";

  const isGiftCardRedemption = movement.type === "GiftCardRedeemed";

  const complementaryMethod = complementaryPaymentMethodLabel(

    movement.complementaryPaymentMethod,

  );

  const displayName =

    movement.type === "GiftCardSale" || isGiftCardRedemption

      ? movement.recipientName ?? movement.customerName

      : movement.customerName;



  return (

    <div className="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">

      <div className="flex min-w-0 items-start gap-3">

        <span

          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${presentation.iconClassName}`}

        >

          <Icon size={19} />

        </span>



        <div className="min-w-0">

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">

            <strong className="truncate text-sm font-extrabold text-black">

              {displayName}

            </strong>



            <span className="text-xs text-[#9CA3AF]">·</span>



            <span className="text-xs font-bold text-[#6B7280]">

              {presentation.title}

            </span>

          </div>



          <p className="mt-1 text-xs text-[#6B7280]">

            {presentation.description}

          </p>



          {isCashbackPurchase && (

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold">

              <span className="text-[#6B7280]">

                Pagó{" "}

                <strong className="text-black">

                  {formatCurrency(movement.paidAmount)}

                </strong>

              </span>



              {movement.cashbackApplied > 0 && (

                <span className="text-emerald-700">

                  Usó {formatCurrency(movement.cashbackApplied)}

                </span>

              )}



              {movement.cashbackGenerated > 0 && (

                <span className="text-[#E11D48]">

                  Obtuvo {formatCurrency(movement.cashbackGenerated)}

                </span>

              )}

            </div>

          )}



	          {isCouponRedemption && (

	            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold">

	              <span className="text-[#6B7280]">

	                Pagó{" "}

	                <strong className="text-black">

	                  {formatCurrency(movement.paidAmount)}

	                </strong>

	              </span>



	              {movement.discountApplied > 0 && (

	                <span className="text-amber-700">

	                  Descuento {formatCurrency(movement.discountApplied)}

	                </span>

	              )}

	            </div>

	          )}



          {isGiftCardRedemption && (

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold">

              <span className="text-violet-700">

                Aplicado{" "}

                {formatNullableCurrency(movement.giftCardAppliedAmount)}

              </span>



              {movement.complementaryPaymentStatus === 2 ? (

                <span className="text-emerald-700">

                  Cobro complementario confirmado{" "}

                  {formatNullableCurrency(

                    movement.complementaryPaymentCollectedAmount ?? null,

                  )}

                  {complementaryMethod ? ` · ${complementaryMethod}` : ""}

                  {movement.complementaryPaymentReference

                    ? ` · Ref. ${movement.complementaryPaymentReference}`

                    : ""}

                </span>

              ) : movement.complementaryPaymentStatus === 1 ? (

                <span className="text-[#6B7280]">

                  Cobro complementario no requerido

                </span>

              ) : movement.complementaryPaymentStatus === 0 ? (

                <span className="text-amber-700">

                  Cobro complementario no verificado{" "}

                  {formatNullableCurrency(

                    movement.complementaryPaymentUnverifiedAmount ?? null,

                  )}

                </span>

              ) : (

                <span className="text-[#6B7280]">

                  Diferencia{" "}

                  <strong className="text-black">

                    {formatNullableCurrency(movement.remainingToPay)}

                  </strong>

                </span>

              )}

            </div>

          )}

        </div>

      </div>



      <div className="flex items-end justify-between gap-4 pl-14 sm:block sm:pl-0 sm:text-right">

        <strong className="text-sm font-extrabold text-black">

          {presentation.value}

        </strong>



        <time

          dateTime={movement.createdAtUtc}

          className="block text-[10px] text-[#9CA3AF]"

        >

          {formatShortDateTime(movement.createdAtUtc)}

        </time>

      </div>

    </div>

  );

}
