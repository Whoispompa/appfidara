"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  Gift,
  LoaderCircle,
  RefreshCw,
  Search,
  Sparkles,
  Stamp,
  TrendingUp,
  UserCheck,
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
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

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

export default function StatisticsPage() {
  const initialPeriod =
    useMemo(() => getInitialPeriod(), []);

  const [from, setFrom] =
    useState(initialPeriod.from);

  const [to, setTo] =
    useState(initialPeriod.to);

  const [programId, setProgramId] =
    useState("");

  const [locationId, setLocationId] =
    useState("");

  const [employeeId, setEmployeeId] =
    useState("");

  const [programType, setProgramType] =
    useState("");

  const [data, setData] =
    useState<StatisticsData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadStatistics = useCallback(
    async (showLoader = false) => {
      if (showLoader) setLoading(true);
      else setRefreshing(true);

      setError("");

      try {
        const search =
          new URLSearchParams();

        search.set("from", from);
        search.set("to", to);

        if (programId) {
          search.set("programId", programId);
        }

        if (locationId) {
          search.set(
            "locationId",
            locationId,
          );
        }

        if (employeeId) {
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
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "No fue posible cargar las estadísticas.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      employeeId,
      from,
      locationId,
      programId,
      programType,
      to,
    ],
  );

  useEffect(() => {
    // Carga inicial de las métricas existentes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStatistics(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function applyPreset(days: number) {
    const end = new Date();
    const start = new Date();

    start.setDate(
      end.getDate() - (days - 1),
    );

    setFrom(toInputDate(start));
    setTo(toInputDate(end));
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
          label: "Ticket promedio",
          value: formatCurrency(
            data.current.averageTicket,
            currency,
          ),
          note:
            "En compras con importe registrado",
          icon: TrendingUp,
          comparison:
            data.comparison.averageTicket,
          tone:
            "bg-emerald-50 text-emerald-700",
        },
      ]
    : [];

  return (
    <main className="min-h-full bg-[#F3F4F6] px-4 py-6 text-black sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-[1500px]">
        <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="text-[11px] font-black tracking-[0.18em] text-[#E11D48]">
              INTELIGENCIA DEL NEGOCIO
            </span>

            <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
              Estadísticas
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7280]">
              Descubre cómo se comportan tus
              clientes y programas de lealtad.
            </p>
          </div>

          <button
            type="button"
            disabled={refreshing}
            onClick={() =>
              void loadStatistics(false)
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-extrabold shadow-sm transition hover:bg-slate-50 disabled:opacity-50 lg:self-auto"
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />
            Actualizar
          </button>
        </header>

        <section className="mb-6 rounded-[22px] border border-[#E5E7EB] bg-white p-4 shadow-[0_14px_40px_rgba(0,0,0,0.05)] sm:p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset(7)}
              className="rounded-full bg-[#F3F4F6] px-3 py-1.5 text-xs font-extrabold hover:bg-rose-50 hover:text-[#E11D48]"
            >
              7 días
            </button>

            <button
              type="button"
              onClick={() => applyPreset(30)}
              className="rounded-full bg-[#F3F4F6] px-3 py-1.5 text-xs font-extrabold hover:bg-rose-50 hover:text-[#E11D48]"
            >
              30 días
            </button>

            <button
              type="button"
              onClick={() => {
                const period =
                  getInitialPeriod();

                setFrom(period.from);
                setTo(period.to);
              }}
              className="rounded-full bg-[#F3F4F6] px-3 py-1.5 text-xs font-extrabold hover:bg-rose-50 hover:text-[#E11D48]"
            >
              Este mes
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <label>
              <span className="mb-2 block text-[11px] font-extrabold text-[#6B7280]">
                Desde
              </span>

              <input
                type="date"
                value={from}
                onChange={(event) =>
                  setFrom(event.target.value)
                }
                className="h-11 w-full rounded-xl border border-[#E5E7EB] px-3 text-sm font-bold outline-none focus:border-[#E11D48] focus:ring-4 focus:ring-rose-100"
              />
            </label>

            <label>
              <span className="mb-2 block text-[11px] font-extrabold text-[#6B7280]">
                Hasta
              </span>

              <input
                type="date"
                value={to}
                onChange={(event) =>
                  setTo(event.target.value)
                }
                className="h-11 w-full rounded-xl border border-[#E5E7EB] px-3 text-sm font-bold outline-none focus:border-[#E11D48] focus:ring-4 focus:ring-rose-100"
              />
            </label>

            <label>
              <span className="mb-2 block text-[11px] font-extrabold text-[#6B7280]">
                Programa
              </span>

              <select
                value={programId}
                onChange={(event) =>
                  setProgramId(
                    event.target.value,
                  )
                }
                className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-bold outline-none"
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
              <span className="mb-2 block text-[11px] font-extrabold text-[#6B7280]">
                Tipo
              </span>

              <select
                value={programType}
                onChange={(event) =>
                  setProgramType(
                    event.target.value,
                  )
                }
                className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-bold outline-none"
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
              </select>
            </label>

            <label>
              <span className="mb-2 block text-[11px] font-extrabold text-[#6B7280]">
                Sucursal
              </span>

              <select
                value={locationId}
                onChange={(event) =>
                  setLocationId(
                    event.target.value,
                  )
                }
                className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-bold outline-none"
              >
                <option value="">
                  Todas
                </option>

                {data?.filters.locations.map(
                  (location) => (
                    <option
                      key={location.id}
                      value={location.id}
                    >
                      {location.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-[11px] font-extrabold text-[#6B7280]">
                Empleado
              </span>

              <select
                value={employeeId}
                onChange={(event) =>
                  setEmployeeId(
                    event.target.value,
                  )
                }
                className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-bold outline-none"
              >
                <option value="">
                  Todos
                </option>

                {data?.filters.employees.map(
                  (employee) => (
                    <option
                      key={employee.id}
                      value={employee.id}
                    >
                      {employee.name}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              disabled={refreshing}
              onClick={() =>
                void loadStatistics(false)
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-5 text-sm font-extrabold text-white shadow-lg shadow-rose-600/20 disabled:opacity-50"
            >
              <Search size={16} />
              Aplicar filtros
            </button>
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid min-h-[480px] place-items-center">
            <LoaderCircle
              size={32}
              className="animate-spin text-[#E11D48]"
            />
          </div>
        ) : data ? (
          <>
            <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metricCards.map((metric) => {
                const Icon = metric.icon;

                return (
                  <article
                    key={metric.label}
                    className="rounded-[20px] border border-[#E5E7EB] bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.05)]"
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

            <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Clientes nuevos",
                  value:
                    data.current.newCustomers,
                  icon: Sparkles,
                  color:
                    "bg-amber-50 text-amber-700",
                },
                {
                  label: "Clientes recurrentes",
                  value:
                    data.current
                      .returningCustomers,
                  icon: UserCheck,
                  color:
                    "bg-emerald-50 text-emerald-700",
                },
                {
                  label: "Recompensas",
                  value:
                    data.current
                      .rewardsRedeemed,
                  icon: Gift,
                  color:
                    "bg-violet-50 text-violet-700",
                },
                {
                  label: "Wallet instaladas",
                  value: data.wallet.total,
                  icon: WalletCards,
                  color:
                    "bg-blue-50 text-blue-700",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.label}
                    className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4"
                  >
                    <span
                      className={`grid h-11 w-11 place-items-center rounded-2xl ${item.color}`}
                    >
                      <Icon size={19} />
                    </span>

                    <div>
                      <small className="font-bold text-[#6B7280]">
                        {item.label}
                      </small>

                      <strong className="block text-xl font-black">
                        {formatNumber(
                          item.value,
                        )}
                      </strong>
                    </div>
                  </article>
                );
              })}
            </section>

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
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
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
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
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
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
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

              <div className="mt-6 overflow-x-auto">
                <div className="min-w-[900px]">
                  <div
                    className="grid gap-1"
                    style={{
                      gridTemplateColumns:
                        "90px repeat(24, minmax(28px, 1fr))",
                    }}
                  >
                    <span />

                    {Array.from({
                      length: 24,
                    }).map((_, hour) => (
                      <span
                        key={hour}
                        className="text-center text-[9px] font-bold text-[#9CA3AF]"
                      >
                        {hour}
                      </span>
                    ))}

                    {[
                      [1, "Lun"],
                      [2, "Mar"],
                      [3, "Mié"],
                      [4, "Jue"],
                      [5, "Vie"],
                      [6, "Sáb"],
                      [7, "Dom"],
                    ].flatMap(
                      ([dayNumber, label]) => [
                        <span
                          key={`${dayNumber}-label`}
                          className="flex items-center text-xs font-extrabold"
                        >
                          {label}
                        </span>,

                        ...Array.from({
                          length: 24,
                        }).map((_, hour) => {
                          const value =
                            getHeatValue(
                              Number(
                                dayNumber,
                              ),
                              hour,
                            );

                          const intensity =
                            value /
                            maximumHeat;

                          return (
                            <div
                              key={`${dayNumber}-${hour}`}
                              title={`${label} ${hour}:00 · ${value} operaciones`}
                              className="aspect-square rounded-md"
                              style={{
                                backgroundColor:
                                  value === 0
                                    ? "#F3F4F6"
                                    : `rgba(225, 29, 72, ${
                                        0.18 +
                                        intensity *
                                          0.82
                                      })`,
                              }}
                            />
                          );
                        }),
                      ],
                    )}
                  </div>
                </div>
              </div>
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
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px]">
                    <thead className="bg-[#F8FAFC] text-left text-[10px] font-black tracking-[0.1em] text-[#6B7280]">
                      <tr>
                        <th className="px-6 py-3">
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
                        <th className="px-6 py-3">
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
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
