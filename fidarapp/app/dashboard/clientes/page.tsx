"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  LoaderCircle,
  Search,
  Stamp,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

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

type StatusFilter =
  | "all"
  | "active"
  | "inactive";

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "Sin actividad";
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getInitials(customer: Customer) {
  const first =
    customer.firstName?.trim().charAt(0) ?? "";

  const last =
    customer.lastName?.trim().charAt(0) ?? "";

  return `${first}${last || first}`
    .toUpperCase();
}

export default function CustomersPage() {
  const router = useRouter();

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [pagination, setPagination] =
    useState<Pagination>({
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    });

  const [searchInput, setSearchInput] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [page, setPage] =
    useState(1);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [updatingCustomerId, setUpdatingCustomerId] =
    useState<string | null>(null);

  const loadCustomers = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const params =
          new URLSearchParams();

        params.set(
          "page",
          page.toString(),
        );

        params.set(
          "pageSize",
          "20",
        );

        if (search) {
          params.set("search", search);
        }

        if (statusFilter !== "all") {
          params.set(
            "isActive",
            statusFilter === "active"
              ? "true"
              : "false",
          );
        }

        const response = await fetch(
          `/api/customers?${params.toString()}`,
          {
            cache: "no-store",
          },
        );

        const payload =
          (await response.json()) as CustomersResponse;

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error(
            payload.message ??
              "No fue posible cargar los clientes.",
          );
        }

        setCustomers(payload.data ?? []);

        setPagination(
          payload.pagination,
        );
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "No fue posible cargar los clientes.",
        );
      } finally {
        setLoading(false);
      }
    },
    [
      page,
      router,
      search,
      statusFilter,
    ],
  );

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  function handleSearch(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setPage(1);
    setSearch(searchInput.trim());
  }

  function clearSearch() {
    setSearchInput("");
    setSearch("");
    setPage(1);
  }

  function changeStatusFilter(
    value: StatusFilter,
  ) {
    setStatusFilter(value);
    setPage(1);
  }

  async function toggleCustomerStatus(
    customer: Customer,
  ) {
    if (
      customer.isActive &&
      !window.confirm(
        `¿Deseas desactivar a ${customer.fullName}?`,
      )
    ) {
      return;
    }

    setUpdatingCustomerId(customer.id);
    setError("");

    try {
      const response = await fetch(
        `/api/customers/${customer.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: !customer.isActive,
          }),
        },
      );

      const payload = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload.message ??
            "No fue posible actualizar al cliente.",
        );
      }

      setCustomers((current) =>
        current.map((item) =>
          item.id === customer.id
            ? {
                ...item,
                isActive:
                  !customer.isActive,
              }
            : item,
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible actualizar al cliente.",
      );
    } finally {
      setUpdatingCustomerId(null);
    }
  }

  const activeCustomers =
    customers.filter(
      (customer) => customer.isActive,
    ).length;

  const installedCards =
    customers.reduce(
      (total, customer) =>
        total + customer.walletPassCount,
      0,
    );

  const accumulatedBalance =
    customers.reduce(
      (total, customer) =>
        total + customer.totalBalance,
      0,
    );

  return (
    <>
      <section className="dashboard-welcome customers-heading">
        <div>
          <span className="page-eyebrow">
            Comunidad
          </span>

          <h1>Clientes</h1>

          <p>
            Consulta sus tarjetas, actividad y progreso
            dentro de tus programas.
          </p>
        </div>

        <Link
          href="/dashboard/escanear"
          className="primary-action"
        >
          <Stamp size={20} />
          Agregar sello
        </Link>
      </section>

      {error && (
        <div className="dashboard-error error-box">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => void loadCustomers()}
          >
            Intentar nuevamente
          </button>
        </div>
      )}

      <section className="customer-metrics">
        <article>
          <span className="customer-metric-icon coral">
            <Users size={20} />
          </span>

          <div>
            <small>Total de clientes</small>

            <strong>
              {loading
                ? "—"
                : pagination.total}
            </strong>
          </div>
        </article>

        <article>
          <span className="customer-metric-icon mint">
            <UserRound size={20} />
          </span>

          <div>
            <small>
              Activos en esta página
            </small>

            <strong>
              {loading
                ? "—"
                : activeCustomers}
            </strong>
          </div>
        </article>

        <article>
          <span className="customer-metric-icon lilac">
            <WalletCards size={20} />
          </span>

          <div>
            <small>
              Pases instalados
            </small>

            <strong>
              {loading
                ? "—"
                : installedCards}
            </strong>
          </div>
        </article>

        <article>
          <span className="customer-metric-icon sun">
            <Stamp size={20} />
          </span>

          <div>
            <small>
              Saldo en esta página
            </small>

            <strong>
              {loading
                ? "—"
                : accumulatedBalance}
            </strong>
          </div>
        </article>
      </section>

      <section className="customers-panel">
        <div className="customers-toolbar">
          <form
            className="customers-search"
            onSubmit={handleSearch}
          >
            <Search size={19} />

            <input
              value={searchInput}
              onChange={(event) =>
                setSearchInput(
                  event.target.value,
                )
              }
              placeholder="Buscar por nombre, correo, teléfono o tarjeta"
              aria-label="Buscar clientes"
            />

            {searchInput && (
              <button
                type="button"
                className="clear-customer-search"
                onClick={clearSearch}
                aria-label="Limpiar búsqueda"
              >
                <X size={17} />
              </button>
            )}

            <button
              type="submit"
              className="customer-search-button"
            >
              Buscar
            </button>
          </form>

          <div className="customer-filters">
            <button
              type="button"
              className={
                statusFilter === "all"
                  ? "active"
                  : ""
              }
              onClick={() =>
                changeStatusFilter("all")
              }
            >
              Todos
            </button>

            <button
              type="button"
              className={
                statusFilter === "active"
                  ? "active"
                  : ""
              }
              onClick={() =>
                changeStatusFilter("active")
              }
            >
              Activos
            </button>

            <button
              type="button"
              className={
                statusFilter === "inactive"
                  ? "active"
                  : ""
              }
              onClick={() =>
                changeStatusFilter("inactive")
              }
            >
              Inactivos
            </button>
          </div>
        </div>

        {loading ? (
          <div className="customers-loading">
            <LoaderCircle
              className="scanner-spinner"
              size={27}
            />

            <span>
              Cargando clientes...
            </span>
          </div>
        ) : customers.length === 0 ? (
          <div className="customer-empty-state">
            <span>
              <Users size={28} />
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
              <button
                type="button"
                onClick={clearSearch}
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="customers-table-header">
              <span>Cliente</span>
              <span>Tarjetas</span>
              <span>Saldo</span>
              <span>Última actividad</span>
              <span>Estado</span>
              <span />
            </div>

            <div className="customers-list">
              {customers.map((customer) => (
                <article
                  className="customer-row"
                  key={customer.id}
                >
                  <div className="customer-identity">
                    <span className="customer-avatar">
                      {getInitials(customer)}
                    </span>

                    <div>
                      <Link
                        href={`/dashboard/clientes/${customer.id}`}
                      >
                        {customer.fullName}
                      </Link>

                      <span>
                        {customer.email ??
                          customer.phone ??
                          "Sin información de contacto"}
                      </span>
                    </div>
                  </div>

                  <div className="customer-cell">
                    <CreditCard size={16} />

                    <span>
                      {customer.activeCardCount}
                      {" "}
                      {customer.activeCardCount === 1
                        ? "activa"
                        : "activas"}
                    </span>

                    {customer.walletPassCount > 0 && (
                      <small>
                        {customer.walletPassCount}
                        {" en Wallet"}
                      </small>
                    )}
                  </div>

                  <div className="customer-cell">
                    <Stamp size={16} />

                    <strong>
                      {customer.totalBalance}
                    </strong>

                    <small>
                      sellos disponibles
                    </small>
                  </div>

                  <div className="customer-cell">
                    <span>
                      {formatDate(
                        customer.lastActivityAt ??
                          customer.lastVisitAt,
                      )}
                    </span>

                    <small>
                      Alta:{" "}
                      {formatDate(
                        customer.createdAt,
                      )}
                    </small>
                  </div>

                  <div>
                    <span
                      className={[
                        "customer-status",
                        customer.isActive
                          ? "active"
                          : "inactive",
                      ].join(" ")}
                    >
                      {customer.isActive
                        ? "Activo"
                        : "Inactivo"}
                    </span>
                  </div>

                  <div className="customer-row-actions">
                    <button
                      type="button"
                      className="customer-status-button"
                      disabled={
                        updatingCustomerId ===
                        customer.id
                      }
                      onClick={() =>
                        void toggleCustomerStatus(
                          customer,
                        )
                      }
                      title={
                        customer.isActive
                          ? "Desactivar cliente"
                          : "Activar cliente"
                      }
                    >
                      {updatingCustomerId ===
                      customer.id ? (
                        <LoaderCircle
                          className="scanner-spinner"
                          size={17}
                        />
                      ) : customer.isActive ? (
                        <X size={17} />
                      ) : (
                        <Check size={17} />
                      )}
                    </button>

                    <Link
                      href={`/dashboard/clientes/${customer.id}`}
                      aria-label={`Ver a ${customer.fullName}`}
                    >
                      <ArrowRight size={18} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <div className="customers-pagination">
              <span>
                Página {pagination.page}
                {pagination.totalPages > 0 &&
                  ` de ${pagination.totalPages}`}
                {" · "}
                {pagination.total} clientes
              </span>

              <div>
                <button
                  type="button"
                  disabled={
                    !pagination.hasPreviousPage
                  }
                  onClick={() =>
                    setPage((current) =>
                      Math.max(
                        current - 1,
                        1,
                      ),
                    )
                  }
                >
                  <ArrowLeft size={17} />
                  Anterior
                </button>

                <button
                  type="button"
                  disabled={
                    !pagination.hasNextPage
                  }
                  onClick={() =>
                    setPage((current) =>
                      current + 1,
                    )
                  }
                >
                  Siguiente
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}