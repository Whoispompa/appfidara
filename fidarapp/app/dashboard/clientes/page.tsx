"use client";

import {
  formatDate,
  formatDateOnly,
  formatDateTime,
} from "@/components/lib/date-time";
import Link from "next/link";
import { Poppins } from "next/font/google";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FidaraConfirmDialog } from "@/components/ui/fidara-confirm-dialog";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CreditCard,
  Ellipsis as MoreHorizontal,
  FileSpreadsheet,
  LoaderCircle,
  Search,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import styles from "./customers.module.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });

type Customer = {
  id: string;
  firstName: string;
  lastName?: string | null;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  marketingConsent: boolean;
  isActive: boolean;
  cardCount: number;
  activeCardCount: number;
  totalBalance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  walletPassCount: number;
  lastVisitAt?: string | null;
  lastActivityAt?: string | null;
  createdAt: string;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

type CustomersResponse = {
  success: boolean;
  message?: string;
  data: Customer[];
  pagination: Pagination;
};

type CustomerCard = {
  id: string;
  programId: string;
  programName: string;
  cardNumber: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  status: number;
  transactionCount: number;
  walletPassCount: number;
  activatedAt: string;
  lastActivityAt?: string | null;
  createdAt: string;
};

type CustomerDetail = {
  id: string;
  firstName: string;
  lastName?: string | null;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  marketingConsent: boolean;
  isActive: boolean;
  lastVisitAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  summary: {
    cardCount: number;
    activeCardCount: number;
  };
  cards: CustomerCard[];
};

type CustomerDetailResponse = {
  success: boolean;
  message?: string;
  data: CustomerDetail;
};

type ExportProgram = {
  id: string;
  name: string;
  programType: number;
  isActive: boolean;
  reward?: {
    name: string;
    description?: string | null;
    requiredValue: number;
  } | null;
};

type ExportMembership = {
  id: string;
  programId: string;
  customerId: string;
  status: number;
  currentPlanName?: string | null;
  currentTermStartsAtUtc?: string | null;
  currentTermEndsAtUtc?: string | null;
  createdAtUtc: string;
};

type StatusFilter = "all" | "active" | "inactive";

type StatusConfirmation = {
  customer: Customer;
  nextStatus: boolean;
} | null;

const initialPagination: Pagination = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  hasPreviousPage: false,
  hasNextPage: false,
};

function getInitials(customer: Customer) {
  const first = customer.firstName?.trim().charAt(0) ?? "";
  const last = customer.lastName?.trim().charAt(0) ?? "";

  return `${first}${last || first}`.toUpperCase();
}

