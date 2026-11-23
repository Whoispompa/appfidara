"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  CreditCard,
  Gift,
  LoaderCircle,
  Plus,
  Trash2,
  Users,
  WalletCards,
} from "lucide-react";
import { WalletCardPreview } from "@/components/dashboard/wallet-card-preview";
import { FidaraConfirmDialog } from "@/components/ui/fidara-confirm-dialog";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type ProgramSummary = {
  id: string;
  name: string;
  description?: string | null;
  targetValue: number;
  isRecurring: boolean;
  isActive: boolean;
  cardLogoUrl?: string | null;
  programType: number;
  couponBenefitType?: number | null;
  couponBenefitValue?: number | null;
  couponMinimumPurchase?: number | null;
  couponMaximumDiscount?: number | null;
  couponExpirationType?: number | null;
  couponValidityDays?: number | null;
  couponFixedExpirationAt?: string | null;
  couponUsageLimit?: number | null;
  couponTerms?: string | null;
  cardStripImageUrl?: string | null;
  cardStripColor?: string | null;
  activeStampImageUrl?: string | null;
  inactiveStampImageUrl?: string | null;
  cardBackgroundColor?: string | null;
  cardForegroundColor?: string | null;
  cardLabelColor?: string | null;
  showPoweredByFidara: boolean;
  customerCount: number;
  installedCards: number;
  giftCardPresetAmounts?: Array<{
    amount: number;
    isActive: boolean;
    displayOrder: number;
  }>;

  reward?: {
    id: string;
    name: string;
    description?: string | null;
    requiredValue: number;
  } | null;
};

type ProgramFilter = "all" | 1 | 2 | 3 | 4 | 5 | 6;

const programFilters: Array<{ value: ProgramFilter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: 1, label: "Sellos" },
  { value: 2, label: "Puntos" },
  { value: 3, label: "Cashback" },
  { value: 4, label: "Cupones" },
  { value: 6, label: "Suscripciones" },
  { value: 5, label: "Gift Cards" },
];

const apiUrl =
  process.env.NEXT_PUBLIC_FIDARA_API_URL ?? "https://api.fidara.mx";

function absoluteUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  return `${apiUrl}${value}`;
}

