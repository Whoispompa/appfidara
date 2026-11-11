"use client";

import { formatDate } from "@/components/lib/date-time";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  Search,
  Stamp,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import {useCallback, useEffect, useState } from "react";

import styles from "./customers.module.css";

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

type StatusFilter = "all" | "active" | "inactive";

type StatusConfirmation = {
  customer: Customer;
  nextStatus: boolean;
} | null;

type ToastMessage = {
  type: "success" | "error";
  title: string;
  message: string;
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

export default function CustomersPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingCustomerId, setUpdatingCustomerId] = useState<string | null>(
    null,
  );
  const [statusConfirmation, setStatusConfirmation] =
    useState<StatusConfirmation>(null);
  const [toast, setToast] = useState<ToastMessage>(null);

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
    void loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (!toast) return;

    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!statusConfirmation) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [statusConfirmation]);

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
    const nextStatus = !customer.isActive;

    setUpdatingCustomerId(customer.id);
    setStatusConfirmation(null);
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

      setToast({
        type: "success",
        title: nextStatus ? "Cliente reactivado" : "Cliente desactivado",
        message: nextStatus
          ? `${customer.fullName} vuelve a estar activo.`
          : `${customer.fullName} fue desactivado correctamente.`,
      });
    } catch (caught) {
      setToast({
        type: "error",
        title: "No pudimos actualizar al cliente",
        message:
          caught instanceof Error
            ? caught.message
            : "Ocurrió un error inesperado.",
      });
    } finally {
      setUpdatingCustomerId(null);
    }
  }

  const activeCustomers = customers.filter(
    (customer) => customer.isActive,
  ).length;

  const installedCards = customers.reduce(
    (total, customer) => total + customer.walletPassCount,
    0,
  );

  const accumulatedBalance = customers.reduce(
    (total, customer) => total + customer.totalBalance,
    0,
  );

  return (
    <main className={styles.page}>
      <section className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>COMUNIDAD</span>
          <h1>Clientes</h1>
          <p>
            Consulta sus tarjetas, actividad y progreso dentro de tus programas.
          </p>
        </div>

        <Link href="/dashboard/escanear" className={styles.primaryButton}>
          <Stamp size={19} />
          Agregar sello
        </Link>
      </section>

      <section className={styles.metrics}>
        <article>
          <span className={`${styles.metricIcon} ${styles.coral}`}>
            <Users size={21} />
          </span>
          <div>
            <small>Total de clientes</small>
            <strong>{loading ? "—" : pagination.total}</strong>
          </div>
        </article>

        <article>
          <span className={`${styles.metricIcon} ${styles.mint}`}>
            <UserRound size={21} />
          </span>
          <div>
            <small>Activos en esta página</small>
            <strong>{loading ? "—" : activeCustomers}</strong>
          </div>
        </article>

        <article>
          <span className={`${styles.metricIcon} ${styles.lilac}`}>
            <WalletCards size={21} />
          </span>
          <div>
            <small>Pases instalados</small>
            <strong>{loading ? "—" : installedCards}</strong>
          </div>
        </article>

        <article>
          <span className={`${styles.metricIcon} ${styles.sun}`}>
            <Stamp size={21} />
          </span>
          <div>
            <small>Saldo en esta página</small>
            <strong>{loading ? "—" : accumulatedBalance}</strong>
          </div>
        </article>
      </section>

      {error && (
        <div className={styles.errorBox}>
          <span>{error}</span>
          <button type="button" onClick={() => void loadCustomers()}>
            Intentar nuevamente
          </button>
        </div>
      )}

      <section className={styles.panel}>
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

        {loading ? (
          <div className={styles.loadingState}>
            <LoaderCircle className={styles.spinner} size={28} />
            <span>Cargando clientes…</span>
          </div>
        ) : customers.length === 0 ? (
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
            <div className={styles.listHeader}>
              <span>Cliente</span>
              <span>Tarjetas</span>
              <span>Saldo</span>
              <span>Última actividad</span>
              <span>Estado</span>
              <span />
            </div>

            <div className={styles.customerList}>
              {customers.map((customer) => {
                const updating = updatingCustomerId === customer.id;

                return (
                  <article
  className={styles.customerRow}
  key={customer.id}
  role="link"
  tabIndex={0}
  onClick={(event) => {
    const target = event.target as HTMLElement;

    if (target.closest("button, a")) return;

    router.push(`/dashboard/clientes/${customer.id}`);
  }}
  onKeyDown={(event) => {
    if (
      event.target === event.currentTarget &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      router.push(`/dashboard/clientes/${customer.id}`);
    }
  }}
>
                    <div className={styles.customerIdentity}>
                      <span className={styles.avatar}>
                        {getInitials(customer)}
                      </span>
                      <div>
                        <Link href={`/dashboard/clientes/${customer.id}`}>
                          {customer.fullName}
                        </Link>
                        <span>
                          {customer.email ??
                            customer.phone ??
                            "Sin información de contacto"}
                        </span>
                        {customer.email && customer.phone && (
                          <small>{customer.phone}</small>
                        )}
                      </div>
                    </div>

                    <div className={styles.customerCards}>
                      <small>Tarjetas</small>
                      <div>
                        <CreditCard size={16} />
                        <strong>
                          {customer.activeCardCount}{" "}
                          {customer.activeCardCount === 1
                            ? "activa"
                            : "activas"}
                        </strong>
                      </div>
                      <span>
                        {customer.walletPassCount > 0
                          ? `${customer.walletPassCount} en Wallet`
                          : "Sin pase instalado"}
                      </span>
                    </div>

                    <div className={styles.customerBalance}>
                      <small>Saldo</small>
                      <div>
                        <Stamp size={16} />
                        <strong>{customer.totalBalance}</strong>
                      </div>
                      <span>sellos disponibles</span>
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
                      <span>
                        Alta:{" "}
                        {formatDate(
                          customer.createdAt,
                          {},
                          "Fecha no disponible",
                        )}
                      </span>
                    </div>

                    <div className={styles.customerState}>
                      <span
                        className={
                          customer.isActive
                            ? styles.activeBadge
                            : styles.inactiveBadge
                        }
                      >
                        <i />
                        {customer.isActive ? "Activo" : "Inactivo"}
                      </span>
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
                  disabled={!pagination.hasPreviousPage}
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                >
                  <ArrowLeft size={17} />
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={!pagination.hasNextPage}
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
        <div
          className={styles.confirmBackdrop}
          role="presentation"
          onMouseDown={() => setStatusConfirmation(null)}
        >
          <section
            className={styles.confirmDialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="customer-status-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.confirmHeading}>
              <span
                className={
                  statusConfirmation.nextStatus
                    ? styles.confirmIconSuccess
                    : styles.confirmIconDanger
                }
              >
                {statusConfirmation.nextStatus ? (
                  <Check size={22} />
                ) : (
                  <AlertTriangle size={22} />
                )}
              </span>

              <h2 id="customer-status-dialog-title">
                {statusConfirmation.nextStatus
                  ? "¿Reactivar cliente?"
                  : "¿Desactivar cliente?"}
              </h2>

              <button
                type="button"
                className={styles.confirmClose}
                onClick={() => setStatusConfirmation(null)}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <p>
              {statusConfirmation.nextStatus
                ? `${statusConfirmation.customer.fullName} volverá a aparecer como cliente activo.`
                : `${statusConfirmation.customer.fullName} será desactivado, pero conservará sus tarjetas y su historial.`}
            </p>

            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setStatusConfirmation(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={
                  statusConfirmation.nextStatus
                    ? styles.confirmSuccessButton
                    : styles.confirmDangerButton
                }
                onClick={() =>
                  void toggleCustomerStatus(statusConfirmation.customer)
                }
              >
                {statusConfirmation.nextStatus ? (
                  <Check size={17} />
                ) : (
                  <X size={17} />
                )}
                {statusConfirmation.nextStatus
                  ? "Sí, reactivar"
                  : "Sí, desactivar"}
              </button>
            </div>
          </section>
        </div>
      )}

      {toast && (
        <div
          className={`${styles.toast} ${
            toast.type === "success" ? styles.toastSuccess : styles.toastError
          }`}
          role="status"
          aria-live="polite"
        >
          <span className={styles.toastIcon}>
            {toast.type === "success" ? (
              <CheckCircle2 size={19} />
            ) : (
              <AlertTriangle size={19} />
            )}
          </span>
          <div>
            <strong>{toast.title}</strong>
            <p>{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Cerrar notificación"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </main>
  );
}