function formatBirthday(value?: string | null) {
  if (!value) return "No registrado";

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return "No registrado";

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  if (Number.isNaN(date.getTime())) return "No registrado";

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

function escapeCsvValue(value: string | number | null | undefined) {
  let text = value == null ? "" : String(value);

  if (/^[\s]*[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function localDateStamp(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function programTypeLabel(programType?: number) {
  return (
    {
      1: "Sellos",
      2: "Puntos",
      3: "Cashback",
      4: "Cupones",
      5: "Gift Card",
      6: "Suscripción",
    }[programType ?? 0] ?? ""
  );
}

function membershipStatusLabel(status?: number) {
  return (
    { 1: "Pendiente", 2: "Activa", 3: "Vencida", 4: "Cancelada" }[
      status ?? 0
    ] ?? ""
  );
}

export default function CustomersPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [error, setError] = useState("");
  const [updatingCustomerId, setUpdatingCustomerId] = useState<string | null>(null);
  const [statusConfirmation, setStatusConfirmation] =
    useState<StatusConfirmation>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("pageSize", "20");

      if (search) params.set("search", search);

      if (statusFilter !== "all") {
        params.set("isActive", statusFilter === "active" ? "true" : "false");
      }

      const response = await fetch(`/api/customers?${params.toString()}`, {
        cache: "no-store",
      });

      const payload = (await response.json()) as CustomersResponse;

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload.message ?? "No fue posible cargar los clientes.",
        );
      }

      setCustomers(payload.data ?? []);
      setPagination(payload.pagination ?? initialPagination);
      setHasLoaded(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible cargar los clientes.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, router, search, statusFilter]);

  useEffect(() => {
    // Carga inicial y recarga al cambiar paginación o filtros.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCustomers();
  }, [loadCustomers]);

useEffect(() => {
  const timeout = window.setTimeout(() => {
    const nextSearch = searchInput.trim();

    setPage(1);
    setSearch(nextSearch);
  }, 300);

  return () => window.clearTimeout(timeout);
}, [searchInput]);

  function clearSearch() {
    setSearchInput("");
    setSearch("");
    setPage(1);
  }

  function changeStatusFilter(value: StatusFilter) {
    setStatusFilter(value);
    setPage(1);
  }

  async function toggleCustomerStatus(customer: Customer) {
    if (updatingCustomerId) return;
    const nextStatus = !customer.isActive;

    setUpdatingCustomerId(customer.id);
    setError("");

    try {
      const response = await fetch(`/api/customers/${customer.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextStatus }),
      });

      const payload = await response.json().catch(() => ({}));

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload.message ?? "No fue posible actualizar al cliente.",
        );
      }

      setCustomers((current) =>
        current.map((item) =>
          item.id === customer.id ? { ...item, isActive: nextStatus } : item,
        ),
      );

      toast.success(nextStatus ? "Cliente reactivado" : "Cliente desactivado", {
        description: nextStatus
          ? `${customer.fullName} vuelve a estar activo.`
          : `${customer.fullName} fue desactivado correctamente.`,
      });
    } catch (caught) {
      toast.error("No pudimos actualizar al cliente", {
        description:
          caught instanceof Error
            ? caught.message
            : "Ocurrió un error inesperado.",
      });
    } finally {
      setUpdatingCustomerId(null);
      setStatusConfirmation(null);
    }
  }

  async function exportCustomersCsv() {
    if (exporting) return;

    setExporting(true);
    setExportProgress("Preparando...");

    try {
      const allCustomers: Customer[] = [];
      const pageSize = 100;
      let exportPage = 1;

      while (true) {
        setExportProgress(`Cargando clientes · página ${exportPage}`);
        const params = new URLSearchParams({
          page: String(exportPage),
          pageSize: String(pageSize),
        });
        const response = await fetch(`/api/customers?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as CustomersResponse;

        if (response.status === 401) {
          router.replace("/login");
          throw new Error("Tu sesión ha expirado.");
        }

        if (!response.ok) {
          throw new Error(
            payload.message ?? "No fue posible obtener todos los clientes.",
          );
        }

        allCustomers.push(...(Array.isArray(payload.data) ? payload.data : []));

        const totalPages = Math.max(
          1,
          Number(payload.pagination?.totalPages) || 1,
        );
        const hasNextPage =
          payload.pagination?.hasNextPage ?? exportPage < totalPages;

        if (!hasNextPage || exportPage >= totalPages) break;
        exportPage += 1;
      }

      const programsRequest = fetch("/api/programs", { cache: "no-store" });
      const details: CustomerDetail[] = [];
      const detailBatchSize = 6;

      for (let index = 0; index < allCustomers.length; index += detailBatchSize) {
        const batch = allCustomers.slice(index, index + detailBatchSize);
        const batchDetails = await Promise.all(
          batch.map(async (customer) => {
            const response = await fetch(
              `/api/customers/${encodeURIComponent(customer.id)}`,
              { cache: "no-store" },
            );
            const payload = (await response.json()) as CustomerDetailResponse;

            if (response.status === 401) {
              router.replace("/login");
              throw new Error("Tu sesión ha expirado.");
            }
            if (!response.ok || !payload.data) {
              throw new Error(
                payload.message ??
                  `No fue posible obtener el detalle de ${customer.fullName}.`,
              );
            }
            return payload.data;
          }),
        );
        details.push(...batchDetails);
        setExportProgress(
          `Detalles ${Math.min(index + batch.length, allCustomers.length)}/${allCustomers.length}`,
        );
      }

      const programsResponse = await programsRequest;
      const programsPayload = (await programsResponse.json()) as {
        message?: string;
        data?: ExportProgram[];
      };
      if (!programsResponse.ok) {
        throw new Error(
          programsPayload.message ?? "No fue posible obtener los programas.",
        );
      }
      const programsById = new Map(
        (programsPayload.data ?? []).map((program) => [program.id, program]),
      );

      const membershipsByCustomerProgram = new Map<string, ExportMembership>();
      let membershipPage = 1;
      while (true) {
        const query = new URLSearchParams({
          page: String(membershipPage),
          pageSize: "100",
        });
        const response = await fetch(`/api/subscription-memberships?${query}`, {
          cache: "no-store",
        });

        if (response.status === 404) break;
        const payload = (await response.json()) as {
          message?: string;
          data?: { items?: ExportMembership[] };
        };
        if (!response.ok) {
          throw new Error(
            payload.message ?? "No fue posible obtener las suscripciones.",
          );
        }

        const items = payload.data?.items ?? [];
        let added = 0;
        for (const membership of items) {
          const key = `${membership.customerId}:${membership.programId}`;
          if (!membershipsByCustomerProgram.has(key)) added += 1;
          membershipsByCustomerProgram.set(key, membership);
        }
        if (items.length === 0 || added === 0) break;
        membershipPage += 1;
      }

      setExportProgress("Generando archivo...");
      const headers = [
        "ID cliente",
        "Nombre(s)",
        "Apellidos",
        "Nombre completo",
        "Correo",
        "Teléfono",
        "Fecha de nacimiento",
        "Consentimiento de marketing",
        "Estado del cliente",
        "Fecha de alta del cliente",
        "Última actualización del cliente",
        "Última visita",
        "Total de tarjetas",
        "Tarjetas activas",
        "ID tarjeta",
        "Número de tarjeta",
        "Programa",
        "Modalidad",
        "Estado del programa",
        "Estado de la tarjeta",
        "Balance de la tarjeta según modalidad",
        "Acumulado histórico de la tarjeta",
        "Canjeado histórico de la tarjeta",
        "Transacciones",
        "Pases Wallet instalados",
        "Fecha de activación de la tarjeta",
        "Fecha de alta de la tarjeta",
        "Última actividad de la tarjeta",
        "Recompensa",
        "Descripción de recompensa",
        "Valor requerido para recompensa",
        "Plan de suscripción",
        "Estado de suscripción",
        "Inicio de vigencia de suscripción",
        "Fin de vigencia de suscripción",
        "Fecha de alta de suscripción",
      ];
      const dataRows = details.flatMap((customer) => {
        const cards: Array<CustomerCard | null> =
          customer.cards.length > 0 ? customer.cards : [null];

        return cards.map((card) => {
          const program = card ? programsById.get(card.programId) : undefined;
          const membership = card
            ? membershipsByCustomerProgram.get(
                `${customer.id}:${card.programId}`,
              )
            : undefined;

          return [
            customer.id,
            customer.firstName,
            customer.lastName ?? "",
            customer.fullName,
            customer.email ?? "",
            customer.phone ?? "",
            formatDateOnly(customer.birthDate, {}, ""),
            customer.marketingConsent ? "Sí" : "No",
            customer.isActive ? "Activo" : "Inactivo",
            formatDateTime(customer.createdAt, {}, ""),
            formatDateTime(customer.updatedAt, {}, ""),
            formatDateTime(customer.lastVisitAt, {}, ""),
            customer.summary.cardCount,
            customer.summary.activeCardCount,
            card?.id ?? "",
            card?.cardNumber ?? "",
            card?.programName ?? program?.name ?? "",
            programTypeLabel(program?.programType),
            program ? (program.isActive ? "Activo" : "Inactivo") : "",
            card ? (card.status === 1 ? "Activa" : "Inactiva") : "",
            card?.balance ?? "",
            card?.lifetimeEarned ?? "",
            card?.lifetimeRedeemed ?? "",
            card?.transactionCount ?? "",
            card?.walletPassCount ?? "",
            formatDateTime(card?.activatedAt, {}, ""),
            formatDateTime(card?.createdAt, {}, ""),
            formatDateTime(card?.lastActivityAt, {}, ""),
            program?.reward?.name ?? "",
            program?.reward?.description ?? "",
            program?.reward?.requiredValue ?? "",
            membership?.currentPlanName ?? "",
            membershipStatusLabel(membership?.status),
            formatDateTime(membership?.currentTermStartsAtUtc, {}, ""),
            formatDateTime(membership?.currentTermEndsAtUtc, {}, ""),
            formatDateTime(membership?.createdAtUtc, {}, ""),
          ];
        });
      });
      const rows = [
        headers,
        ...dataRows,
      ];
      const csv = `\uFEFF${rows
        .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
        .join("\r\n")}`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const download = document.createElement("a");
      download.href = url;
      download.download = `fidara-clientes-${localDateStamp(new Date())}.csv`;
      document.body.appendChild(download);
      download.click();
      download.remove();
      URL.revokeObjectURL(url);

      toast.success("Clientes exportados", {
        description: `${details.length} clientes y ${dataRows.length} filas incluidos en el CSV.`,
      });
    } catch (caught) {
      toast.error("No se pudo exportar el CSV", {
        description:
          caught instanceof Error
            ? caught.message
            : "Ocurrió un error inesperado.",
      });
    } finally {
      setExporting(false);
      setExportProgress("");
    }
  }

  const initialLoading = loading && !hasLoaded;

  if (initialLoading) {
    return <CustomersSkeleton />;
  }

  return (
    <main className={styles.page + " " + poppins.className}>
      <span className="sr-only" role="status">
        {loading ? "Actualizando clientes…" : ""}
      </span>
      <section className={styles.heading}>
        <div>
          <h1>Clientes</h1>
        </div>

        <div className={styles.headingActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={exporting}
            onClick={() => void exportCustomersCsv()}
          >
            {exporting ? (
              <LoaderCircle className={styles.buttonSpinner} size={18} />
            ) : (
              <FileSpreadsheet size={18} />
            )}
            {exporting ? exportProgress || "Exportando..." : "Exportar CSV"}
          </button>
        </div>
      </section>

      {error && (
        <div className={styles.errorBox}>
          <span>{error}</span>
          <button type="button" onClick={() => void loadCustomers()}>
            Intentar nuevamente
          </button>
        </div>
      )}

      <section className={styles.panel} aria-busy={loading}>
        <div className={styles.toolbar}>
<div className={styles.searchBox}>
  <Search size={18} />

  <input
    type="search"
    value={searchInput}
    onChange={(event) => setSearchInput(event.target.value)}
    placeholder="Buscar por nombre, correo, teléfono o tarjeta"
    aria-label="Buscar clientes"
  />

  {searchInput && (
    <button
      type="button"
      className={styles.clearSearch}
      onClick={clearSearch}
      aria-label="Limpiar búsqueda"
    >
      <X size={16} />
    </button>
  )}
</div>

          <div className={styles.filters}>
            {(["all", "active", "inactive"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                className={statusFilter === filter ? styles.selectedFilter : ""}
                aria-pressed={statusFilter === filter}
                onClick={() => changeStatusFilter(filter)}
              >
                {filter === "all"
                  ? "Todos"
                  : filter === "active"
                    ? "Activos"
                    : "Inactivos"}
              </button>
            ))}
          </div>
        </div>

        {customers.length === 0 ? (
          <div className={styles.emptyState}>
            <span>
              <Users size={29} />
            </span>
            <h2>
              {search
                ? "No encontramos coincidencias"
                : "Todavía no tienes clientes"}
            </h2>
            <p>
              {search
                ? "Prueba con otro nombre, correo, teléfono o número de tarjeta."
                : "Los clientes aparecerán aquí cuando se inscriban en uno de tus programas."}
            </p>
            {search && (
              <button type="button" onClick={clearSearch}>
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <>
            <CustomersListHeader />

            <div className={styles.customerList}>
              {customers.map((customer) => {
                const profileHref = "/dashboard/clientes/" + customer.id;
                const openProfile = () => router.push(profileHref);

                return (
                  <article
                    className={styles.customerRow}
                    key={customer.id}
                    role="link"
                    tabIndex={0}
                    onClick={(event) => {
                      const target = event.target as Element;
                      if (target.closest("button, a, [role='menuitem']")) return;
                      openProfile();
                    }}
                    onKeyDown={(event) => {
                      if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault();
                        openProfile();
                      }
                    }}
                  >
                    <div className={styles.customerIdentity}>
                      <span className={styles.avatar}>
                        {getInitials(customer)}
                      </span>
                      <div>
                        <Link href={profileHref}>
                          {customer.fullName}
                        </Link>
                      </div>
                    </div>

                    <div className={styles.customerEmail}>
                      <small>Correo</small>
                      <span>{customer.email?.trim() || "—"}</span>
                    </div>

                    <div className={styles.customerPhone}>
                      <small>Teléfono</small>
                      <span>{customer.phone?.trim() || "—"}</span>
                    </div>

                    <div className={styles.customerCards}>
                      <small>Tarjetas</small>
                      <div>
                        <CreditCard size={16} />
                        <strong>
                          {customer.cardCount}{" "}
                          {customer.cardCount === 1 ? "tarjeta" : "tarjetas"}
                        </strong>
                      </div>
                    </div>

                    <div className={styles.customerBirthday}>
                      <small>Cumpleaños</small>
                      <div>
                        <CalendarDays size={16} />
                        <strong>{formatBirthday(customer.birthDate)}</strong>
                      </div>
                    </div>

                    <div className={styles.customerActivity}>
                      <small>Última actividad</small>
                      <strong>
                        {formatDate(
                          customer.lastActivityAt ?? customer.lastVisitAt,
                          {},
                          "Sin actividad",
                        )}
                      </strong>
                    </div>

                    <div className={styles.customerActions}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={"Acciones para " + customer.fullName}
                          className={styles.actionsTrigger}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <MoreHorizontal size={20} aria-hidden="true" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className={poppins.className + " min-w-40 border border-[#E5E7EB] bg-white p-1.5 text-[#111827] shadow-lg ring-0"}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <DropdownMenuItem onClick={openProfile} className={styles.actionItem}>
                            Ver más
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={Boolean(updatingCustomerId)}
                            onClick={() => setStatusConfirmation({ customer, nextStatus: !customer.isActive })}
                            className={styles.actionItem}
                          >
                            {customer.isActive ? "Desactivar" : "Activar"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className={styles.pagination}>
              <span>
                Página {pagination.page}
                {pagination.totalPages > 0 && ` de ${pagination.totalPages}`}
                {" · "}
                {pagination.total} clientes
              </span>

              <div>
                <button
                  type="button"
                  disabled={loading || !pagination.hasPreviousPage}
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                >
                  <ArrowLeft size={17} />
                  Anterior
                </button>
                <button
                  type="button"
                  className={styles.nextPage}
                  disabled={loading || !pagination.hasNextPage}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Siguiente
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {statusConfirmation && (
        <FidaraConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setStatusConfirmation(null);
          }}
          busy={Boolean(updatingCustomerId)}
          icon={statusConfirmation.nextStatus ? <Check size={22} /> : <AlertTriangle size={22} />}
          iconClassName={statusConfirmation.nextStatus ? "bg-emerald-50 text-emerald-700" : undefined}
          title={statusConfirmation.nextStatus ? "¿Reactivar cliente?" : "¿Desactivar cliente?"}
          description={
            statusConfirmation.nextStatus
              ? statusConfirmation.customer.fullName + " volverá a aparecer como cliente activo."
              : statusConfirmation.customer.fullName + " será desactivado, pero conservará sus tarjetas y su historial."
          }
          confirmLabel={statusConfirmation.nextStatus ? "Sí, reactivar" : "Sí, desactivar"}
          confirmClassName={statusConfirmation.nextStatus ? "bg-[#047857] hover:bg-[#065F46] shadow-emerald-700/20" : undefined}
          onConfirm={() => void toggleCustomerStatus(statusConfirmation.customer)}
        />
      )}

    </main>
  );
}

function CustomersListHeader({ skeleton = false }: { skeleton?: boolean }) {
  return (
    <div className={styles.listHeader}>
      {["Cliente", "Correo", "Teléfono", "Tarjetas", "Cumpleaños", "Última actividad", "Acciones"].map((label) => (
        skeleton ? <span key={label} className={styles.skeletonLine} /> : <span key={label}>{label}</span>
      ))}
    </div>
  );
}

function CustomersSkeleton() {
  return (
    <main className={styles.page + " " + poppins.className}>
      <span className="sr-only" role="status">Cargando clientes…</span>
      <div
        aria-hidden="true"
        className={styles.page + " " + styles.skeleton + " motion-safe:animate-pulse motion-safe:[animation-duration:2.5s]"}
      >
        <section className={styles.heading}>
          <div className={styles.skeletonTitle} />
          <div className={styles.headingActions}>
            <span className={styles.skeletonExport} />
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <span className={styles.skeletonSearchIcon} />
              <span className={styles.skeletonSearchText} />
            </div>
            <div className={styles.filters}>
              {["all", "active", "inactive"].map((filter) => (
                <span className={styles.skeletonFilter} key={filter} />
              ))}
            </div>
          </div>

          <CustomersListHeader skeleton />
          <div className={styles.customerList}>
            {Array.from({ length: 6 }, (_, index) => (
              <div className={styles.customerRow} key={index}>
                <div className={styles.customerIdentity}>
                  <div className={styles.skeletonAvatar} />
                  <div className={styles.skeletonName} />
                </div>
                {[styles.customerEmail, styles.customerPhone, styles.customerCards, styles.customerBirthday, styles.customerActivity].map((cell) => (
                  <div className={cell} key={cell}>
                    <small><span className={styles.skeletonLine} /></small>
                    <span className={styles.skeletonValue} />
                  </div>
                ))}
                <div className={styles.customerActions}><span className={styles.skeletonAction} /></div>
              </div>
            ))}
          </div>

          <div className={styles.pagination}>
            <span className={styles.skeletonSummary} />
            <div>
              <span className={styles.skeletonPageButton} />
              <span className={styles.skeletonPageButton} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
