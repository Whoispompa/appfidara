"use client";

import { formatDateOnly, formatDateTime } from "@/components/lib/date-time";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Link2,
  LoaderCircle,
  Mail,
  Megaphone,
  Phone,
  QrCode,
  UserRound,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CustomerMemberships } from "@/components/subscriptions/customer-memberships";
import { subscriptionsEnabled } from "@/lib/subscriptions";

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

type ProgramSummary = {
  id: string;
  programType: number;
};

type ProgramsResponse = {
  message?: string;
  data?: ProgramSummary[];
};

type CardMetric = {
  label: string;
  value: string | number;
  detail: string;
  emphasized?: boolean;
};

const getAppUrl =
  process.env.NEXT_PUBLIC_GET_APP_URL ?? "https://get.fidara.mx";

function getInitials(customer: CustomerDetail) {
  const first = customer.firstName?.trim().charAt(0) ?? "";
  const last = customer.lastName?.trim().charAt(0) ?? "";

  return `${first}${last || first}`.toUpperCase();
}

function getProgramTypeLabel(programType?: number) {
  return (
    {
      1: "Sellos",
      2: "Puntos",
      3: "Cashback",
      4: "Cupones",
      5: "Gift Card",
      6: "Suscripción",
    }[programType ?? 0] ?? "Modalidad no disponible"
  );
}

function getCardStatusLabel(status: number) {
  return status === 1 ? "Activa" : "Inactiva";
}

