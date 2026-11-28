"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Gift,
  RotateCcw,
  Search,
  Sparkles,
  Stamp,
  Users,
  WalletCards,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { GiftCardStatistics } from "@/components/gift-cards/gift-card-statistics";
import { SubscriptionStatistics } from "@/components/subscriptions/subscription-statistics";
import { readLocationSession } from "@/lib/active-location-client";
import { subscriptionsEnabled } from "@/lib/subscriptions";

type PeriodMetrics = {
  operations: number;
  purchaseOperations: number;
  customers: number;
  grossSales: number;
  averageTicket: number;
  stampsAdded: number;
  pointsAdded: number;
  cashbackGenerated: number;
  cashbackUsed: number;
  rewardsRedeemed: number;
  newCustomers: number;
  returningCustomers: number;
};

type DailyStatistics = {
  date: string;
  operations: number;
  customers: number;
  grossSales: number;
  averageTicket: number;
  rewardsRedeemed: number;
  cashbackGenerated: number;
  cashbackUsed: number;
};

type WeekdayStatistics = {
  dayNumber: number;
  day: string;
  operations: number;
  customers: number;
  grossSales: number;
  averageTicket: number;
};

type HourlyStatistics = {
  hour: number;
  label: string;
  operations: number;
  customers: number;
  grossSales: number;
};

type HeatmapPoint = {
  day: string;
  dayNumber: number;
  hour: number;
  operations: number;
  grossSales: number;
};

type TopCustomer = {
  customerId: string;
  customerName: string;
  operations: number;
  grossSales: number;
  rewardsRedeemed: number;
  lastActivityAt: string;
};

type LocationBreakdown = {
  locationId: string;
  locationName: string;
  operations: number;
  customers: number;
  grossSales: number;
  rewardsRedeemed: number;
};

type ProgramBreakdown = {
  programId: string;
  programName: string;
  programType: number;
  operations: number;
  customers: number;
  grossSales: number;
  rewardsRedeemed: number;
};

type RetentionMetrics = {
  activeCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  inactive15To29: number;
  inactive30To59: number;
  inactive60Plus: number;
  reactivatedCustomers: number;
};

type FilterOption = {
  id: string;
  name: string;
};

type ProgramOption = FilterOption & {
  programType: number;
};

type EmployeeOption = FilterOption & {
  role: number;
};

type StatisticsData = {
  organization: {
    name: string;
    currency: string;
    timeZone: string;
  };

  filters: {
    from: string;
    to: string;
    programId?: string | null;
    locationId?: string | null;
    employeeId?: string | null;
    programType?: number | null;
    programs: ProgramOption[];
    locations: FilterOption[];
    employees: EmployeeOption[];
  };

  current: PeriodMetrics;
  previous: PeriodMetrics;

  comparison: {
    grossSales?: number | null;
    operations?: number | null;
    customers?: number | null;
    averageTicket?: number | null;
  };

  wallet: {
    total: number;
    apple: number;
    google: number;
  };

  trend: DailyStatistics[];
  weekdayPerformance: WeekdayStatistics[];
  hourlyPerformance: HourlyStatistics[];
  activityHeatmap: HeatmapPoint[];

  bestDayByOperations?: WeekdayStatistics | null;
  bestDayBySales?: WeekdayStatistics | null;

  topCustomers: TopCustomer[];
  locationBreakdown?: LocationBreakdown[];
  programBreakdown?: ProgramBreakdown[];
  retention?: RetentionMetrics;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

const HEATMAP_DAYS = [
  [1, "Lun"],
  [2, "Mar"],
  [3, "Mié"],
  [4, "Jue"],
  [5, "Vie"],
  [6, "Sáb"],
  [7, "Dom"],
] as const;

function formatHeatmapHour(hour: number) {
  const displayHour = hour % 12 || 12;
  return `${displayHour}:00 ${hour < 12 ? "AM" : "PM"}`;
}

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getInitialPeriod() {
  const today = new Date();

  const start =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    );

  return {
    from: toInputDate(start),
    to: toInputDate(today),
  };
}

function getRelativePeriod(days: number) {
  const end = new Date();
  const start = new Date();

  start.setDate(end.getDate() - (days - 1));

  return {
    from: toInputDate(start),
    to: toInputDate(end),
  };
}

function formatCurrency(
  value: number,
  currency = "MXN",
) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(
    "es-MX",
  ).format(Number(value) || 0);
}