export default function ProgramsPage() {
  const router = useRouter();

  const [programs, setPrograms] = useState<ProgramSummary[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [programToDelete, setProgramToDelete] = useState<ProgramSummary | null>(
    null,
  );

  const [deleting, setDeleting] = useState(false);

  const [activeFilter, setActiveFilter] = useState<ProgramFilter>("all");

  const filteredPrograms =
    activeFilter === "all"
      ? programs
      : programs.filter((program) => program.programType === activeFilter);

  const loadPrograms = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/programs", {
        cache: "no-store",
      });

      const payload = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload.message ?? "No fue posible cargar las tarjetas.",
        );
      }

      setPrograms(payload.data ?? []);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible cargar las tarjetas.",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  async function deleteProgram() {
    if (!programToDelete || deleting) {
      return;
    }

    const selectedProgram = programToDelete;

    setDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/programs/${selectedProgram.id}`, {
        method: "DELETE",
      });

      const payload = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload.message ?? "No fue posible eliminar la tarjeta.",
        );
      }

      if (payload.deleted) {
        setPrograms((current) =>
          current.filter((program) => program.id !== selectedProgram.id),
        );
      }

      if (payload.archived) {
        setPrograms((current) =>
          current.map((program) =>
            program.id === selectedProgram.id
              ? {
                  ...program,
                  isActive: false,
                }
              : program,
          ),
        );
      }

      toast.success(
        payload.archived ? "Tarjeta archivada" : "Tarjeta eliminada",
        {
          description:
            payload.message ?? "La tarjeta fue procesada correctamente.",
        },
      );

      setProgramToDelete(null);
    } catch (caught) {
      toast.error("No se pudo procesar la tarjeta", {
        description:
          caught instanceof Error
            ? caught.message
            : "No fue posible eliminar la tarjeta.",
      });
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    // Carga inicial desde el BFF autenticado.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPrograms();
  }, [loadPrograms]);

  useEffect(() => {
    const refreshVisiblePrograms = () => void loadPrograms();
    window.addEventListener("focus", refreshVisiblePrograms);
    return () => window.removeEventListener("focus", refreshVisiblePrograms);
  }, [loadPrograms]);

  if (loading) {
    return (
      <div className="programs-loading">
        <LoaderCircle className="scanner-spinner" size={28} />
        Cargando tarjetas...
      </div>
    );
  }

  return (
    <main className="programs-page">
      <header className="programs-heading">
        <div>
          <span className="page-eyebrow">Programas de lealtad</span>

          <h1>Mis tarjetas</h1>

          <p>
            Crea y administra las tarjetas que tus clientes guardan en su
            Wallet.
          </p>
        </div>

        <Link href="/dashboard/tarjeta/nueva" className="create-program-button">
          <Plus size={19} />
          Crear tarjeta
        </Link>
      </header>

      {error && (
        <div className="programs-error">
          {error}

          <button type="button" onClick={() => void loadPrograms()}>
            Reintentar
          </button>
        </div>
      )}

      <nav className="program-filters" aria-label="Filtrar tarjetas por modalidad">
        {programFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={activeFilter === filter.value ? "active" : ""}
            aria-pressed={activeFilter === filter.value}
            onClick={() => setActiveFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </nav>

      {activeFilter !== "all" && filteredPrograms.length === 0 ? (
        <section className="program-filter-empty" aria-live="polite">
          <span><WalletCards size={26} /></span>
          <h2>No hay tarjetas de esta modalidad</h2>
          <p>Crea una tarjeta nueva o selecciona otro filtro para continuar.</p>
          <Link href="/dashboard/tarjeta/nueva">
            <Plus size={17} />
            Crear tarjeta
          </Link>
        </section>
      ) : (
        <section className="program-gallery">
          {activeFilter === "all" && (
            <Link href="/dashboard/tarjeta/nueva" className="new-program-tile">
              <div className="new-program-preview">
                <Plus size={34} />
              </div>

              <strong>Crear una tarjeta</strong>

              <span>Diseña un nuevo programa desde cero.</span>
            </Link>
          )}

        {filteredPrograms.map((program) => {
          const target = Math.max(
            1,
            Math.round(Number(program.targetValue) || 10),
          );

          const logoUrl = absoluteUrl(program.cardLogoUrl);

          const activeStampUrl = absoluteUrl(program.activeStampImageUrl);

          const inactiveStampUrl = absoluteUrl(program.inactiveStampImageUrl);

          const stripImageUrl = absoluteUrl(program.cardStripImageUrl);

          const giftCardPreviewAmount =
            program.giftCardPresetAmounts
              ?.filter((preset) => preset.isActive)
              .sort((left, right) => left.displayOrder - right.displayOrder)[0]
              ?.amount ?? 0;

          return (
            <article key={program.id} className="loyalty-program-tile">
              <div className="program-status">
                <span className={program.isActive ? "active" : "inactive"} />

                {program.isActive ? "Tarjeta activa" : "Tarjeta inactiva"}
              </div>

              <Link
                href={`/dashboard/tarjeta/${program.id}`}
                className="program-phone-link"
                aria-label={`Editar ${program.name}`}
              >
                <div className="program-phone-preview">
                  <WalletCardPreview
                    name={program.name}
                    programType={program.programType}
                    couponBenefitType={program.couponBenefitType ?? 1}
                    couponBenefitValue={program.couponBenefitValue ?? 10}
                    couponMinimumPurchase={program.couponMinimumPurchase ?? 0}
                    couponMaximumDiscount={program.couponMaximumDiscount}
                    couponExpirationType={program.couponExpirationType ?? 2}
                    couponValidityDays={program.couponValidityDays ?? 30}
                    couponFixedExpirationAt={program.couponFixedExpirationAt}
                    couponUsageLimit={program.couponUsageLimit ?? 1}
                    couponTerms={program.couponTerms}
                    logoUrl={logoUrl}
                    activeStampUrl={activeStampUrl}
                    inactiveStampUrl={inactiveStampUrl}
                    backgroundColor={program.cardBackgroundColor}
                    foregroundColor={program.cardForegroundColor}
                    labelColor={program.cardLabelColor}
                    stripImageUrl={stripImageUrl}
                    stripColor={
                      program.cardStripColor ?? program.cardBackgroundColor
                    }
                    targetValue={target}
                    balance={
                      program.programType === 5 ? giftCardPreviewAmount : 4
                    }
                    rewardsAvailable={0}
                    showPoweredByFidara={program.showPoweredByFidara}
                    compact
                    phoneFrame
                  />
                </div>
              </Link>

              <div className="program-tile-information">
                <div>
                  <h2>{program.name}</h2>

                  <p>
                    {program.programType === 5
                      ? "Tarjeta de regalo con saldo digital"
                      : program.programType === 6
                        ? "SuscripciÃ³n con planes y beneficios"
                      : program.programType === 4
                      ? program.couponBenefitType === 1
                        ? `${program.couponBenefitValue ?? 0}% de descuento`
                        : program.couponBenefitType === 2
                          ? `$${Number(
                              program.couponBenefitValue ?? 0,
                            ).toLocaleString("es-MX")} de descuento`
                          : program.couponBenefitType === 3
                            ? "Producto gratis"
                            : "Cupón especial"
                      : (program.reward?.name ?? "Recompensa no configurada")}
                  </p>
                </div>

                <div className="program-metrics">
                  <span>
                    <Users size={15} />
                    {program.customerCount} clientes
                  </span>

                  <span>
                    <WalletCards size={15} />
                    {program.installedCards} instaladas
                  </span>
                </div>

                <div className="program-actions">
                  {program.programType === 5 && program.isActive && (
                    <Link
                      href={`/dashboard/tarjeta/${program.id}#venta-gift-card`}
                      className="edit-program-button"
                    >
                      <Gift size={17} />
                      Vender tarjeta de regalo
                    </Link>
                  )}

                  <Link
                    href={`/dashboard/tarjeta/${program.id}`}
                    className="edit-program-button"
                  >
                    <CreditCard size={17} />
                    Editar tarjeta
                  </Link>

                  <button
                    type="button"
                    className="delete-program-button"
                    onClick={() => {
                      setError("");
                      setProgramToDelete(program);
                    }}
                    aria-label={`Eliminar ${program.name}`}
                    title="Eliminar tarjeta"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {program.isRecurring && (
                  <span className="recurring-program">
                    <Check size={14} />
                    Se reinicia después del canje
                  </span>
                )}
              </div>
            </article>
          );
        })}
        </section>
      )}
      <FidaraConfirmDialog
        open={programToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setProgramToDelete(null);
          }
        }}
        icon={<Trash2 size={22} />}
        iconClassName="bg-red-50 text-red-600"
        title="¿Eliminar esta tarjeta?"
        description={
          <>
            Estás por eliminar <strong className="text-[#111827]">{programToDelete?.name}</strong>.
          </>
        }
        cancelLabel="Cancelar"
        confirmLabel="Sí, eliminar"
        busyLabel="Procesando..."
        confirmIcon={<Trash2 size={17} />}
        confirmClassName="delete-program-confirm"
        busy={deleting}
        onConfirm={() => void deleteProgram()}
      >
        <div className="delete-program-warning">
          <strong>¿Qué sucederá?</strong>
          <p>
            Si la tarjeta nunca ha sido entregada a clientes, se eliminará
            definitivamente.
          </p>
          <p>
            Si ya tiene clientes o movimientos, se archivará para conservar su
            historial.
          </p>
        </div>
      </FidaraConfirmDialog>
    </main>
  );
}
