"use client";

import { formatDateOnly, formatDateTime } from "@/components/lib/date-time";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
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

import styles from "./customer-detail.module.css";

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

type ToastMessage = {
  type: "success" | "error";
  title: string;
  message: string;
} | null;

const getAppUrl =
  process.env.NEXT_PUBLIC_GET_APP_URL ?? "https://get.fidara.mx";

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
  const [statusConfirmationOpen, setStatusConfirmationOpen] = useState(false);
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);
  const [recoveryCard, setRecoveryCard] = useState<CustomerCard | null>(null);
  const [recoveryLinkCopied, setRecoveryLinkCopied] = useState(false);
  const [toast, setToast] = useState<ToastMessage>(null);

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
    if (!toast) return;

    const timeout = window.setTimeout(() => {
      setToast(null);
    }, 3200);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!recoveryCard && !statusConfirmationOpen) return;

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      if (recoveryCard) {
        setRecoveryCard(null);
        setRecoveryLinkCopied(false);
      }

      if (statusConfirmationOpen) {
        setStatusConfirmationOpen(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeWithEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [recoveryCard, statusConfirmationOpen]);

  async function updateStatus() {
    if (!customer) return;

    const nextStatus = !customer.isActive;

    setUpdatingStatus(true);
    setStatusConfirmationOpen(false);
    setError("");

    try {
      const response = await fetch(`/api/customers/${customer.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: nextStatus,
        }),
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

      setCustomer((current) =>
        current
          ? {
              ...current,
              isActive: nextStatus,
            }
          : current,
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
      setUpdatingStatus(false);
    }
  }

  async function copyCardNumber(card: CustomerCard) {
    try {
      await navigator.clipboard.writeText(card.cardNumber);
      setCopiedCardId(card.id);

      window.setTimeout(() => {
        setCopiedCardId(null);
      }, 1800);
    } catch {
      setToast({
        type: "error",
        title: "No se pudo copiar",
        message: "No fue posible copiar el número de tarjeta.",
      });
    }
  }

  function openRecoveryModal(card: CustomerCard) {
    if (!card.qrToken) {
      setToast({
        type: "error",
        title: "Recuperación no disponible",
        message:
          "Esta tarjeta todavía no tiene disponible su enlace de recuperación.",
      });
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

      window.setTimeout(() => {
        setRecoveryLinkCopied(false);
      }, 1800);
    } catch {
      setToast({
        type: "error",
        title: "No se pudo copiar",
        message: "No fue posible copiar el enlace de recuperación.",
      });
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <LoaderCircle className={styles.spinner} size={31} />
        <span>Cargando información del cliente…</span>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className={styles.loadingState}>
        <UserRound size={31} />
        <h2>No encontramos al cliente</h2>
        <Link href="/dashboard/clientes">Volver a clientes</Link>
      </div>
    );
  }

  return (
    <main className={styles.page}>
      <Link href="/dashboard/clientes" className={styles.backLink}>
        <ArrowLeft size={17} />
        Volver a clientes
      </Link>

      <section className={styles.profileHeader}>
        <div className={styles.profileMain}>
          <span className={styles.profileAvatar}>{getInitials(customer)}</span>

          <div className={styles.profileIdentity}>
            <span className={styles.eyebrow}>PERFIL DEL CLIENTE</span>

            <div className={styles.customerName}>
              <h1>{customer.fullName}</h1>

              <span
                className={
                  customer.isActive ? styles.activeBadge : styles.inactiveBadge
                }
              >
                <i />
                {customer.isActive ? "Activo" : "Inactivo"}
              </span>
            </div>

            <p>
              Cliente desde{" "}
              {formatDateOnly(customer.createdAt, {}, "Sin fecha")}
            </p>
          </div>
        </div>

        <div className={styles.headingActions}>
          <button
            type="button"
            className={
              customer.isActive
                ? styles.deactivateButton
                : styles.activateButton
            }
            disabled={updatingStatus}
            onClick={() => setStatusConfirmationOpen(true)}
          >
            {updatingStatus ? (
              <LoaderCircle className={styles.spinner} size={18} />
            ) : customer.isActive ? (
              <>
                <X size={17} />
                Desactivar cliente
              </>
            ) : (
              <>
                <Check size={17} />
                Activar cliente
              </>
            )}
          </button>

          <button
            type="button"
            className={styles.primaryButton}
            disabled={customer.cards.length === 0}
            onClick={() => {
              const cardToRecover =
                customer.cards.find((card) => card.status === 1) ??
                customer.cards[0];

              if (cardToRecover) {
                openRecoveryModal(cardToRecover);
              }
            }}
          >
            <QrCode size={19} />
            Recuperar tarjeta
          </button>
        </div>
      </section>

      {error && (
        <div className={styles.errorBox}>
          <span>{error}</span>

          <button type="button" onClick={() => void loadCustomer()}>
            Intentar nuevamente
          </button>
        </div>
      )}

      <section className={styles.metrics}>
        <article>
          <span className={`${styles.metricIcon} ${styles.coral}`}>
            <CreditCard size={21} />
          </span>

          <div>
            <small>Tarjetas activas</small>
            <strong>{customer.summary.activeCardCount}</strong>
          </div>
        </article>

        <article>
          <span className={`${styles.metricIcon} ${styles.mint}`}>
            <Stamp size={21} />
          </span>

          <div>
            <small>Saldo disponible</small>
            <strong>{customer.summary.totalBalance}</strong>
          </div>
        </article>

        <article>
          <span className={`${styles.metricIcon} ${styles.lilac}`}>
            <WalletCards size={21} />
          </span>

          <div>
            <small>Sellos acumulados</small>
            <strong>{customer.summary.lifetimeEarned}</strong>
          </div>
        </article>

        <article>
          <span className={`${styles.metricIcon} ${styles.sun}`}>
            <Gift size={21} />
          </span>

          <div>
            <small>Sellos canjeados</small>
            <strong>{customer.summary.lifetimeRedeemed}</strong>
          </div>
        </article>
      </section>

      <section className={styles.detailLayout}>
        <aside className={styles.informationCard}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>INFORMACIÓN</span>
              <h2>Datos del cliente</h2>
            </div>
          </div>

          <div className={styles.informationList}>
            <div>
              <span className={styles.infoIcon}>
                <Mail size={18} />
              </span>

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
              <span className={styles.infoIcon}>
                <Phone size={18} />
              </span>

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
              <span className={styles.infoIcon}>
                <CalendarDays size={18} />
              </span>

              <section>
                <small>Fecha de nacimiento</small>

                <strong>
                  {formatDateOnly(customer.birthDate, {}, "No registrada")}
                </strong>
              </section>
            </div>

            <div>
              <span className={styles.infoIcon}>
                <Megaphone size={18} />
              </span>

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

          <div className={styles.lastVisit}>
            <small>Última visita</small>

            <strong>
              {formatDateTime(customer.lastVisitAt, {}, "Sin visitas")}
            </strong>
          </div>
        </aside>

        <section className={styles.cardsPanel}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>PROGRAMAS</span>
              <h2>Tarjetas de lealtad</h2>
            </div>

            <span className={styles.cardCount}>{customer.cards.length}</span>
          </div>

          {customer.cards.length === 0 ? (
            <div className={styles.cardsEmpty}>
              <CreditCard size={28} />

              <h3>El cliente no tiene tarjetas</h3>

              <p>
                Cuando se inscriba en un programa, su tarjeta aparecerá aquí.
              </p>
            </div>
          ) : (
            <div className={styles.loyaltyCards}>
              {customer.cards.map((card) => (
                <article className={styles.loyaltyCard} key={card.id}>
                  <div className={styles.loyaltyHeader}>
                    <div className={styles.programIdentity}>
                      <span className={styles.cardIcon}>
                        <CreditCard size={20} />
                      </span>

                      <div>
                        <h3>{card.programName}</h3>

                        <button
                          type="button"
                          onClick={() => void copyCardNumber(card)}
                        >
                          {card.cardNumber}

                          {copiedCardId === card.id ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                    </div>

                    <span
                      className={
                        card.status === 1
                          ? styles.activeBadge
                          : styles.inactiveBadge
                      }
                    >
                      <i />
                      {card.status === 1 ? "Activa" : "Inactiva"}
                    </span>
                  </div>

                  <div className={styles.cardHighlights}>
                    <div className={styles.balanceHighlight}>
                      <small>Saldo disponible</small>
                      <strong>{card.balance}</strong>
                      <span>sellos</span>
                    </div>

                    <div>
                      <small>Wallet</small>
                      <strong>
                        {card.walletPassCount > 0
                          ? "Instalada"
                          : "No instalada"}
                      </strong>
                      <span>
                        {card.walletPassCount}{" "}
                        {card.walletPassCount === 1 ? "pase" : "pases"}
                      </span>
                    </div>

                    <div>
                      <small>Acumulados</small>
                      <strong>{card.lifetimeEarned}</strong>
                      <span>sellos históricos</span>
                    </div>

                    <div>
                      <small>Canjeados</small>
                      <strong>{card.lifetimeRedeemed}</strong>
                      <span>sellos utilizados</span>
                    </div>
                  </div>

                  <div className={styles.loyaltyFooter}>
                    <div>
                      <small>Última actividad</small>

                      <strong>
                        {formatDateTime(
                          card.lastActivityAt,
                          {},
                          "Sin actividad",
                        )}
                      </strong>

                      <span className={styles.transactionCount}>
                        {card.transactionCount}{" "}
                        {card.transactionCount === 1
                          ? "movimiento"
                          : "movimientos"}
                      </span>
                    </div>

                    {/* <div className={styles.cardActions}>
                      <button
                        type="button"
                        onClick={() => openRecoveryModal(card)}
                      >
                        <QrCode size={15} />
                        Recuperar tarjeta
                      </button>

                      <Link href="/dashboard/escanear">
                        <Stamp size={15} />
                        Agregar sello
                      </Link>
                    </div> */}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      {statusConfirmationOpen && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={() => setStatusConfirmationOpen(false)}
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
                  customer.isActive
                    ? styles.confirmIconDanger
                    : styles.confirmIconSuccess
                }
              >
                {customer.isActive ? (
                  <AlertTriangle size={22} />
                ) : (
                  <Check size={22} />
                )}
              </span>

              <h2 id="customer-status-dialog-title">
                {customer.isActive
                  ? "¿Desactivar cliente?"
                  : "¿Reactivar cliente?"}
              </h2>

              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setStatusConfirmationOpen(false)}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <p>
              {customer.isActive
                ? `${customer.fullName} será desactivado, pero conservará sus tarjetas y su historial.`
                : `${customer.fullName} volverá a aparecer como cliente activo.`}
            </p>

            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setStatusConfirmationOpen(false)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={
                  customer.isActive
                    ? styles.confirmDangerButton
                    : styles.confirmSuccessButton
                }
                onClick={() => void updateStatus()}
              >
                {customer.isActive ? <X size={17} /> : <Check size={17} />}

                {customer.isActive ? "Sí, desactivar" : "Sí, reactivar"}
              </button>
            </div>
          </section>
        </div>
      )}

      {recoveryCard && recoveryUrl && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeRecoveryModal();
            }
          }}
        >
          <section
            className={styles.recoveryModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="recovery-modal-title"
          >
            <div className={styles.recoveryHeading}>
              <span className={styles.recoveryIcon}>
                <QrCode size={21} />
              </span>

              <div>
                <span className={styles.eyebrow}>RECUPERAR TARJETA</span>

                <h2 id="recovery-modal-title">{recoveryCard.programName}</h2>
              </div>

              <button
                type="button"
                className={styles.modalClose}
                onClick={closeRecoveryModal}
                aria-label="Cerrar"
              >
                <X size={19} />
              </button>
            </div>

            <p>
              El cliente puede escanear este código para instalar nuevamente su
              misma tarjeta sin perder sellos ni recompensas.
            </p>

            <div className={styles.recoveryQr}>
              <QRCodeSVG
                value={recoveryUrl}
                size={210}
                level="H"
                marginSize={2}
                bgColor="#ffffff"
                fgColor="#111827"
                title={`Recuperar ${recoveryCard.programName}`}
              />
            </div>

            <div className={styles.recoverySummary}>
              <span>{recoveryCard.cardNumber}</span>
              <strong>{recoveryCard.balance} sellos</strong>
            </div>

            <div className={styles.recoveryUrl}>
              <span>{recoveryUrl}</span>

              <button
                type="button"
                onClick={() => void copyRecoveryLink()}
                aria-label="Copiar enlace"
              >
                {recoveryLinkCopied ? <Check size={17} /> : <Link2 size={17} />}
              </button>
            </div>

            <div className={styles.recoveryActions}>
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
