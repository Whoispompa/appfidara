"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CreditCard,
  Gift,
  LoaderCircle,
  QrCode,
  Stamp,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type RecentTransaction = {
  id: string;
  transactionType: number;
  type: "StampAdded" | "RewardRedeemed";
  customerName: string;
  programName: string;
  rewardName?: string | null;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAtUtc: string;
};

type DashboardSummary = {
  organizationName: string;
  date: string;
  stampsAddedToday: number;
  customersServedToday: number;
  rewardsRedeemedToday: number;
  installedCards: number;

  installedCardsByPlatform: {
    apple: number;
    google: number;
  };

  recentTransactions: RecentTransaction[];
};

function formatMovementDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function DashboardPage() {
  const router = useRouter();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/dashboard/summary", {
        cache: "no-store",
      });

      const payload = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
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
    void loadDashboard();
  }, [loadDashboard]);

  const metrics = [
    {
      label: "Sellos agregados hoy",
      value: summary?.stampsAddedToday ?? 0,
      note: "Registrados durante el día",
      icon: Stamp,
      tone: "coral",
    },
    {
      label: "Clientes atendidos",
      value: summary?.customersServedToday ?? 0,
      note: "Clientes distintos hoy",
      icon: Users,
      tone: "mint",
    },
    {
      label: "Recompensas canjeadas",
      value: summary?.rewardsRedeemedToday ?? 0,
      note: "Entregadas durante el día",
      icon: Gift,
      tone: "sun",
    },
    {
      label: "Tarjetas instaladas",
      value: summary?.installedCards ?? 0,
      note: "Apple y Google Wallet",
      icon: CreditCard,
      tone: "lilac",
    },
  ];

  return (
    <>
      <section className="dashboard-welcome">
        <div>
          <span className="page-eyebrow">Resumen del negocio</span>

          <h1>Tu programa de lealtad.</h1>

          <p>
            Actividad actual de {summary?.organizationName ?? "tu negocio"}.
          </p>
        </div>

        <Link href="/dashboard/escanear" className="primary-action">
          <QrCode size={21} />
          Escanear tarjeta
        </Link>
      </section>

      {error && (
        <div className="dashboard-error error-box">
          <span>{error}</span>

          <button type="button" onClick={loadDashboard}>
            Intentar nuevamente
          </button>
        </div>
      )}

      <section className="metrics-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article className="metric-card" key={metric.label}>
              <span className={`metric-icon ${metric.tone}`}>
                <Icon size={20} />
              </span>

              <p>{metric.label}</p>

              {loading ? (
                <span className="metric-loading" />
              ) : (
                <strong>{metric.value}</strong>
              )}

              <small>{metric.note}</small>
            </article>
          );
        })}
      </section>

      <section className="dashboard-grid">
        <article className="activity-card">
          <div className="section-heading">
            <div>
              <span className="page-eyebrow">Actividad</span>

              <h2>Movimientos recientes</h2>
            </div>

            <button type="button" onClick={loadDashboard} disabled={loading}>
              {loading ? (
                <LoaderCircle className="scanner-spinner" size={17} />
              ) : (
                "Actualizar"
              )}
            </button>
          </div>

          {!loading && summary?.recentTransactions.length === 0 ? (
            <div className="empty-state">
              <span>
                <Stamp size={25} />
              </span>

              <h3>Aún no hay movimientos</h3>

              <p>
                Cuando agregues un sello o canjees una recompensa, aparecerá
                aquí.
              </p>

              <Link href="/dashboard/escanear">
                Realizar primera operación
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="activity-list">
              {summary?.recentTransactions.map((movement) => {
                const isReward = movement.type === "RewardRedeemed";

                return (
                  <div className="activity-item" key={movement.id}>
                    <span
                      className={[
                        "activity-icon",
                        isReward ? "reward" : "stamp",
                      ].join(" ")}
                    >
                      {isReward ? <Gift size={18} /> : <Stamp size={18} />}
                    </span>

                    <div className="activity-copy">
                      <strong>{movement.customerName}</strong>

                      <span>
                        {isReward
                          ? `Canjeó ${movement.rewardName ?? "una recompensa"}`
                          : "Recibió un sello"}
                      </span>
                    </div>

                    <div className="activity-meta">
                      <strong>
                        {movement.balanceBefore}
                        {" → "}
                        {movement.balanceAfter}
                      </strong>

                      <time>{formatMovementDate(movement.createdAtUtc)}</time>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <aside className="quick-card">
          <span className="page-eyebrow">Tarjetas instaladas</span>

          <h2>Clientes con Fidara en su Wallet</h2>

          <p>Consulta cómo se distribuyen las instalaciones activas.</p>

          <div className="wallet-platforms">
            <div>
              <span>Apple Wallet</span>

              <strong>{summary?.installedCardsByPlatform.apple ?? 0}</strong>
            </div>

            <div>
              <span>Google Wallet</span>

              <strong>{summary?.installedCardsByPlatform.google ?? 0}</strong>
            </div>
          </div>

          <Link href="/dashboard/clientes">
            Ver clientes
            <ArrowRight size={16} />
          </Link>
        </aside>
      </section>
    </>
  );
}
