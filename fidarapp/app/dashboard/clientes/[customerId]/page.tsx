"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Gift,
  Link2,
  LoaderCircle,
  Mail,
  Megaphone,
  Phone,
  QrCode,
  Stamp,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useState } from "react";

type CustomerCard = {
  id: string;
  programId: string;
  programName: string;
  cardNumber: string;
  qrToken: string;
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
  organizationId: string;
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
    totalBalance: number;
    lifetimeEarned: number;
    lifetimeRedeemed: number;
  };
  cards: CustomerCard[];
};

type CustomerResponse = {
  success: boolean;
  message?: string;
  data: CustomerDetail;
};

const getAppUrl =
  process.env.NEXT_PUBLIC_GET_APP_URL ?? "https://get.fidara.mx";

function formatDate(value?: string | null, includeTime = false) {
  if (!value) return "Sin actividad";

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime
      ? { hour: "2-digit", minute: "2-digit" }
      : {}),
  }).format(new Date(value));
}

function getInitials(customer: CustomerDetail) {
  const first = customer.firstName?.trim().charAt(0) ?? "";
  const last = customer.lastName?.trim().charAt(0) ?? "";

  return `${first}${last || first}`.toUpperCase();
}

export default function CustomerDetailPage() {
  const params = useParams<{ customerId: string }>();
  const router = useRouter();
  const customerId = params.customerId;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);
  const [recoveryCard, setRecoveryCard] = useState<CustomerCard | null>(null);
  const [recoveryLinkCopied, setRecoveryLinkCopied] = useState(false);

  const recoveryUrl = recoveryCard?.qrToken
    ? `${getAppUrl}/card/${encodeURIComponent(recoveryCard.qrToken)}`
    : "";

  const loadCustomer = useCallback(async () => {
    if (!customerId) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as CustomerResponse;

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (response.status === 404) {
        router.replace("/dashboard/clientes");
        return;
      }

      if (!response.ok) {
        throw new Error(payload.message ?? "No fue posible cargar al cliente.");
      }

      setCustomer(payload.data);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible cargar al cliente.",
      );
    } finally {
      setLoading(false);
    }
  }, [customerId, router]);

  useEffect(() => {
    void loadCustomer();
  }, [loadCustomer]);

  useEffect(() => {
    if (!recoveryCard) return;

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeRecoveryModal();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeWithEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [recoveryCard]);

  async function updateStatus() {
    if (!customer) return;

    if (
      customer.isActive &&
      !window.confirm(`¿Deseas desactivar a ${customer.fullName}?`)
    ) {
      return;
    }

    setUpdatingStatus(true);
    setError("");

    try {
      const response = await fetch(`/api/customers/${customer.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !customer.isActive }),
      });
      const payload = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(payload.message ?? "No fue posible actualizar al cliente.");
      }

      setCustomer((current) =>
        current ? { ...current, isActive: !current.isActive } : current,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible actualizar al cliente.",
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function copyCardNumber(card: CustomerCard) {
    try {
      await navigator.clipboard.writeText(card.cardNumber);
      setCopiedCardId(card.id);
      window.setTimeout(() => setCopiedCardId(null), 1800);
    } catch {
      setError("No fue posible copiar el número de tarjeta.");
    }
  }

  function openRecoveryModal(card: CustomerCard) {
    if (!card.qrToken) {
      setError(
        "Esta tarjeta todavía no tiene disponible su enlace de recuperación.",
      );
      return;
    }

    setRecoveryLinkCopied(false);
    setRecoveryCard(card);
  }

  function closeRecoveryModal() {
    setRecoveryCard(null);
    setRecoveryLinkCopied(false);
  }

  async function copyRecoveryLink() {
    if (!recoveryUrl) return;

    try {
      await navigator.clipboard.writeText(recoveryUrl);
      setRecoveryLinkCopied(true);
      window.setTimeout(() => setRecoveryLinkCopied(false), 1800);
    } catch {
      setError("No fue posible copiar el enlace de recuperación.");
    }
  }

  if (loading) {
    return (
      <div className="customer-detail-loading">
        <LoaderCircle className="scanner-spinner" size={31} />
        <span>Cargando información del cliente...</span>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="customer-detail-loading">
        <UserRound size={31} />
        <h2>No encontramos al cliente</h2>
        <Link href="/dashboard/clientes">Volver a clientes</Link>
      </div>
    );
  }

  return (
    <>
      <div className="customer-detail-back">
        <Link href="/dashboard/clientes">
          <ArrowLeft size={17} />
          Volver a clientes
        </Link>
      </div>

      <section className="customer-profile-heading">
        <div className="customer-profile-main">
          <span className="customer-profile-avatar">{getInitials(customer)}</span>

          <div>
            <span className="page-eyebrow">Perfil del cliente</span>

            <div className="customer-name-line">
              <h1>{customer.fullName}</h1>
              <span
                className={`customer-status ${
                  customer.isActive ? "active" : "inactive"
                }`}
              >
                {customer.isActive ? "Activo" : "Inactivo"}
              </span>
            </div>

            <p>Cliente desde {formatDate(customer.createdAt)}</p>
          </div>
        </div>

        <div className="customer-heading-actions">
          <button
            type="button"
            className={
              customer.isActive
                ? "customer-deactivate-button"
                : "customer-activate-button"
            }
            disabled={updatingStatus}
            onClick={() => void updateStatus()}
          >
            {updatingStatus ? (
              <LoaderCircle className="scanner-spinner" size={18} />
            ) : customer.isActive ? (
              "Desactivar cliente"
            ) : (
              <>
                <Check size={18} />
                Activar cliente
              </>
            )}
          </button>

          <Link href="/dashboard/escanear" className="primary-action">
            <QrCode size={19} />
            Escanear tarjeta
          </Link>
        </div>
      </section>

      {error && (
        <div className="dashboard-error error-box">
          <span>{error}</span>
          <button type="button" onClick={() => void loadCustomer()}>
            Intentar nuevamente
          </button>
        </div>
      )}

      <section className="customer-detail-metrics">
        <article>
          <span className="coral"><CreditCard size={21} /></span>
          <div><small>Tarjetas activas</small><strong>{customer.summary.activeCardCount}</strong></div>
        </article>
        <article>
          <span className="mint"><Stamp size={21} /></span>
          <div><small>Saldo disponible</small><strong>{customer.summary.totalBalance}</strong></div>
        </article>
        <article>
          <span className="lilac"><WalletCards size={21} /></span>
          <div><small>Sellos acumulados</small><strong>{customer.summary.lifetimeEarned}</strong></div>
        </article>
        <article>
          <span className="sun"><Gift size={21} /></span>
          <div><small>Sellos canjeados</small><strong>{customer.summary.lifetimeRedeemed}</strong></div>
        </article>
      </section>

      <section className="customer-detail-layout">
        <aside className="customer-information-card">
          <div className="customer-card-heading">
            <div>
              <span className="page-eyebrow">Información</span>
              <h2>Datos del cliente</h2>
            </div>
          </div>

          <div className="customer-information-list">
            <div>
              <span><Mail size={18} /></span>
              <section>
                <small>Correo electrónico</small>
                {customer.email ? (
                  <a href={`mailto:${customer.email}`}>{customer.email}</a>
                ) : (
                  <strong>No registrado</strong>
                )}
              </section>
            </div>

            <div>
              <span><Phone size={18} /></span>
              <section>
                <small>Teléfono</small>
                {customer.phone ? (
                  <a href={`tel:${customer.phone}`}>{customer.phone}</a>
                ) : (
                  <strong>No registrado</strong>
                )}
              </section>
            </div>

            <div>
              <span><CalendarDays size={18} /></span>
              <section>
                <small>Fecha de nacimiento</small>
                <strong>
                  {customer.birthDate
                    ? formatDate(customer.birthDate)
                    : "No registrada"}
                </strong>
              </section>
            </div>

            <div>
              <span><Megaphone size={18} /></span>
              <section>
                <small>Comunicaciones comerciales</small>
                <strong>
                  {customer.marketingConsent
                    ? "Consentimiento otorgado"
                    : "Sin consentimiento"}
                </strong>
              </section>
            </div>
          </div>

          <div className="customer-last-activity">
            <small>Última visita</small>
            <strong>{formatDate(customer.lastVisitAt, true)}</strong>
          </div>
        </aside>

        <main className="customer-cards-panel">
          <div className="customer-card-heading">
            <div>
              <span className="page-eyebrow">Programas</span>
              <h2>Tarjetas de lealtad</h2>
            </div>
            <span className="customer-card-count">{customer.cards.length}</span>
          </div>

          {customer.cards.length === 0 ? (
            <div className="customer-cards-empty">
              <CreditCard size={28} />
              <h3>El cliente no tiene tarjetas</h3>
              <p>Cuando se inscriba en un programa, su tarjeta aparecerá aquí.</p>
            </div>
          ) : (
            <div className="customer-loyalty-cards">
              {customer.cards.map((card) => (
                <article className="customer-loyalty-card" key={card.id}>
                  <div className="customer-loyalty-header">
                    <div>
                      <span className="customer-card-icon"><CreditCard size={20} /></span>
                      <div>
                        <h3>{card.programName}</h3>
                        <button type="button" onClick={() => void copyCardNumber(card)}>
                          {card.cardNumber}
                          {copiedCardId === card.id ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    <span
                      className={`customer-status ${
                        card.status === 1 ? "active" : "inactive"
                      }`}
                    >
                      {card.status === 1 ? "Activa" : "Inactiva"}
                    </span>
                  </div>

                  <div className="customer-loyalty-balance">
                    <div>
                      <small>Saldo disponible</small>
                      <strong>{card.balance}</strong>
                      <span>sellos</span>
                    </div>
                    <div>
                      <small>Instalada en Wallet</small>
                      <strong>{card.walletPassCount > 0 ? "Sí" : "No"}</strong>
                      <span>
                        {card.walletPassCount} {card.walletPassCount === 1 ? "pase" : "pases"}
                      </span>
                    </div>
                  </div>

                  <div className="customer-loyalty-stats">
                    <div><span>Acumulados</span><strong>{card.lifetimeEarned}</strong></div>
                    <div><span>Canjeados</span><strong>{card.lifetimeRedeemed}</strong></div>
                    <div><span>Movimientos</span><strong>{card.transactionCount}</strong></div>
                  </div>

                  <div className="customer-loyalty-footer">
                    <span>Última actividad: {formatDate(card.lastActivityAt, true)}</span>

                    <div className="customer-loyalty-actions">
                      <button type="button" onClick={() => openRecoveryModal(card)}>
                        <QrCode size={15} />
                        Recuperar tarjeta
                      </button>

                      <Link href="/dashboard/escanear">
                        Agregar sello
                        <Stamp size={15} />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      </section>

      {recoveryCard && recoveryUrl && (
        <div
          className="recovery-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeRecoveryModal();
          }}
        >
          <section
            className="recovery-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recovery-modal-title"
          >
            <button
              type="button"
              className="recovery-modal-close"
              onClick={closeRecoveryModal}
              aria-label="Cerrar"
            >
              <X size={19} />
            </button>

            <span className="page-eyebrow">Recuperar tarjeta</span>
            <h2 id="recovery-modal-title">{recoveryCard.programName}</h2>
            <p>
              El cliente puede escanear este código para instalar nuevamente
              su misma tarjeta sin perder sellos ni recompensas.
            </p>

            <div className="recovery-modal-qr">
              <QRCodeSVG
                value={recoveryUrl}
                size={220}
                level="H"
                marginSize={2}
                bgColor="#ffffff"
                fgColor="#111111"
                title={`Recuperar ${recoveryCard.programName}`}
              />
            </div>

            <div className="recovery-modal-card">
              <span>{recoveryCard.cardNumber}</span>
              <strong>{recoveryCard.balance} sellos</strong>
            </div>

            <div className="recovery-modal-url">
              <span>{recoveryUrl}</span>
              <button type="button" onClick={() => void copyRecoveryLink()} aria-label="Copiar enlace">
                {recoveryLinkCopied ? <Check size={17} /> : <Link2 size={17} />}
              </button>
            </div>

            <div className="recovery-modal-actions">
              <button type="button" onClick={() => void copyRecoveryLink()}>
                {recoveryLinkCopied ? <Check size={17} /> : <Link2 size={17} />}
                {recoveryLinkCopied ? "Enlace copiado" : "Copiar enlace"}
              </button>

              <a href={recoveryUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={17} />
                Abrir página
              </a>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