function getCardMetrics(card: CustomerCard, programType?: number) {
  const walletMetric: CardMetric = {
    label: "Wallet",
    value: card.walletPassCount > 0 ? "Instalada" : "No instalada",
    detail: `${card.walletPassCount} ${card.walletPassCount === 1 ? "pase" : "pases"}`,
  };

  const modalityMetrics = {
    1: [
      { label: "Sellos disponibles", value: card.balance, detail: "sellos", emphasized: true },
      { label: "Sellos acumulados", value: card.lifetimeEarned, detail: "históricos" },
      { label: "Sellos canjeados", value: card.lifetimeRedeemed, detail: "utilizados" },
    ],
    2: [
      { label: "Puntos disponibles", value: card.balance, detail: "puntos", emphasized: true },
      { label: "Puntos acumulados", value: card.lifetimeEarned, detail: "históricos" },
      { label: "Puntos canjeados", value: card.lifetimeRedeemed, detail: "utilizados" },
    ],
    3: [
      { label: "Cashback disponible", value: card.balance, detail: "saldo", emphasized: true },
      { label: "Cashback acumulado", value: card.lifetimeEarned, detail: "histórico" },
      { label: "Cashback utilizado", value: card.lifetimeRedeemed, detail: "canjeado" },
    ],
    5: [
      { label: "Saldo disponible", value: card.balance, detail: "Gift Card", emphasized: true },
      { label: "Saldo acumulado", value: card.lifetimeEarned, detail: "histórico" },
      { label: "Saldo utilizado", value: card.lifetimeRedeemed, detail: "canjeado" },
    ],
  }[programType ?? 0];

  if (modalityMetrics) {
    return [modalityMetrics[0], walletMetric, ...modalityMetrics.slice(1)];
  }

  return [
    walletMetric,
    {
      label: "Operaciones",
      value: card.transactionCount,
      detail: card.transactionCount === 1 ? "operación" : "operaciones",
    },
    {
      label: "Activación",
      value: formatDateOnly(card.activatedAt, {}, "Sin fecha"),
      detail: "fecha registrada",
    },
    {
      label: "Última actividad",
      value: formatDateOnly(card.lastActivityAt, {}, "Sin actividad"),
      detail: "actividad registrada",
    },
  ];
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
  const [programTypes, setProgramTypes] = useState<Record<string, number>>({});
  const [recoveryDialogOpen, setRecoveryDialogOpen] = useState(false);
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
      const [response, programsResponse] = await Promise.all([
        fetch(`/api/customers/${customerId}`, { cache: "no-store" }),
        fetch("/api/programs", { cache: "no-store" }),
      ]);

      const payload = (await response.json()) as CustomerResponse;
      const programsPayload = (await programsResponse.json()) as ProgramsResponse;

      if (response.status === 401 || programsResponse.status === 401) {
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

      if (!programsResponse.ok) {
        throw new Error(
          programsPayload.message ?? "No fue posible cargar las modalidades.",
        );
      }

      setCustomer(payload.data);
      setProgramTypes(
        Object.fromEntries(
          (programsPayload.data ?? []).map((program) => [
            program.id,
            program.programType,
          ]),
        ),
      );
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
    const timeout = window.setTimeout(() => void loadCustomer(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadCustomer]);

  useEffect(() => {
    if (!statusConfirmationOpen) return;

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

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
  }, [statusConfirmationOpen]);

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
      toast.error("No se pudo copiar", {
        description: "No fue posible copiar el número de tarjeta.",
      });
    }
  }

  function openRecoveryModal(card: CustomerCard) {
    if (!card.qrToken) {
      toast.error("Recuperación no disponible", {
        description:
          "Esta tarjeta todavía no tiene disponible su enlace de recuperación.",
      });
      return;
    }

    setRecoveryLinkCopied(false);
    setRecoveryCard(card);
    setRecoveryDialogOpen(true);
  }

  function startRecovery() {
    const recoverableCards = customer?.cards.filter((card) => card.qrToken) ?? [];

    if (recoverableCards.length === 0) {
      toast.error("Recuperación no disponible", {
        description: "Este cliente no tiene tarjetas con enlace de recuperación.",
      });
      return;
    }

    if (recoverableCards.length === 1) {
      openRecoveryModal(recoverableCards[0]);
      return;
    }

    setRecoveryCard(null);
    setRecoveryLinkCopied(false);
    setRecoveryDialogOpen(true);
  }

  function handleRecoveryDialogOpenChange(open: boolean) {
    setRecoveryDialogOpen(open);

    if (!open) {
      setRecoveryCard(null);
      setRecoveryLinkCopied(false);
    }
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
      toast.error("No se pudo copiar", {
        description: "No fue posible copiar el enlace de recuperación.",
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

  const latestActivityAt =
  customer.cards
    .map((card) => card.lastActivityAt)
    .filter((value): value is string => Boolean(value))
    .sort(
      (a, b) =>
        new Date(b).getTime() -
        new Date(a).getTime(),
    )[0] ??
  customer.lastVisitAt ??
  null;
  const recoverableCards = customer.cards.filter((card) => card.qrToken);

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
            disabled={recoverableCards.length === 0}
            onClick={startRecovery}
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
            <small>Última actividad</small>

<strong>
  {formatDateTime(
    latestActivityAt,
    {},
    "Sin actividad",
  )}
</strong>
          </div>
        </aside>

        <section className={styles.cardsPanel}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>PROGRAMAS</span>
              <h2>Programas del cliente</h2>
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
              {customer.cards.map((card) => {
                const programType = programTypes[card.programId];
                const metrics = getCardMetrics(card, programType);

                return (
                <article className={styles.loyaltyCard} key={card.id}>
                  <div className={styles.loyaltyHeader}>
                    <div className={styles.programIdentity}>
                      <span className={styles.cardIcon}>
                        <CreditCard size={20} />
                      </span>

                      <div>
                        <h3>{card.programName}</h3>

                        <span className={styles.programType}>
                          {getProgramTypeLabel(programType)}
                        </span>

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
                    {metrics.map((metric) => (
                      <div
                        className={metric.emphasized ? styles.balanceHighlight : undefined}
                        key={metric.label}
                      >
                        <small>{metric.label}</small>
                        <strong>{metric.value}</strong>
                        <span>{metric.detail}</span>
                      </div>
                    ))}
                  </div>

            
                </article>
                );
              })}
            </div>
          )}
        </section>
      </section>

      {subscriptionsEnabled && (
        <CustomerMemberships
          customerId={customer.id}
          cards={customer.cards.map((card) => ({
            id: card.id,
            qrToken: card.qrToken,
          }))}
        />
      )}

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

      <Dialog.Root
        open={recoveryDialogOpen}
        onOpenChange={handleRecoveryDialogOpenChange}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className={styles.modalBackdrop} />
          <Dialog.Popup
            className={`${styles.recoveryModal} ${styles.dialogPopup}`}
          >
            <div className={styles.recoveryHeading}>
              <span className={styles.recoveryIcon}>
                <QrCode size={21} />
              </span>

              <div>
                <span className={styles.eyebrow}>RECUPERAR TARJETA</span>
                <Dialog.Title>
                  {recoveryCard ? recoveryCard.programName : "Selecciona un programa"}
                </Dialog.Title>
              </div>

              <Dialog.Close className={styles.modalClose} aria-label="Cerrar">
                <X size={19} />
              </Dialog.Close>
            </div>

            {recoveryCard && recoveryUrl ? (
              <>
                <Dialog.Description>
                  El cliente puede escanear este código para instalar nuevamente su
                  misma tarjeta, sin crear otra ni perder sus datos.
                </Dialog.Description>

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
                  <strong>
                    {getProgramTypeLabel(programTypes[recoveryCard.programId])}
                    {" · "}
                    {getCardStatusLabel(recoveryCard.status)}
                  </strong>
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
              </>
            ) : (
              <>
                <Dialog.Description className={styles.selectorDescription}>
                  Elige la tarjeta existente que deseas recuperar para {customer.fullName}.
                </Dialog.Description>

                <div className={styles.recoveryOptions}>
                  {recoverableCards.map((card) => {
                    const programType = programTypes[card.programId];

                    return (
                      <button
                        type="button"
                        data-loyalty-card-id={card.id}
                        key={card.id}
                        onClick={() => openRecoveryModal(card)}
                      >
                        <span className={styles.optionIcon}>
                          <CreditCard size={19} />
                        </span>

                        <span className={styles.optionIdentity}>
                          <strong>{card.programName}</strong>
                          <small>{getProgramTypeLabel(programType)}</small>
                        </span>

                        <span
                          className={
                            card.status === 1
                              ? styles.activeBadge
                              : styles.inactiveBadge
                          }
                        >
                          <i />
                          {getCardStatusLabel(card.status)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

    </main>
  );
}
