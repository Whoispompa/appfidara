"use client";

import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Camera,
  Check,
  Gift,
  Keyboard,
  LoaderCircle,
  QrCode,
  RotateCcw,
  Stamp,
  UserRound,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FormEvent, useCallback, useState } from "react";

const Scanner = dynamic(
  () => import("@yudiel/react-qr-scanner").then((module) => module.Scanner),
  {
    ssr: false,
  },
);

type CardInformation = {
  loyaltyCardId: string;
  cardNumber: string;

  customer: {
    id: string;
    name: string;
    firstName: string;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  };

  program: {
    id: string;
    name: string;
    description?: string | null;
    logoUrl?: string | null;
    backgroundColor?: string | null;
    foregroundColor?: string | null;
  };

  organization: {
    id: string;
    name: string;
    logoUrl?: string | null;
  };

  balance: number;
  target: number;
  remaining: number;
  rewardAvailable: boolean;

  reward?: {
    id: string;
    name: string;
    description?: string | null;
    requiredValue: number;
  } | null;
};

export default function ScannerPage() {
  const [cameraEnabled, setCameraEnabled] = useState(false);

  const [manualMode, setManualMode] = useState(false);

  const [manualToken, setManualToken] = useState("");

  const [loading, setLoading] = useState(false);

  const [addingStamp, setAddingStamp] = useState(false);

  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);

  const [redeemingReward, setRedeemingReward] = useState(false);

  const [card, setCard] = useState<CardInformation | null>(null);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const lookupCard = useCallback(
    async (rawValue: string) => {
      const qrToken = rawValue.trim();

      if (!qrToken || loading || card) {
        return;
      }

      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const response = await fetch("/api/wallet/cards/lookup", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            qrToken,
          }),
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message ?? "No encontramos la tarjeta.");
        }

        setCard(payload.data);
        setCameraEnabled(false);
        setManualMode(false);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "No fue posible consultar la tarjeta.",
        );
      } finally {
        setLoading(false);
      }
    },
    [card, loading],
  );

  async function submitManualToken(event: FormEvent) {
    event.preventDefault();
    await lookupCard(manualToken);
  }

  async function addStamp() {
    if (!card || addingStamp) {
      return;
    }

    setAddingStamp(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/wallet/cards/stamps", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          qrToken: manualToken || undefined,
          locationId: null,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "No fue posible agregar el sello.");
      }

      const newBalance = Number(payload.balance);

      const target = Number(payload.target);

      setCard((current) =>
        current
          ? {
              ...current,
              balance: newBalance,
              target,
              remaining: Math.max(target - newBalance, 0),
              rewardAvailable: Boolean(payload.rewardAvailable),
            }
          : current,
      );

      setSuccess(payload.message ?? "Sello agregado correctamente.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible agregar el sello.",
      );
    } finally {
      setAddingStamp(false);
    }
  }

  async function redeemReward() {
    if (!card || !card.rewardAvailable || redeemingReward) {
      return;
    }

    setRedeemingReward(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/wallet/cards/redeem", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          qrToken: manualToken,
          locationId: null,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.message ?? "No fue posible canjear la recompensa.",
        );
      }

      const newBalance = Number(payload.balance);

      const target = Number(payload.target);

      setCard((current) =>
        current
          ? {
              ...current,
              balance: newBalance,
              target,
              remaining: Math.max(target - newBalance, 0),
              rewardAvailable: false,
              reward: null,
            }
          : current,
      );

      setRedeemDialogOpen(false);

      setSuccess(
        `${payload.reward?.name ?? "Recompensa"} canjeada correctamente.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible canjear la recompensa.",
      );
    } finally {
      setRedeemingReward(false);
    }
  }

  function resetScanner() {
    setCard(null);
    setError("");
    setSuccess("");
    setManualToken("");
    setCameraEnabled(false);
    setManualMode(false);
  }

  return (
    <div className="scanner-page">
      <section className="scanner-heading">
        <div>
          <span className="page-eyebrow">Atención al cliente</span>

          <h1>Escanear tarjeta</h1>

          <p>
            Escanea el QR del cliente para consultar sus sellos y recompensas.
          </p>
        </div>

        {card && (
          <button
            type="button"
            className="scanner-secondary-button"
            onClick={resetScanner}
          >
            <RotateCcw size={18} />
            Escanear otra
          </button>
        )}
      </section>

      {error && <div className="scanner-alert error-box">{error}</div>}

      {success && (
        <div className="scanner-alert success-box">
          <Check size={18} />
          {success}
        </div>
      )}

      {!card && (
        <section className="scanner-panel">
          {!cameraEnabled && !manualMode && (
            <div className="scanner-start">
              <span className="scanner-main-icon">
                <QrCode size={34} />
              </span>

              <h2>¿Cómo quieres buscarla?</h2>

              <p>Utiliza la cámara o introduce manualmente el código del QR.</p>

              <div className="scanner-start-actions">
                <button
                  type="button"
                  className="scanner-primary-button"
                  onClick={() => setCameraEnabled(true)}
                >
                  <Camera size={19} />
                  Abrir cámara
                </button>

                <button
                  type="button"
                  className="scanner-secondary-button"
                  onClick={() => setManualMode(true)}
                >
                  <Keyboard size={19} />
                  Ingresar código
                </button>
              </div>
            </div>
          )}

          {cameraEnabled && (
            <div className="camera-section">
              <div className="camera-frame">
                <Scanner
                  paused={loading}
                  formats={["qr_code"]}
                  constraints={{
                    facingMode: "environment",
                  }}
                  components={{
                    finder: true,
                    torch: true,
                    zoom: true,
                    audio: true,
                  }}
                  onScan={(codes) => {
                    const value = codes[0]?.rawValue;

                    if (value) {
                      setManualToken(value);
                      void lookupCard(value);
                    }
                  }}
                  onError={(scannerError) => {
                    setError(
                      scannerError.message ?? "No fue posible abrir la cámara.",
                    );
                  }}
                />

                {loading && (
                  <div className="camera-loading">
                    <LoaderCircle className="scanner-spinner" size={30} />
                    Consultando tarjeta...
                  </div>
                )}
              </div>

              <button
                type="button"
                className="scanner-text-button"
                onClick={() => {
                  setCameraEnabled(false);
                  setManualMode(true);
                  setError("");
                }}
              >
                <Keyboard size={17} />
                Ingresar código manualmente
              </button>
            </div>
          )}

          {manualMode && (
            <form className="manual-token-form" onSubmit={submitManualToken}>
              <button
                type="button"
                className="scanner-back-button"
                onClick={() => {
                  setManualMode(false);
                  setError("");
                }}
              >
                <ArrowLeft size={17} />
                Regresar
              </button>

              <span className="scanner-main-icon">
                <Keyboard size={30} />
              </span>

              <h2>Introduce el código</h2>

              <p>Pega el token contenido en el QR de la tarjeta.</p>

              <label htmlFor="qrToken">Código de la tarjeta</label>

              <input
                id="qrToken"
                value={manualToken}
                onChange={(event) => setManualToken(event.target.value)}
                placeholder="Ej. 8a8d6e32c166..."
                autoComplete="off"
                required
              />

              <button
                type="submit"
                className="scanner-primary-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoaderCircle className="scanner-spinner" size={18} />
                    Buscando...
                  </>
                ) : (
                  <>
                    <QrCode size={18} />
                    Buscar tarjeta
                  </>
                )}
              </button>
            </form>
          )}
        </section>
      )}

      {card && (
        <section className="customer-result">
          <div className="customer-card-header">
            <span className="customer-avatar">
              <UserRound size={25} />
            </span>

            <div>
              <small>Cliente encontrado</small>
              <h2>{card.customer.name}</h2>

              <p>
                {card.program.name}
                {" · "}
                {card.cardNumber}
              </p>
            </div>
          </div>

          <div className="customer-progress">
            <div className="progress-numbers">
              <span>
                <small>Progreso</small>

                <strong>
                  {card.balance} de {card.target}
                </strong>
              </span>

              <span>
                <small>Sellos faltantes</small>

                <strong>{card.remaining}</strong>
              </span>
            </div>

            <div className="progress-track">
              <span
                style={{
                  width: `${Math.min(
                    (card.balance / card.target) * 100,
                    100,
                  )}%`,
                }}
              />
            </div>
          </div>

          {card.rewardAvailable ? (
            <div className="reward-status available">
              <Check size={20} />

              <div>
                <strong>Recompensa disponible</strong>

                <span>
                  {card.reward?.name ?? "El cliente alcanzó la meta."}
                </span>
              </div>
            </div>
          ) : (
            <div className="reward-status">
              <Stamp size={20} />

              <div>
                <strong>Sigue acumulando</strong>

                <span>Faltan {card.remaining} sellos para la recompensa.</span>
              </div>
            </div>
          )}

          {card.rewardAvailable ? (
            <button
              type="button"
              className="redeem-reward-button"
              onClick={() => setRedeemDialogOpen(true)}
            >
              <Gift size={19} />
              Canjear recompensa
            </button>
          ) : (
            <button
              type="button"
              className="scanner-primary-button add-stamp-button"
              disabled={addingStamp}
              onClick={addStamp}
            >
              {addingStamp ? (
                <>
                  <LoaderCircle className="scanner-spinner" size={19} />
                  Agregando sello...
                </>
              ) : (
                <>
                  <Stamp size={19} />
                  Agregar 1 sello
                </>
              )}
            </button>
          )}
        </section>
      )}

      <AlertDialog
  open={redeemDialogOpen}
  onOpenChange={(open) => {
    if (!redeemingReward) {
      setRedeemDialogOpen(open);
    }
  }}
>
  <AlertDialogContent className="redeem-dialog">
    <AlertDialogHeader>
      <span className="redeem-dialog-icon">
        <Gift size={25} />
      </span>

      <AlertDialogTitle>
        ¿Confirmas el canje?
      </AlertDialogTitle>

      <AlertDialogDescription>
        Confirma que entregaste la recompensa a{" "}
        <strong>
          {card?.customer.name}
        </strong>
        . Su progreso cambiará de{" "}
        <strong>
          {card?.balance} a 0 sellos
        </strong>
        .
      </AlertDialogDescription>
    </AlertDialogHeader>

    <div className="redeem-dialog-reward">
      <small>Recompensa</small>

      <strong>
        {card?.reward?.name ??
          "Recompensa disponible"}
      </strong>

      {card?.reward?.description && (
        <span>
          {card.reward.description}
        </span>
      )}
    </div>

    <AlertDialogFooter>
      <AlertDialogCancel
        disabled={redeemingReward}
        className="redeem-cancel-button"
      >
        Cancelar
      </AlertDialogCancel>

      <button
        type="button"
        className="redeem-confirm-button"
        disabled={redeemingReward}
        onClick={redeemReward}
      >
        {redeemingReward ? (
          <>
            <LoaderCircle
              className="scanner-spinner"
              size={18}
            />
            Canjeando...
          </>
        ) : (
          <>
            <Check size={18} />
            Sí, entregar recompensa
          </>
        )}
      </button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
    </div>
  );
}
