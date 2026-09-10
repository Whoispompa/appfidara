"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  CreditCard,
  LoaderCircle,
  Plus,
  Trash2,
  Users,
  WalletCards,
} from "lucide-react";
import { WalletCardPreview } from "@/components/dashboard/wallet-card-preview";
import { useCallback, useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ProgramSummary = {
  id: string;
  name: string;
  description?: string | null;
  targetValue: number;
  isRecurring: boolean;
  isActive: boolean;
  cardLogoUrl?: string | null;
  activeStampImageUrl?: string | null;
  inactiveStampImageUrl?: string | null;
  cardBackgroundColor?: string | null;
  cardForegroundColor?: string | null;
  cardLabelColor?: string | null;
  showPoweredByFidara: boolean;
  customerCount: number;
  installedCards: number;

  reward?: {
    id: string;
    name: string;
    description?: string | null;
    requiredValue: number;
  } | null;
};

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

  const [notice, setNotice] = useState("");

  const [programToDelete, setProgramToDelete] = useState<ProgramSummary | null>(
    null,
  );

  const [deleting, setDeleting] = useState(false);

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
    setNotice("");

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

      setNotice(payload.message ?? "La tarjeta fue procesada correctamente.");

      setProgramToDelete(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible eliminar la tarjeta.",
      );
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    void loadPrograms();
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

      {notice && (
        <div className="programs-notice">
          <Check size={18} />
          {notice}
        </div>
      )}

      {error && (
        <div className="programs-error">
          {error}

          <button type="button" onClick={() => void loadPrograms()}>
            Reintentar
          </button>
        </div>
      )}

      <section className="program-gallery">
        <Link href="/dashboard/tarjeta/nueva" className="new-program-tile">
          <div className="new-program-preview">
            <Plus size={34} />
          </div>

          <strong>Crear una tarjeta</strong>

          <span>Diseña un nuevo programa desde cero.</span>
        </Link>

        {programs.map((program) => {
          const target = Math.max(
            1,
            Math.round(Number(program.targetValue) || 10),
          );

          const logoUrl = absoluteUrl(program.cardLogoUrl);

          const activeStampUrl = absoluteUrl(program.activeStampImageUrl);

          const inactiveStampUrl = absoluteUrl(program.inactiveStampImageUrl);

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
                    logoUrl={logoUrl}
                    activeStampUrl={activeStampUrl}
                    inactiveStampUrl={inactiveStampUrl}
                    backgroundColor={program.cardBackgroundColor}
                    foregroundColor={program.cardForegroundColor}
                    labelColor={program.cardLabelColor}
                    targetValue={target}
                    balance={4}
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

                  <p>{program.reward?.name ?? "Recompensa no configurada"}</p>
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
                      setNotice("");
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
      <AlertDialog
        open={programToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setProgramToDelete(null);
          }
        }}
      >
        <AlertDialogContent className="delete-program-dialog">
          <AlertDialogHeader>
            <div className="delete-program-icon">
              <Trash2 size={22} />
            </div>

            <AlertDialogTitle>¿Eliminar esta tarjeta?</AlertDialogTitle>

            <AlertDialogDescription>
              Estás por eliminar <strong>{programToDelete?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>

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

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>

            <AlertDialogAction
              className="delete-program-confirm"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void deleteProgram();
              }}
            >
              {deleting ? (
                <>
                  <LoaderCircle className="scanner-spinner" size={17} />
                  Procesando...
                </>
              ) : (
                <>
                  <Trash2 size={17} />
                  Sí, eliminar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