function formatPercentage(value: number) {
  return `${new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function programTypeLabel(programType: number) {
  return (
    {
      1: "Sellos",
      2: "Puntos",
      3: "Cashback",
      4: "Cupones",
    }[programType] ?? "Tipo no identificado"
  );
}

function formatShortDate(value: string) {
  const date = new Date(`${value}T12:00:00`);

  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function ComparisonBadge({
  value,
}: {
  value?: number | null;
}) {
  if (value === null || value === undefined) {
    return (
      <span className="text-[11px] font-bold text-[#6B7280]">
        Sin referencia
      </span>
    );
  }

  const positive = value >= 0;

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-extrabold",
        positive
          ? "bg-emerald-50 text-emerald-700"
          : "bg-rose-50 text-rose-700",
      ].join(" ")}
    >
      {positive ? (
        <ArrowUpRight size={13} />
      ) : (
        <ArrowDownRight size={13} />
      )}

      {positive ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

function StatisticsSkeleton() {
  return (
    <div
      className="min-w-0 space-y-6 motion-safe:animate-pulse motion-safe:[animation-duration:2s]"
      aria-label="Cargando estadísticas"
      role="status"
    >
      <div className="h-11 w-52 max-w-full rounded-xl bg-slate-200" />

      <section className="rounded-[20px] border border-[#E5E7EB] bg-white p-3 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="grid w-full shrink-0 grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 sm:w-auto">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-9 w-full rounded-lg bg-white sm:w-20" />
            ))}
          </div>
          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
            <div className="h-11 rounded-xl border border-slate-100 bg-slate-50" />
            <div className="h-11 rounded-xl border border-slate-100 bg-slate-50" />
          </div>
          <div className="h-10 w-full rounded-xl bg-slate-200 xl:w-40" />
        </div>
      </section>

      <section className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="min-h-44 rounded-[20px] border border-[#E5E7EB] bg-white p-5">
            <div className="h-11 w-11 rounded-2xl bg-slate-100" />
            <div className="mt-5 h-3 w-28 rounded bg-slate-100" />
            <div className="mt-3 h-8 w-36 rounded bg-slate-200" />
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-[#E5E7EB] bg-white px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-3 w-44 rounded bg-slate-100" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-8 w-24 rounded bg-slate-100" />
          <div className="h-8 w-24 rounded bg-slate-100" />
        </div>
      </section>

      <section className="rounded-[22px] border border-[#E5E7EB] bg-white p-5 sm:p-6">
        <div className="h-5 w-52 max-w-full rounded bg-slate-200" />
        <div className="mt-2 h-3 w-96 max-w-full rounded bg-slate-100" />
        <div className="mt-5 grid gap-5 border-y border-slate-100 py-5 sm:grid-cols-3 sm:gap-0">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className={index === 0 ? "sm:pr-6" : "sm:border-l sm:border-slate-100 sm:px-6"}>
              <div className="h-3 w-28 rounded bg-slate-100" />
              <div className={`mt-3 rounded bg-slate-200 ${index === 0 ? "h-12 w-32" : "h-10 w-24"}`} />
            </div>
          ))}
        </div>
        <div className="py-5">
          <div className="h-4 w-56 max-w-full rounded bg-slate-200" />
          <div className="mt-5 h-3 rounded-full bg-slate-100" />
        </div>
        <div className="grid gap-6 border-t border-slate-100 pt-5 lg:grid-cols-[minmax(180px,.7fr)_minmax(0,2fr)]">
          <div>
            <div className="h-3 w-32 rounded bg-slate-100" />
            <div className="mt-3 h-9 w-20 rounded bg-slate-200" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:border-l lg:border-slate-100 lg:pl-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index}>
                <div className="h-3 w-20 rounded bg-slate-100" />
                <div className="mt-3 h-7 w-16 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {Array.from({ length: 2 }).map((_, sectionIndex) => (
        <section
          key={sectionIndex}
          className="rounded-[22px] border border-[#E5E7EB] bg-white p-5 sm:p-6"
        >
          <div className="h-5 w-52 max-w-full rounded bg-slate-200" />
          <div className="mt-2 h-3 w-80 max-w-full rounded bg-slate-100" />
          <div className="mt-6 h-72 rounded-2xl bg-slate-100" />
          <div className="mt-4 grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, cardIndex) => (
              <div
                key={cardIndex}
                className="min-h-40 rounded-2xl border border-slate-100 p-4"
              >
                <div className="h-4 w-32 rounded bg-slate-200" />
                <div className="mt-5 h-6 w-28 rounded bg-slate-100" />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="h-8 rounded bg-slate-100" />
                  <div className="h-8 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,.7fr)]">
        <div className="h-[390px] rounded-[22px] border border-[#E5E7EB] bg-white p-6">
          <div className="h-5 w-48 rounded bg-slate-200" />
          <div className="mt-8 h-[290px] rounded-2xl bg-slate-100" />
        </div>
        <div className="h-[390px] rounded-[22px] bg-slate-200" />
      </section>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="grid h-full place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
      <div>
        <Activity className="mx-auto text-slate-300" size={28} />
        <p className="mt-3 text-sm font-bold text-slate-500">{message}</p>
      </div>
    </div>
  );
}

export default function StatisticsPage() {
  const initialPeriod =
    useMemo(() => getInitialPeriod(), []);

  const [from, setFrom] =
    useState(initialPeriod.from);

  const [to, setTo] =
    useState(initialPeriod.to);

  const [activeQuickPeriod, setActiveQuickPeriod] =
    useState<"7-days" | "30-days" | "month" | null>("month");

  const [advancedFiltersOpen, setAdvancedFiltersOpen] =
    useState(false);

  const [appliedPeriod, setAppliedPeriod] =
    useState(initialPeriod);

  const [programId, setProgramId] =
    useState("");

  const [locationId, setLocationId] =
    useState("");

  const [employeeId, setEmployeeId] =
    useState("");

  const [programType, setProgramType] =
    useState("");

  const [appliedFilters, setAppliedFilters] = useState({
    programId: "",
    programType: "",
    locationId: "",
    employeeId: "",
  });

  const [data, setData] =
    useState<StatisticsData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [operationalSession, setOperationalSession] =
    useState<boolean | null>(null);

  const loadStatistics = useCallback(
    async (showLoader = false) => {
      if (showLoader) setLoading(true);
      else setRefreshing(true);

      setError("");

      try {
        if (!from || !to) {
          throw new Error("Selecciona una fecha inicial y una fecha final.");
        }

        const startDate = new Date(`${from}T12:00:00`);
        const endDate = new Date(`${to}T12:00:00`);
        const periodDays =
          Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;

        if (periodDays < 1) {
          throw new Error("La fecha inicial no puede ser posterior a la fecha final.");
        }

        if (periodDays > 366) {
          throw new Error("El periodo máximo permitido es de 366 días.");
        }

        const search =
          new URLSearchParams();

        search.set("from", from);
        search.set("to", to);

        if (programId) {
          search.set("programId", programId);
        }

        if (operationalSession === false && locationId) {
          search.set(
            "locationId",
            locationId,
          );
        }

        if (operationalSession === false && employeeId) {
          search.set(
            "employeeId",
            employeeId,
          );
        }

        if (programType) {
          search.set(
            "programType",
            programType,
          );
        }

        const response = await fetch(
          `/api/statistics/overview?${search.toString()}`,
          {
            cache: "no-store",
          },
        );

        const payload =
          (await response
            .json()
            .catch(() => ({}))) as
            ApiEnvelope<StatisticsData>;

        if (response.status === 401) {
          sessionStorage.removeItem(
            "fidara_session",
          );

          window.location.replace("/login");
          return;
        }

        if (!response.ok || !payload.data) {
          throw new Error(
            payload.message ??
              "No fue posible cargar las estadísticas.",
          );
        }

        setData(payload.data);
        setAppliedPeriod({ from, to });
        setAppliedFilters({
          programId,
          programType,
          locationId: operationalSession === false ? locationId : "",
          employeeId: operationalSession === false ? employeeId : "",
        });
        setAdvancedFiltersOpen(false);
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : "No fue posible cargar las estadísticas.";

        setError(message);
        toast.error("No se pudieron cargar las estadísticas", {
          description: message,
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      employeeId,
      from,
      locationId,
      operationalSession,
      programId,
      programType,
      to,
    ],
  );

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const session = readLocationSession();
        const isAdministrator =
          session.roleId === 1 ||
          session.roleId === 2 ||
          session.role === 1 ||
          session.role === 2 ||
          session.role === "Owner" ||
          session.role === "Admin";

        setOperationalSession(!isAdministrator);
      } catch {
        setOperationalSession(true);
      }
    });
  }, []);

  useEffect(() => {
    // Carga inicial de las métricas existentes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStatistics(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function resetFilters() {
    const period = getInitialPeriod();

    setFrom(period.from);
    setTo(period.to);
    setProgramId("");
    setProgramType("");
    setLocationId("");
    setEmployeeId("");
    setActiveQuickPeriod("month");
  }

  const maximumHeat =
    useMemo(
      () =>
        Math.max(
          1,
          ...(data?.activityHeatmap.map(
            (point) => point.operations,
          ) ?? [1]),
        ),
      [data],
    );

  function getHeatValue(
    dayNumber: number,
    hour: number,
  ) {
    return (
      data?.activityHeatmap.find(
        (point) =>
          point.dayNumber === dayNumber &&
          point.hour === hour,
      )?.operations ?? 0
    );
  }

  const currency =
    data?.organization.currency || "MXN";

  const highlightedCustomer =
    data?.topCustomers[0];

  const hasActivity = Boolean(
    data &&
      (data.current.operations > 0 ||
        data.current.grossSales > 0 ||
        data.current.rewardsRedeemed > 0),
  );

  const hasLocationActivity = Boolean(
    data?.locationBreakdown?.some(
      (location) =>
        location.operations > 0 ||
        location.customers > 0 ||
        location.grossSales > 0 ||
        location.rewardsRedeemed > 0,
    ),
  );

  const hasProgramActivity = Boolean(
    data?.programBreakdown?.some(
      (program) =>
        program.operations > 0 ||
        program.customers > 0 ||
        program.grossSales > 0 ||
        program.rewardsRedeemed > 0,
    ),
  );

  const hasRetentionActivity = Boolean(
    data?.retention &&
      (data.retention.activeCustomers > 0 ||
        data.retention.newCustomers > 0 ||
        data.retention.returningCustomers > 0 ||
        data.retention.inactive15To29 > 0 ||
        data.retention.inactive30To59 > 0 ||
        data.retention.inactive60Plus > 0 ||
        data.retention.reactivatedCustomers > 0),
  );

  const retentionCompositionTotal = data?.retention
    ? data.retention.newCustomers + data.retention.returningCustomers
    : null;

  const newCustomerShare =
    data?.retention && retentionCompositionTotal
      ? (data.retention.newCustomers / retentionCompositionTotal) * 100
      : 0;

  const retentionCompositionMatchesActive = Boolean(
    data?.retention &&
      retentionCompositionTotal === data.retention.activeCustomers,
  );

  const hasHeatmapActivity = Boolean(
    data?.activityHeatmap.some((point) => point.operations > 0),
  );

  const metricCards = data
    ? [
        {
          label: "Ventas registradas",
          value: formatCurrency(
            data.current.grossSales,
            currency,
          ),
          note:
            "Importes capturados en Fidara",
          icon: CircleDollarSign,
          comparison:
            data.comparison.grossSales,
          tone:
            "bg-rose-50 text-[#E11D48]",
        },
        {
          label: "Operaciones",
          value: formatNumber(
            data.current.operations,
          ),
          note:
            "Movimientos sin duplicar cashback",
          icon: Activity,
          comparison:
            data.comparison.operations,
          tone:
            "bg-blue-50 text-blue-700",
        },
        {
          label: "Clientes atendidos",
          value: formatNumber(
            data.current.customers,
          ),
          note:
            "Clientes únicos en el periodo",
          icon: Users,
          comparison:
            data.comparison.customers,
          tone:
            "bg-violet-50 text-violet-700",
        },
        {
          label: "Recompensas canjeadas",
          value: formatNumber(
            data.current.rewardsRedeemed,
          ),
          note:
            "Canjes confirmados en el periodo",
          icon: Gift,
          comparison: undefined,
          tone:
            "bg-amber-50 text-amber-700",
        },
      ]
    : [];

  const quickPeriods = [
    { key: "7-days", label: "7 días", period: getRelativePeriod(7) },
    { key: "30-days", label: "30 días", period: getRelativePeriod(30) },
    { key: "month", label: "Este mes", period: initialPeriod },
  ] as const;

  const hasPendingFilters =
    from !== appliedPeriod.from ||
    to !== appliedPeriod.to ||
    programId !== appliedFilters.programId ||
    programType !== appliedFilters.programType ||
    locationId !== appliedFilters.locationId ||
    employeeId !== appliedFilters.employeeId;

  const advancedFiltersVisible = advancedFiltersOpen || hasPendingFilters;

  const appliedFilterLabels: string[] = [];
  const appliedProgram = data?.filters.programs.find(
    (program) => program.id === appliedFilters.programId,
  );
  const appliedLocation = data?.filters.locations.find(
    (location) => location.id === appliedFilters.locationId,
  );
  const appliedEmployee = data?.filters.employees.find(
    (employee) => employee.id === appliedFilters.employeeId,
  );
  const appliedProgramType =
    {
      1: "Sellos",
      2: "Puntos",
      3: "Cashback",
      4: "Cupones",
      5: "Gift Cards",
      6: "Suscripciones",
    }[Number(appliedFilters.programType)] ?? null;

  if (appliedProgram) appliedFilterLabels.push(appliedProgram.name);
  if (appliedProgramType) appliedFilterLabels.push(appliedProgramType);
  if (appliedLocation) appliedFilterLabels.push(appliedLocation.name);
  if (appliedEmployee) appliedFilterLabels.push(appliedEmployee.name);

  const filterControlClass =
    "h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-bold text-[#111827] outline-none transition hover:border-slate-300 focus:border-[#E11D48] focus:ring-4 focus:ring-rose-100";

  return (
    <main className="min-h-full w-full min-w-0 text-black">
      <div className="w-full min-w-0">
        {!loading && (
          <>
        <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
              Estadísticas
            </h1>
          </div>
        </header>

        <section className="mb-5 overflow-hidden rounded-[20px] border border-[#E5E7EB] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 p-3 sm:p-4 xl:flex-row xl:items-center">
            <div
              className="grid w-full shrink-0 grid-cols-3 gap-1 rounded-xl bg-[#F3F4F6] p-1 sm:w-auto"
              role="group"
              aria-label="Rangos rápidos"
            >
              {quickPeriods.map(({ key, label, period }) => {
                const active = activeQuickPeriod === key;

                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setFrom(period.from);
                      setTo(period.to);
                      setActiveQuickPeriod(key);
                    }}
                    className={`min-h-9 whitespace-nowrap rounded-lg px-3 text-xs font-extrabold outline-none transition focus-visible:ring-2 focus-visible:ring-[#E11D48]/45 focus-visible:ring-offset-2 ${
                      active
                        ? "bg-[#E11D48] text-white shadow-sm"
                        : "text-[#6B7280] hover:bg-white hover:text-[#E11D48]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
              <div className="min-w-0 rounded-xl border border-[#E5E7EB] px-3 py-2">
                <span className="block text-[9px] font-bold text-[#9CA3AF]">Rango aplicado</span>
                <strong className="mt-0.5 block truncate text-xs font-extrabold text-black">
                  {formatShortDate(appliedPeriod.from)} – {formatShortDate(appliedPeriod.to)}
                </strong>
              </div>
              <div className="min-w-0 rounded-xl border border-[#E5E7EB] px-3 py-2">
                <span className="block text-[9px] font-bold text-[#9CA3AF]">Filtros activos</span>
                <strong className="mt-0.5 block truncate text-xs font-extrabold text-black" title={appliedFilterLabels.join(" · ")}>
                  {appliedFilterLabels.length > 0
                    ? appliedFilterLabels.join(" · ")
                    : "Todo el alcance permitido"}
                </strong>
              </div>
            </div>

            <button
              type="button"
              aria-expanded={advancedFiltersVisible}
              aria-controls="statistics-advanced-filters"
              onClick={() =>
                setAdvancedFiltersOpen(
                  hasPendingFilters ? true : !advancedFiltersOpen,
                )
              }
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 text-xs font-extrabold text-[#4B5563] outline-none transition hover:border-rose-200 hover:text-[#E11D48] focus-visible:ring-2 focus-visible:ring-[#E11D48]/35"
            >
              {hasPendingFilters && (
                <>
                  <span className="h-2 w-2 rounded-full bg-[#E11D48]" aria-hidden="true" />
                  <span className="sr-only">Hay cambios pendientes sin aplicar.</span>
                </>
              )}
              Filtros avanzados
              <ChevronDown
                size={15}
                aria-hidden="true"
                className={`transition ${advancedFiltersVisible ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {advancedFiltersVisible && (
          <div
            id="statistics-advanced-filters"
            className={`grid gap-4 border-t border-[#E5E7EB] bg-[#FCFCFD] p-4 sm:grid-cols-2 lg:grid-cols-3 ${
              operationalSession === false
                ? "2xl:grid-cols-[repeat(6,minmax(0,1fr))_minmax(230px,1.3fr)]"
                : "xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(230px,1.3fr)]"
            }`}
          >
            <label>
              <span className="mb-2 block text-[11px] font-extrabold text-[#4B5563]">
                Desde
              </span>

              <input
                type="date"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setActiveQuickPeriod(null);
                }}
                className={filterControlClass}
              />
            </label>

            <label>
              <span className="mb-2 block text-[11px] font-extrabold text-[#4B5563]">
                Hasta
              </span>

              <input
                type="date"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value);
                  setActiveQuickPeriod(null);
                }}
                className={filterControlClass}
              />
            </label>

            <label>
              <span className="mb-2 block text-[11px] font-extrabold text-[#4B5563]">
                Programa
              </span>

              <select
                value={programId}
                onChange={(event) =>
                  setProgramId(
                    event.target.value,
                  )
                }
                className={filterControlClass}
              >
                <option value="">
                  Todos
                </option>

                {data?.filters.programs.map(
                  (program) => (
                    <option
                      key={program.id}
                      value={program.id}
                    >
                      {program.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-[11px] font-extrabold text-[#4B5563]">
                Tipo
              </span>

              <select
                value={programType}
                onChange={(event) =>
                  setProgramType(
                    event.target.value,
                  )
                }
                className={filterControlClass}
              >
                <option value="">
                  Todos
                </option>
                <option value="1">
                  Sellos
                </option>
                <option value="2">
                  Puntos
                </option>
                <option value="3">
                  Cashback
                </option>
                <option value="4">
                  Cupones
                </option>
                <option value="5">
                  Gift Cards
                </option>
                {subscriptionsEnabled && (
                  <option value="6">Suscripciones</option>
                )}
              </select>
            </label>

            {operationalSession === false && (
              <>
                <label>
                  <span className="mb-2 block text-[11px] font-extrabold text-[#4B5563]">
                    Sucursal
                  </span>

                  <select
                    value={locationId}
                    onChange={(event) => setLocationId(event.target.value)}
                    className={filterControlClass}
                  >
                    <option value="">Todas</option>
                    {data?.filters.locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-[11px] font-extrabold text-[#4B5563]">
                    Empleado
                  </span>

                  <select
                    value={employeeId}
                    onChange={(event) => setEmployeeId(event.target.value)}
                    className={filterControlClass}
                  >
                    <option value="">Todos</option>
                    {data?.filters.employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            <div
              className={`flex flex-col justify-end sm:col-span-2 lg:col-span-3 ${
                operationalSession === false
                  ? "2xl:col-span-1"
                  : "xl:col-span-1"
              }`}
            >
              <span className="mb-2 block text-[11px] font-extrabold text-[#4B5563]">
                Acciones
              </span>
              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 text-xs font-extrabold text-[#4B5563] outline-none transition hover:border-rose-200 hover:bg-rose-50 hover:text-[#E11D48] focus-visible:ring-2 focus-visible:ring-[#E11D48]/35"
                >
                  <RotateCcw size={15} aria-hidden="true" />
                  Restablecer
                </button>
                <button
                  type="button"
                  disabled={refreshing}
                  onClick={() => void loadStatistics(false)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-3 text-xs font-extrabold text-white shadow-[0_8px_20px_rgba(225,29,72,0.2)] outline-none transition hover:bg-[#BE123C] focus-visible:ring-2 focus-visible:ring-[#E11D48]/45 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Search size={15} aria-hidden="true" />
                  Aplicar filtros
                </button>
              </div>
            </div>
          </div>
          )}
        </section>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            {error}
          </div>
        )}
          </>
        )}

        {loading ? (
          <StatisticsSkeleton />
        ) : data ? (
          <>
            {!hasActivity && (
              <section className="mb-6 rounded-[22px] border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                <Activity className="mx-auto text-slate-300" size={32} />
                <h2 className="mt-3 text-lg font-black">Sin actividad en este periodo</h2>
                <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">
                  Ajusta las fechas o los filtros para consultar otro intervalo. No se muestran estimaciones ni valores ficticios.
                </p>
              </section>
            )}
            <section className="mb-5 grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metricCards.map((metric) => {
                const Icon = metric.icon;

                return (
                  <article
                    key={metric.label}
                    className="h-full rounded-[20px] border border-[#E5E7EB] bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.05)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`grid h-11 w-11 place-items-center rounded-2xl ${metric.tone}`}
                      >
                        <Icon size={20} />
                      </span>

                      <ComparisonBadge
                        value={
                          metric.comparison
                        }
                      />
                    </div>

                    <p className="mt-5 text-xs font-extrabold text-[#6B7280]">
                      {metric.label}
                    </p>

                    <strong className="mt-1 block text-2xl font-black tracking-[-0.035em]">
                      {metric.value}
                    </strong>

                    <small className="mt-2 block text-[11px] leading-5 text-[#9CA3AF]">
                      {metric.note}
                    </small>
                  </article>
                );
              })}
            </section>

            <section className="mb-5 flex flex-col gap-4 rounded-2xl border border-[#E5E7EB] bg-white px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-bold text-[#6B7280]">Datos complementarios del período</p>
              <dl className="grid grid-cols-2 gap-6 sm:flex sm:items-center sm:divide-x sm:divide-[#E5E7EB]">
                <div>
                  <dt className="text-[10px] font-semibold text-[#9CA3AF]">Compras con importe</dt>
                  <dd className="mt-0.5 text-lg font-black text-black">
                    {formatNumber(data.current.purchaseOperations)}
                  </dd>
                </div>
                <div className="sm:pl-6">
                  <dt className="text-[10px] font-semibold text-[#9CA3AF]">Ticket promedio</dt>
                  <dd className="mt-0.5 text-lg font-black text-black">
                    {formatCurrency(data.current.averageTicket, currency)}
                  </dd>
                </div>
              </dl>
            </section>

            <section
              className="mb-5 rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.04)] sm:p-6"
              aria-labelledby="retention-title"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 id="retention-title" className="text-lg font-black">
                    Retención de clientes
                  </h2>
                  <p className="mt-1 max-w-3xl text-xs leading-5 text-[#6B7280]">
                    Conoce quiénes regresan, quiénes están dejando de visitarte y cuántos clientes has recuperado.
                  </p>
                </div>
                <p className="max-w-md text-[10px] font-semibold leading-5 text-[#9CA3AF] sm:text-right">
                  Análisis basado en operaciones de fidelización registradas.
                </p>
              </div>

              {data.retention === undefined ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                  <Activity className="mx-auto text-slate-300" size={28} />
                  <p className="mt-3 text-sm font-bold text-slate-600">
                    El análisis de retención todavía no está disponible en esta versión de la API.
                  </p>
                </div>
              ) : !hasRetentionActivity ? (
                <div className="mt-6 h-44">
                  <EmptyChart message="No hay actividad de clientes para analizar en el periodo seleccionado." />
                </div>
              ) : (
                <div className="mt-5">
                  <div className="grid gap-5 border-y border-[#E5E7EB] py-5 sm:grid-cols-3 sm:gap-0">
                    <div
                      className="min-w-0 sm:pr-6"
                      aria-label="Clientes activos: clientes que realizaron al menos una operación durante el período."
                    >
                      <p className="text-xs font-bold text-[#6B7280]">Clientes activos</p>
                      <strong className="mt-1 block text-5xl font-black tracking-[-0.055em] text-black">
                        {formatNumber(data.retention.activeCustomers)}
                      </strong>
                    </div>
                    <div
                      className="min-w-0 border-[#E5E7EB] sm:border-l sm:px-6"
                      aria-label="Clientes nuevos: clientes cuya primera operación dentro del alcance analizado ocurrió en el período."
                    >
                      <p className="text-xs font-bold text-[#6B7280]">Clientes nuevos</p>
                      <strong className="mt-2 block text-4xl font-black tracking-[-0.045em] text-black">
                        {formatNumber(data.retention.newCustomers)}
                      </strong>
                    </div>
                    <div
                      className="min-w-0 border-[#E5E7EB] sm:border-l sm:pl-6"
                      aria-label="Clientes recurrentes: clientes que ya tenían actividad anterior y regresaron durante el período."
                    >
                      <p className="text-xs font-bold text-[#6B7280]">Clientes recurrentes</p>
                      <strong className="mt-2 block text-4xl font-black tracking-[-0.045em] text-black">
                        {formatNumber(data.retention.returningCustomers)}
                      </strong>
                    </div>
                  </div>

                  <div className="py-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3 className="text-sm font-black text-black">Composición entre nuevos y recurrentes</h3>
                        <p className="mt-1 text-[10px] text-[#9CA3AF]">
                          Proporción calculada únicamente entre ambas categorías.
                        </p>
                      </div>
                      <div className="flex gap-5 text-right">
                        <div>
                          <span className="block text-[10px] font-bold text-[#E11D48]">Nuevos</span>
                          <strong className="text-sm font-black text-black">
                            {formatNumber(data.retention.newCustomers)} · {retentionCompositionTotal && retentionCompositionTotal > 0 ? formatPercentage(newCustomerShare) : "—"}
                          </strong>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-[#4B5563]">Recurrentes</span>
                          <strong className="text-sm font-black text-black">
                            {formatNumber(data.retention.returningCustomers)} · {retentionCompositionTotal && retentionCompositionTotal > 0 ? formatPercentage(100 - newCustomerShare) : "—"}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div
                      className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-slate-100"
                      role="img"
                      aria-label={`Nuevos: ${formatNumber(data.retention.newCustomers)}. Recurrentes: ${formatNumber(data.retention.returningCustomers)}.`}
                    >
                      {retentionCompositionTotal && retentionCompositionTotal > 0 ? (
                        <>
                          <span className="h-full bg-[#E11D48]" style={{ width: `${newCustomerShare}%` }} />
                          <span className="h-full bg-[#111827]" style={{ width: `${100 - newCustomerShare}%` }} />
                        </>
                      ) : null}
                    </div>

                    {!retentionCompositionMatchesActive && (
                      <p className="mt-3 text-[10px] leading-4 text-[#6B7280]">
                        Nuevos y recurrentes no equivalen al total de clientes activos en este período; la barra no usa activos como denominador.
                      </p>
                    )}
                  </div>

                  <div className="grid gap-6 border-t border-[#E5E7EB] pt-5 lg:grid-cols-[minmax(180px,.7fr)_minmax(0,2fr)]">
                    <div className="border-l-2 border-[#E11D48] pl-4">
                      <p className="text-xs font-bold text-[#6B7280]">Clientes reactivados</p>
                      <strong className="mt-1 block text-3xl font-black tracking-[-0.04em] text-black">
                        {formatNumber(data.retention.reactivatedCustomers)}
                      </strong>
                      <p className="mt-1 text-[10px] text-[#9CA3AF]">Regresaron tras 30 días o más.</p>
                    </div>

                    <div className="min-w-0 lg:border-l lg:border-[#E5E7EB] lg:pl-6">
                      <p className="text-xs font-bold text-[#6B7280]">Inactividad al cierre del período</p>
                      <div className="mt-3 grid gap-4 sm:grid-cols-3 sm:divide-x sm:divide-[#E5E7EB]">
                        <div>
                          <span className="text-[10px] font-semibold text-[#6B7280]">15–29 días</span>
                          <strong className="mt-1 block text-2xl font-black text-black">{formatNumber(data.retention.inactive15To29)}</strong>
                        </div>
                        <div className="sm:pl-4">
                          <span className="text-[10px] font-semibold text-[#6B7280]">30–59 días</span>
                          <strong className="mt-1 block text-2xl font-black text-black">{formatNumber(data.retention.inactive30To59)}</strong>
                        </div>
                        <div className="sm:pl-4">
                          <span className="text-[10px] font-semibold text-[#6B7280]">60+ días</span>
                          <strong className="mt-1 block text-2xl font-black text-black">{formatNumber(data.retention.inactive60Plus)}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {operationalSession === false && (
              <section className="mb-5 rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.04)] sm:p-6">
                <h2 className="text-lg font-black">
                  Rendimiento por sucursal
                </h2>

                <p className="mt-1 text-xs text-[#6B7280]">
                  Compara la actividad y las ventas de tus sucursales.
                </p>

                {data.locationBreakdown === undefined ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                    <Activity className="mx-auto text-slate-300" size={28} />
                    <p className="mt-3 text-sm font-bold text-slate-600">
                      El desglose por sucursal todavía no está disponible en esta versión de la API.
                    </p>
                  </div>
                ) : !hasLocationActivity ? (
                  <div className="mt-6 h-44">
                    <EmptyChart message="No hay movimientos por sucursal en el periodo seleccionado." />
                  </div>
                ) : (
                  <>
                    <div className="mt-6 max-h-[620px] overflow-y-auto overflow-x-hidden rounded-[20px] border border-slate-200/80 bg-[#FCFCFD] p-4 sm:p-5">
                      <p className="mb-4 text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280]">
                        Ventas registradas (MXN)
                      </p>

                      <div
                        className="w-full"
                        style={{
                          height: Math.max(
                            260,
                            data.locationBreakdown.length * 64,
                          ),
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={data.locationBreakdown}
                            layout="vertical"
                            margin={{ top: 8, right: 32, bottom: 8, left: 8 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 5"
                              horizontal={false}
                              stroke="#E5E7EB"
                            />

                            <XAxis
                              type="number"
                              tick={{ fontSize: 11, fill: "#6B7280" }}
                              tickFormatter={(value) => formatNumber(Number(value))}
                              axisLine={false}
                              tickLine={false}
                              tickMargin={10}
                            />

                            <YAxis
                              type="category"
                              dataKey="locationName"
                              width={136}
                              tick={{ fontSize: 11, fontWeight: 700, fill: "#374151" }}
                              tickFormatter={(value) => {
                                const label = String(value);
                                return label.length > 22
                                  ? `${label.slice(0, 21)}…`
                                  : label;
                              }}
                              axisLine={false}
                              tickLine={false}
                              tickMargin={10}
                            />

                            <ChartTooltip
                              cursor={{ fill: "#FFF1F2" }}
                              contentStyle={{
                                border: "1px solid #E5E7EB",
                                borderRadius: 14,
                                boxShadow: "0 14px 35px rgba(15, 23, 42, 0.12)",
                              }}
                              labelStyle={{ color: "#111827", fontWeight: 800 }}
                              itemStyle={{ color: "#E11D48", fontWeight: 700 }}
                              formatter={(value) => [
                                formatCurrency(Number(value ?? 0)),
                                "Ventas registradas",
                              ]}
                            />

                            <Bar
                              dataKey="grossSales"
                              name="Ventas registradas"
                              fill="#E11D48"
                              radius={[0, 8, 8, 0]}
                              maxBarSize={30}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="mt-5 grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      {data.locationBreakdown.map((location) => (
                        <article
                          key={location.locationId}
                          className="h-full rounded-2xl border border-[#E5E7EB] border-t-2 border-t-[#E11D48] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]"
                        >
                          <h3 className="break-words text-sm font-black leading-5" title={location.locationName}>
                            {location.locationName}
                          </h3>

                          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                            <div className="col-span-2">
                              <dt className="text-[#6B7280]">Ventas registradas</dt>
                              <dd className="mt-1 text-base font-black text-[#E11D48]">
                                {formatCurrency(location.grossSales)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[#6B7280]">Operaciones</dt>
                              <dd className="mt-1 font-black">{formatNumber(location.operations)}</dd>
                            </div>
                            <div>
                              <dt className="text-[#6B7280]">Clientes atendidos</dt>
                              <dd className="mt-1 font-black">{formatNumber(location.customers)}</dd>
                            </div>
                            <div className="col-span-2">
                              <dt className="text-[#6B7280]">Recompensas canjeadas</dt>
                              <dd className="mt-1 font-black">{formatNumber(location.rewardsRedeemed)}</dd>
                            </div>
                          </dl>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}

            <section className="mb-5 rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.04)] sm:p-6">
              <h2 className="text-lg font-black">
                Rendimiento por programa
              </h2>

              <p className="mt-1 text-xs text-[#6B7280]">
                Analiza la actividad de tus programas de fidelización.
              </p>

              <p className="mt-3 inline-flex max-w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] font-semibold leading-5 text-[#6B7280]">
                Este desglose incluye únicamente las operaciones de programas actualmente compatibles.
              </p>

              {data.programBreakdown === undefined ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                  <Activity className="mx-auto text-slate-300" size={28} />
                  <p className="mt-3 text-sm font-bold text-slate-600">
                    El desglose por programa todavía no está disponible en esta versión de la API.
                  </p>
                </div>
              ) : !hasProgramActivity ? (
                <div className="mt-6 h-44">
                  <EmptyChart message="No hay actividad de programas compatibles en el periodo seleccionado." />
                </div>
              ) : (
                <>
                  <div className="mt-6 rounded-[20px] border border-slate-200/80 bg-[#FCFCFD] p-4 sm:p-5">
                    <p className="mb-4 text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280]">
                      Ventas registradas (MXN)
                    </p>

                    <div className="max-h-[560px] overflow-y-auto overflow-x-hidden">
                      <div
                        className="w-full"
                        style={{
                          height: Math.max(
                            260,
                            data.programBreakdown.length * 64,
                          ),
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={data.programBreakdown}
                            layout="vertical"
                            margin={{ top: 8, right: 32, bottom: 8, left: 8 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 5"
                              horizontal={false}
                              stroke="#E5E7EB"
                            />

                            <XAxis
                              type="number"
                              tick={{ fontSize: 11, fill: "#6B7280" }}
                              tickFormatter={(value) => formatNumber(Number(value))}
                              axisLine={false}
                              tickLine={false}
                              tickMargin={10}
                            />

                            <YAxis
                              type="category"
                              dataKey="programName"
                              width={136}
                              tick={{ fontSize: 11, fontWeight: 700, fill: "#374151" }}
                              tickFormatter={(value) => {
                                const label = String(value);
                                return label.length > 22
                                  ? `${label.slice(0, 21)}…`
                                  : label;
                              }}
                              axisLine={false}
                              tickLine={false}
                              tickMargin={10}
                            />

                            <ChartTooltip
                              cursor={{ fill: "#FFF1F2" }}
                              contentStyle={{
                                border: "1px solid #E5E7EB",
                                borderRadius: 14,
                                boxShadow: "0 14px 35px rgba(15, 23, 42, 0.12)",
                              }}
                              labelStyle={{ color: "#111827", fontWeight: 800 }}
                              itemStyle={{ color: "#E11D48", fontWeight: 700 }}
                              formatter={(value) => [
                                formatCurrency(Number(value ?? 0)),
                                "Ventas registradas",
                              ]}
                            />

                            <Bar
                              dataKey="grossSales"
                              name="Ventas registradas"
                              fill="#E11D48"
                              radius={[0, 8, 8, 0]}
                              maxBarSize={30}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {data.programBreakdown.map((program) => (
                      <article
                        key={program.programId}
                        className="h-full rounded-2xl border border-[#E5E7EB] border-t-2 border-t-[#E11D48] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]"
                      >
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <h3 className="min-w-0 break-words text-sm font-black leading-5" title={program.programName}>
                            {program.programName}
                          </h3>
                          <span className="shrink-0 rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-[10px] font-extrabold text-[#E11D48]">
                            {programTypeLabel(program.programType)}
                          </span>
                        </div>

                        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                          <div className="col-span-2">
                            <dt className="text-[#6B7280]">Ventas registradas</dt>
                            <dd className="mt-1 text-base font-black text-[#E11D48]">
                              {formatCurrency(program.grossSales)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[#6B7280]">Operaciones</dt>
                            <dd className="mt-1 font-black">{formatNumber(program.operations)}</dd>
                          </div>
                          <div>
                            <dt className="text-[#6B7280]">Clientes atendidos</dt>
                            <dd className="mt-1 font-black">{formatNumber(program.customers)}</dd>
                          </div>
                          <div className="col-span-2">
                            <dt className="text-[#6B7280]">Recompensas canjeadas</dt>
                            <dd className="mt-1 font-black">{formatNumber(program.rewardsRedeemed)}</dd>
                          </div>
                        </dl>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>

            {operationalSession === false && (
              <GiftCardStatistics from={appliedPeriod.from} to={appliedPeriod.to} />
            )}
            {operationalSession === false && subscriptionsEnabled && (
              <SubscriptionStatistics from={appliedPeriod.from} to={appliedPeriod.to} />
            )}

            <section className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,.7fr)]">
              <article className="rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_16px_45px_rgba(0,0,0,0.05)] sm:p-6">
                <div>
                  <span className="text-[10px] font-black tracking-[0.16em] text-[#E11D48]">
                    TENDENCIA
                  </span>

                  <h2 className="mt-1 text-lg font-black">
                    Ventas y operaciones
                  </h2>
                </div>

                <div className="mt-6 h-[330px]">
                  {hasActivity ? (
                    <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={data.trend}
                    >
                      <CartesianGrid
                        strokeDasharray="4 4"
                        vertical={false}
                        stroke="#E5E7EB"
                      />

                      <XAxis
                        dataKey="date"
                        tickFormatter={
                          formatShortDate
                        }
                        tick={{
                          fontSize: 11,
                          fill: "#6B7280",
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <YAxis
                        yAxisId="money"
                        tick={{
                          fontSize: 11,
                          fill: "#6B7280",
                        }}
                        axisLine={false}
                        tickLine={false}
                        width={70}
                      />

                      <YAxis
                        yAxisId="operations"
                        orientation="right"
                        tick={{
                          fontSize: 11,
                          fill: "#6B7280",
                        }}
                        axisLine={false}
                        tickLine={false}
                        width={34}
                      />

                      <ChartTooltip
                        labelFormatter={(label) =>
                          formatShortDate(
                            String(label),
                          )
                        }
                        formatter={(
                          value,
                          name,
                        ) => {
                          const numeric =
                            Number(value ?? 0);

                          return [
                            name ===
                            "grossSales"
                              ? formatCurrency(
                                  numeric,
                                  currency,
                                )
                              : formatNumber(
                                  numeric,
                                ),
                            name ===
                            "grossSales"
                              ? "Ventas"
                              : "Operaciones",
                          ];
                        }}
                      />

                      <Area
                        yAxisId="money"
                        type="monotone"
                        dataKey="grossSales"
                        stroke="#E11D48"
                        fill="#FFE4E9"
                        strokeWidth={3}
                      />

                      <Line
                        yAxisId="operations"
                        type="monotone"
                        dataKey="operations"
                        stroke="#000000"
                        strokeWidth={2}
                        dot={false}
                      />
                    </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart message="No hay ventas u operaciones para graficar." />
                  )}
                </div>
              </article>

              <aside className="rounded-[22px] bg-black p-6 text-white shadow-[0_18px_50px_rgba(0,0,0,0.16)]">
                <Award
                  size={27}
                  className="text-[#E11D48]"
                />

                <span className="mt-6 block text-[10px] font-black tracking-[0.16em] text-white/55">
                  CLIENTE DESTACADO
                </span>

                {highlightedCustomer ? (
                  <>
                    <h2 className="mt-2 text-2xl font-black">
                      {
                        highlightedCustomer.customerName
                      }
                    </h2>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-white/10 p-4">
                        <small className="text-white/60">
                          Operaciones
                        </small>
                        <strong className="mt-1 block text-xl">
                          {
                            highlightedCustomer.operations
                          }
                        </strong>
                      </div>

                      <div className="rounded-2xl bg-white/10 p-4">
                        <small className="text-white/60">
                          Registrado
                        </small>
                        <strong className="mt-1 block text-lg">
                          {formatCurrency(
                            highlightedCustomer.grossSales,
                            currency,
                          )}
                        </strong>
                      </div>
                    </div>

                    <p className="mt-5 text-xs text-white/60">
                      Última actividad:{" "}
                      {formatDateTime(
                        highlightedCustomer.lastActivityAt,
                      )}
                    </p>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-white/60">
                    No hay actividad durante el
                    periodo seleccionado.
                  </p>
                )}
              </aside>
            </section>

            <section className="mb-6 grid gap-6 xl:grid-cols-2">
              <article className="rounded-[22px] border border-[#E5E7EB] bg-white p-5 sm:p-6">
                <h2 className="text-lg font-black">
                  Rendimiento por día
                </h2>

                <p className="mt-1 text-xs text-[#6B7280]">
                  Identifica los mejores días de
                  la semana.
                </p>

                <div className="mt-6 h-[300px]">
                  {hasActivity ? (
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={
                        data.weekdayPerformance
                      }
                    >
                      <CartesianGrid
                        strokeDasharray="4 4"
                        vertical={false}
                        stroke="#E5E7EB"
                      />

                      <XAxis
                        dataKey="day"
                        tick={{
                          fontSize: 11,
                          fill: "#6B7280",
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <YAxis
                        tick={{
                          fontSize: 11,
                          fill: "#6B7280",
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <ChartTooltip />

                      <Bar
                        dataKey="operations"
                        name="Operaciones"
                        fill="#E11D48"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart message="Aún no hay rendimiento diario en este periodo." />
                  )}
                </div>
              </article>

              <article className="rounded-[22px] border border-[#E5E7EB] bg-white p-5 sm:p-6">
                <h2 className="text-lg font-black">
                  Actividad por horario
                </h2>

                <p className="mt-1 text-xs text-[#6B7280]">
                  Operaciones registradas por
                  hora.
                </p>

                <div className="mt-6 h-[300px]">
                  {hasActivity ? (
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={
                        data.hourlyPerformance
                      }
                    >
                      <CartesianGrid
                        strokeDasharray="4 4"
                        vertical={false}
                        stroke="#E5E7EB"
                      />

                      <XAxis
                        dataKey="label"
                        interval={2}
                        tick={{
                          fontSize: 10,
                          fill: "#6B7280",
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <YAxis
                        tick={{
                          fontSize: 11,
                          fill: "#6B7280",
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <ChartTooltip />

                      <Bar
                        dataKey="operations"
                        name="Operaciones"
                        fill="#000000"
                        radius={[7, 7, 0, 0]}
                      />
                    </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart message="Aún no hay actividad por horario." />
                  )}
                </div>
              </article>
            </section>

            <section className="mb-6 rounded-[22px] border border-[#E5E7EB] bg-white p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-50 text-[#E11D48]">
                  <CalendarDays size={20} />
                </span>

                <div>
                  <h2 className="text-lg font-black">
                    Mapa de actividad
                  </h2>

                  <p className="text-xs text-[#6B7280]">
                    Intensidad de operaciones por
                    día y hora.
                  </p>
                </div>
              </div>

              {hasHeatmapActivity ? (
                <div className="mt-6">
                  <div className="max-w-full overflow-x-auto overscroll-x-contain pb-2 md:overflow-x-visible">
                    <div className="grid min-w-[920px] grid-cols-[48px_repeat(24,minmax(0,1fr))] gap-1.5 md:min-w-0 md:gap-1 lg:gap-1.5">
                      <span aria-hidden="true" />
                      <span className="col-span-12 border-b border-slate-200 pb-1 text-center text-[10px] font-black tracking-[0.16em] text-slate-400">
                        AM
                      </span>
                      <span className="col-span-12 border-b border-slate-200 pb-1 text-center text-[10px] font-black tracking-[0.16em] text-slate-400">
                        PM
                      </span>

                      <span aria-hidden="true" />
                      {Array.from({ length: 24 }).map((_, hour) => (
                        <span
                          key={hour}
                          className="py-1 text-center text-[10px] font-extrabold tabular-nums text-slate-500"
                        >
                          {hour % 12 || 12}
                        </span>
                      ))}

                      {HEATMAP_DAYS.flatMap(([dayNumber, label]) => [
                        <span
                          key={`${dayNumber}-label`}
                          className="flex items-center text-[10px] font-extrabold text-slate-600"
                        >
                          {label}
                        </span>,
                        ...Array.from({ length: 24 }).map((_, hour) => {
                          const value = getHeatValue(dayNumber, hour);
                          const intensity = value / maximumHeat;
                          const description = `${label}, ${formatHeatmapHour(hour)}: ${value} ${value === 1 ? "operación" : "operaciones"}`;

                          return (
                            <span
                              key={`${dayNumber}-${hour}`}
                              role="img"
                              tabIndex={0}
                              aria-label={description}
                              title={description}
                              className="aspect-square min-h-7 rounded-md outline-none transition hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-[#E11D48] focus-visible:ring-offset-2"
                              style={{
                                backgroundColor:
                                  value === 0
                                    ? "#E5E7EB"
                                    : `rgba(225, 29, 72, ${0.18 + intensity * 0.82})`,
                              }}
                            />
                          );
                        }),
                      ])}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2 text-[10px] font-bold text-slate-500">
                    <span>Menor actividad</span>
                    {["#E5E7EB", "rgba(225, 29, 72, .28)", "rgba(225, 29, 72, .5)", "rgba(225, 29, 72, .72)", "#E11D48"].map((color) => (
                      <span
                        key={color}
                        aria-hidden="true"
                        className="h-3 w-3 rounded-[3px]"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <span aria-hidden="true">→</span>
                    <span>Mayor actividad</span>
                  </div>
                </div>
              ) : (
                <div className="mt-6 h-48">
                  <EmptyChart message="No hay operaciones para construir el mapa de actividad." />
                </div>
              )}
            </section>

            <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Sellos agregados",
                  value:
                    data.current.stampsAdded,
                  icon: Stamp,
                },
                {
                  label: "Puntos agregados",
                  value:
                    data.current.pointsAdded,
                  icon: Sparkles,
                },
                {
                  label: "Cashback generado",
                  value: formatCurrency(
                    data.current
                      .cashbackGenerated,
                    currency,
                  ),
                  icon: CreditCard,
                },
                {
                  label: "Cashback utilizado",
                  value: formatCurrency(
                    data.current.cashbackUsed,
                    currency,
                  ),
                  icon: WalletCards,
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.label}
                    className="rounded-2xl border border-[#E5E7EB] bg-white p-5"
                  >
                    <Icon
                      size={19}
                      className="text-[#E11D48]"
                    />

                    <small className="mt-4 block font-bold text-[#6B7280]">
                      {item.label}
                    </small>

                    <strong className="mt-1 block text-xl font-black">
                      {typeof item.value ===
                      "number"
                        ? formatNumber(
                            item.value,
                          )
                        : item.value}
                    </strong>
                  </article>
                );
              })}
            </section>

            <section className="overflow-hidden rounded-[22px] border border-[#E5E7EB] bg-white">
              <div className="border-b border-[#E5E7EB] px-5 py-5 sm:px-6">
                <h2 className="text-lg font-black">
                  Mejores clientes
                </h2>

                <p className="mt-1 text-xs text-[#6B7280]">
                  Clasificación por importe
                  registrado y operaciones.
                </p>
              </div>

              {data.topCustomers.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-[#6B7280]">
                  No hay clientes con actividad
                  en este periodo.
                </div>
              ) : (
                <>
                  <div className="grid gap-3 p-4 md:hidden">
                    {data.topCustomers.map((customer, index) => (
                      <article key={customer.customerId} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-black text-xs font-black text-white">
                            {index + 1}
                          </span>
                          <strong className="min-w-0 truncate text-sm">{customer.customerName}</strong>
                        </div>
                        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                          <div><dt className="text-slate-500">Operaciones</dt><dd className="mt-1 font-black">{formatNumber(customer.operations)}</dd></div>
                          <div><dt className="text-slate-500">Registrado</dt><dd className="mt-1 font-black">{formatCurrency(customer.grossSales, currency)}</dd></div>
                          <div><dt className="text-slate-500">Recompensas</dt><dd className="mt-1 font-black">{formatNumber(customer.rewardsRedeemed)}</dd></div>
                          <div><dt className="text-slate-500">Última actividad</dt><dd className="mt-1 font-semibold">{formatDateTime(customer.lastActivityAt)}</dd></div>
                        </dl>
                      </article>
                    ))}
                  </div>
                  <div className="hidden md:block">
                  <table className="w-full table-fixed">
                    <thead className="bg-[#F8FAFC] text-left text-[10px] font-black tracking-[0.1em] text-[#6B7280]">
                      <tr>
                        <th className="w-[28%] px-6 py-3">
                          Cliente
                        </th>
                        <th className="px-4 py-3">
                          Operaciones
                        </th>
                        <th className="px-4 py-3">
                          Registrado
                        </th>
                        <th className="px-4 py-3">
                          Recompensas
                        </th>
                        <th className="w-[24%] px-6 py-3">
                          Última actividad
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#E5E7EB]">
                      {data.topCustomers.map(
                        (customer, index) => (
                          <tr
                            key={
                              customer.customerId
                            }
                            className="hover:bg-rose-50/30"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <span className="grid h-9 w-9 place-items-center rounded-xl bg-black text-xs font-black text-white">
                                  {index + 1}
                                </span>

                                <strong className="text-sm">
                                  {
                                    customer.customerName
                                  }
                                </strong>
                              </div>
                            </td>

                            <td className="px-4 py-4 text-sm font-bold">
                              {
                                customer.operations
                              }
                            </td>

                            <td className="px-4 py-4 text-sm font-black">
                              {formatCurrency(
                                customer.grossSales,
                                currency,
                              )}
                            </td>

                            <td className="px-4 py-4 text-sm font-bold">
                              {
                                customer.rewardsRedeemed
                              }
                            </td>

                            <td className="px-6 py-4 text-xs text-[#6B7280]">
                              {formatDateTime(
                                customer.lastActivityAt,
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                  </div>
                </>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
