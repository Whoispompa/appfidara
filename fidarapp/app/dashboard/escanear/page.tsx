"use client";

import dynamic from "next/dynamic";
import { FormEvent, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Coins,
  CreditCard,
  Gift,
  Hash,
  Keyboard,
  LoaderCircle,
  Mail,
  Phone,
  QrCode,
  RotateCcw,
  ShoppingBag,
  Stamp,
  UserRound,
  WalletCards,
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Scanner = dynamic(
  () =>
    import("@yudiel/react-qr-scanner").then(
      (scannerModule) => scannerModule.Scanner,
    ),
  { ssr: false },
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
    birthDate?: string | null;
    createdAt?: string | null;
    lastVisitAt?: string | null;
    marketingConsent?: boolean;
    isActive?: boolean;
  };
  program: {
    id: string;
    name: string;
    description?: string | null;
    programType?: number;
    targetValue?: number | null;
    pointsEarned?: number | null;
    amountRequired?: number | null;
    pointsEarningMethod?: number | null;
    limitOneVisitPerDay?: boolean;
    logoUrl?: string | null;
    backgroundColor?: string | null;
    foregroundColor?: string | null;
    labelColor?: string | null;
    cardStripImageUrl?: string | null;
    cardStripColor?: string | null;
    activeStampImageUrl?: string | null;
    inactiveStampImageUrl?: string | null;
    showPoweredByFidara?: boolean;
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
    rewardType?: number;
    rewardValue?: number | null;
  } | null;
  lifetimeEarned?: number;
  lifetimeRedeemed?: number;
  transactionCount?: number;
  totalSpent?: number;
  purchaseCount?: number;
  lastPurchaseAmount?: number | null;
  lastPurchaseAt?: string | null;
  activatedAt?: string | null;
  lastActivityAt?: string | null;
  walletPassCount?: number;
  walletPlatform?: string | null;
  walletInstalledAt?: string | null;
  walletSerialNumber?: string | null;
  checkedInToday?: boolean;
  nextVisitAvailableAt?: string | null;
  visitTimeZone?: string | null;
};

type ApiPayload = {
  success?: boolean;
  message?: string;
  data?: CardInformation;
  balance?: number;
  target?: number;
  rewardAvailable?: boolean;
  totalSpent?: number;
  purchaseCount?: number;
  programType?: number;
  earnedAmount?: number;
  earnedUnit?: "stamps" | "points";
  code?: string;
  reward?: CardInformation["reward"];
};

function resolveLogoUrl(value?: string | null) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;

  const apiUrl =
    process.env.NEXT_PUBLIC_FIDARA_API_URL ?? "https://api.fidara.mx";

  return `${apiUrl.replace(/\/+$/, "")}/${value.replace(/^\/+/, "")}`;
}

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatDate(value?: string | null) {
  if (!value) return "No registrada";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No registrada";

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getErrorMessage(caught: unknown, fallback: string) {
  return caught instanceof Error ? caught.message : fallback;
}

export default function ScannerPage() {
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [manualMode, setManualMode] = useState(false);
  const [qrToken, setQrToken] = useState("");
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [addingStamp, setAddingStamp] = useState(false);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [redeemingReward, setRedeemingReward] = useState(false);
  const [card, setCard] = useState<CardInformation | null>(null);

  const brandLogoUrl = useMemo(
    () => resolveLogoUrl(card?.program.logoUrl ?? card?.organization.logoUrl),
    [card?.organization.logoUrl, card?.program.logoUrl],
  );

  const isPointsProgram = card?.program.programType === 2;

  const isSpendPointsProgram =
    isPointsProgram && card?.program.pointsEarningMethod === 1;

  const isVisitPointsProgram =
    isPointsProgram && card?.program.pointsEarningMethod === 2;

  const estimatedPoints = useMemo(() => {
    if (!card || !isPointsProgram) return 0;

    const pointsEarned = Number(card.program.pointsEarned ?? 0);

    if (isVisitPointsProgram) {
      return Math.max(pointsEarned, 0);
    }

    const amount = Number(purchaseAmount);
    const amountRequired = Number(card.program.amountRequired ?? 0);

    if (amount <= 0 || amountRequired <= 0 || pointsEarned <= 0) return 0;

    return Math.floor(amount / amountRequired) * pointsEarned;
  }, [card, isPointsProgram, isVisitPointsProgram, purchaseAmount]);

  const walletInstalled = useMemo(() => {
    if (!card) return false;

    return Boolean(
      (card.walletPassCount ?? 0) > 0 ||
      card.walletPlatform ||
      card.walletInstalledAt,
    );
  }, [card]);

  const walletStatus = useMemo(() => {
    if (!card) return "No disponible";

    if (walletInstalled) {
      return card.walletPlatform
        ? `Instalada en ${card.walletPlatform}`
        : "Instalada";
    }

    // Solamente afirmamos que no está instalada cuando la API manda cero.
    // Si el campo no llegó, el frontend no puede conocer el estado real.
    if (card.walletPassCount === 0) return "Sin instalar";

    return "No disponible";
  }, [card, walletInstalled]);

  const lookupCard = useCallback(
    async (rawValue: string) => {
      const cleanToken = rawValue.trim();

      if (!cleanToken || loading || card) return;

      setLoading(true);
      setQrToken(cleanToken);

      try {
        const response = await fetch("/api/wallet/cards/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrToken: cleanToken }),
        });

        const payload = (await response.json()) as ApiPayload;

        if (!response.ok || !payload.data) {
          throw new Error(payload.message ?? "No encontramos la tarjeta.");
        }

        setCard(payload.data);
        setCameraEnabled(false);
        setManualMode(false);
      } catch (caught) {
        toast.error("No se encontró la tarjeta", {
          description: getErrorMessage(
            caught,
            "No fue posible consultar la tarjeta.",
          ),
        });
      } finally {
        setLoading(false);
      }
    },
    [card, loading],
  );

  async function submitManualToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await lookupCard(qrToken);
  }

  async function addStamp() {
    if (!card || addingStamp) return;

    const numericPurchaseAmount = Number(purchaseAmount);

    if (
      isSpendPointsProgram &&
      (!Number.isFinite(numericPurchaseAmount) || numericPurchaseAmount <= 0)
    ) {
      toast.error("Total de compra inválido", {
        description:
          "Ingresa un importe mayor a cero para calcular los puntos.",
      });
      return;
    }

    const validPurchaseAmount =
      Number.isFinite(numericPurchaseAmount) && numericPurchaseAmount > 0
        ? numericPurchaseAmount
        : null;

    setAddingStamp(true);

    try {
      const response = await fetch("/api/wallet/cards/earn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrToken,
          purchaseAmount: validPurchaseAmount,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const payload = (await response.json()) as ApiPayload;

      if (!response.ok) {
        throw new Error(
          payload.message ?? "No fue posible registrar el progreso.",
        );
      }

      const earnedAmount = Number(
        payload.earnedAmount ?? (isPointsProgram ? estimatedPoints : 1),
      );
      const newBalance = Number(payload.balance ?? card.balance + earnedAmount);
      const target = Number(payload.target ?? card.target);

      setCard((current) =>
        current
          ? {
              ...current,
              balance: newBalance,
              target,
              remaining: Math.max(target - newBalance, 0),
              rewardAvailable: Boolean(
                payload.rewardAvailable ?? newBalance >= target,
              ),
              totalSpent: Number(
                payload.totalSpent ??
                  (current.totalSpent ?? 0) + (validPurchaseAmount ?? 0),
              ),
              purchaseCount: Number(
                payload.purchaseCount ??
                  (current.purchaseCount ?? 0) +
                    (validPurchaseAmount === null ? 0 : 1),
              ),
              lifetimeEarned:
                (current.lifetimeEarned ?? current.balance) + earnedAmount,
              transactionCount: (current.transactionCount ?? 0) + 1,
              lastPurchaseAmount:
                validPurchaseAmount ?? current.lastPurchaseAmount,
              lastPurchaseAt:
                validPurchaseAmount === null
                  ? current.lastPurchaseAt
                  : new Date().toISOString(),
              checkedInToday: isVisitPointsProgram
                ? true
                : current.checkedInToday,
            }
          : current,
      );

      setPurchaseAmount("");

      toast.success(
        isVisitPointsProgram
          ? "Visita registrada"
          : isPointsProgram
            ? "Puntos agregados"
            : "Sello agregado",
        {
          description: isPointsProgram
            ? `${card.customer.name} obtuvo ${earnedAmount} puntos y ahora tiene ${newBalance}.`
            : `${card.customer.name} ahora tiene ${newBalance} de ${target} sellos.`,
        },
      );
    } catch (caught) {
      toast.error(
        isVisitPointsProgram
          ? "No se pudo registrar la visita"
          : isPointsProgram
            ? "No se pudieron agregar los puntos"
            : "No se pudo agregar el sello",
        {
          description: getErrorMessage(
            caught,
            "Ocurrió un error inesperado al registrar el progreso.",
          ),
        },
      );
    } finally {
      setAddingStamp(false);
    }
  }

  async function redeemReward() {
    if (!card || !card.rewardAvailable || redeemingReward) return;

    setRedeemingReward(true);

    try {
      const response = await fetch("/api/wallet/cards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrToken,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const payload = (await response.json()) as ApiPayload;

      if (!response.ok) {
        throw new Error(
          payload.message ?? "No fue posible canjear la recompensa.",
        );
      }

      const newBalance = Number(payload.balance ?? 0);
      const target = Number(payload.target ?? card.target);
      const rewardName = card.reward?.name ?? "Recompensa";

      setCard((current) =>
        current
          ? {
              ...current,
              balance: newBalance,
              target,
              remaining: Math.max(target - newBalance, 0),
              rewardAvailable: false,
              reward: null,
              lifetimeRedeemed: (current.lifetimeRedeemed ?? 0) + 1,
              transactionCount: (current.transactionCount ?? 0) + 1,
            }
          : current,
      );

      setRedeemDialogOpen(false);
      toast.success("Recompensa canjeada", {
        description: `${rewardName} fue entregada a ${card.customer.name}.`,
      });
    } catch (caught) {
      toast.error("No se pudo canjear", {
        description: getErrorMessage(
          caught,
          "Ocurrió un error inesperado al canjear la recompensa.",
        ),
      });
    } finally {
      setRedeemingReward(false);
    }
  }

  function resetScanner() {
    setCard(null);
    setQrToken("");
    setPurchaseAmount("");
    setCameraEnabled(true);
    setManualMode(false);
  }

  return (
    <main
      className={`mx-auto min-h-full w-full max-w-[1652px] px-[clamp(20px,3vw,46px)] text-[#111827] ${
        card ? "pb-6 pt-4" : "pb-12 pt-8"
      }`}
    >
      {!card && (
        <section className="mb-7">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#e11d48]">
            Atención al cliente
          </span>
          <h1 className="mt-3 text-[clamp(34px,4vw,48px)] font-extrabold leading-none tracking-[-0.045em] text-[#111827]">
            Escanear tarjeta
          </h1>
          <p className="mt-3 text-sm text-slate-500 sm:text-base">
            Consulta el progreso, las compras y la información del cliente.
          </p>
        </section>
      )}

      {!card && (
        <Card className="overflow-hidden rounded-[22px] border-[#e5e7eb] bg-white shadow-[0_18px_45px_rgba(17,24,39,0.06)]">
          {cameraEnabled && (
            <div className="flex flex-col items-center px-4 py-8 sm:px-8">
              <div className="relative aspect-square w-full max-w-[520px] overflow-hidden rounded-[22px] border-4 border-[#111827] bg-black shadow-xl [&_video]:h-full [&_video]:w-full [&_video]:object-cover">
                <Scanner
                  paused={loading}
                  formats={["qr_code"]}
                  constraints={{ facingMode: "environment" }}
                  sound={false}
                  components={{ finder: true, torch: true, zoom: true }}
                  onScan={(codes) => {
                    const value = codes[0]?.rawValue;
                    if (value) void lookupCard(value);
                  }}
                  onError={(scannerError) => {
                    toast.error("No se pudo abrir la cámara", {
                      description:
                        scannerError.message ??
                        "Revisa los permisos de cámara del navegador.",
                    });
                  }}
                />
                {loading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90 font-bold text-[#111827] backdrop-blur-sm">
                    <LoaderCircle className="size-8 animate-spin text-[#e11d48]" />
                    Consultando tarjeta…
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                className="mt-4 font-bold text-slate-600"
                onClick={() => {
                  setCameraEnabled(false);
                  setManualMode(true);
                }}
              >
                <Keyboard className="mr-2 size-4" />
                Ingresar código manualmente
              </Button>
            </div>
          )}

          {manualMode && (
            <form
              className="mx-auto flex min-h-[430px] w-full max-w-xl flex-col justify-center px-6 py-10"
              onSubmit={submitManualToken}
            >
              <Button
                type="button"
                variant="ghost"
                className="mb-5 w-fit px-0 font-bold text-slate-500 hover:bg-transparent"
                onClick={() => {
                  setManualMode(false);
                  setCameraEnabled(true);
                }}
              >
                <ArrowLeft className="mr-2 size-4" />
                Regresar
              </Button>
              <span className="grid size-14 place-items-center rounded-2xl bg-[#fff1f4] text-[#e11d48]">
                <Keyboard size={27} />
              </span>
              <h2 className="mt-5 text-2xl font-extrabold tracking-[-0.03em] text-[#111827]">
                Introduce el código
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Pega el token contenido en el QR de la tarjeta.
              </p>
              <Label
                htmlFor="qrToken"
                className="mt-6 font-bold text-[#111827]"
              >
                Código de la tarjeta
              </Label>
              <Input
                id="qrToken"
                className="mt-2 h-12 rounded-[13px] border-[#e5e7eb] px-4 focus-visible:ring-[#e11d48]"
                value={qrToken}
                onChange={(event) => setQrToken(event.target.value)}
                placeholder="Ej. 8a8d6e32c166…"
                autoComplete="off"
                required
              />
              <Button
                type="submit"
                className="mt-4 h-[46px] rounded-[14px] bg-[#e11d48] font-extrabold text-white shadow-[0_12px_26px_rgba(225,29,72,0.22)] hover:bg-[#be123c]"
                disabled={loading}
              >
                {loading ? (
                  <LoaderCircle className="mr-2 size-5 animate-spin" />
                ) : (
                  <QrCode className="mr-2 size-5" />
                )}
                {loading ? "Buscando…" : "Buscar tarjeta"}
              </Button>
            </form>
          )}
        </Card>
      )}

      {card && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
          <Card className="overflow-hidden rounded-[22px] border-[#e5e7eb] bg-white shadow-[0_18px_45px_rgba(17,24,39,0.06)]">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-[#fff1f4] text-[#e11d48]">
                {brandLogoUrl ? (
                  // La API puede servir logos desde un dominio dinámico.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={brandLogoUrl}
                    alt={card.program.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound size={24} />
                )}
              </span>
              <div className="min-w-0">
                <small className="font-extrabold uppercase tracking-[0.13em] text-[#e11d48]">
                  Cliente encontrado
                </small>
                <h2 className="truncate text-2xl font-extrabold tracking-[-0.035em] text-[#111827]">
                  {card.customer.name}
                </h2>
                <p className="truncate text-sm text-slate-500">
                  {card.program.name} · {card.cardNumber}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="ml-auto h-10 shrink-0 rounded-xl border-[#e5e7eb] bg-white px-3 font-extrabold shadow-sm sm:px-4"
                onClick={resetScanner}
              >
                <RotateCcw className="size-4 sm:mr-2" />
                <span className="hidden sm:inline">Escanear otra</span>
              </Button>
            </div>

            <div className="px-5 py-5 sm:px-6">
              {isPointsProgram ? (
                <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-11 place-items-center rounded-[14px] bg-[#fff1f4] text-[#e11d48]">
                        <Coins size={23} />
                      </span>
                      <div>
                        <small className="font-bold uppercase tracking-[0.12em] text-slate-500">
                          Puntos disponibles
                        </small>
                        <strong className="block text-3xl font-extrabold tracking-[-0.04em] text-[#111827]">
                          {card.balance.toLocaleString("es-MX")}
                        </strong>
                      </div>
                    </div>

                    <div className="text-right">
                      <small className="font-bold uppercase tracking-[0.12em] text-slate-500">
                        Meta
                      </small>
                      <strong className="block text-xl font-extrabold text-[#111827]">
                        {card.target.toLocaleString("es-MX")}
                      </strong>
                    </div>
                  </div>

                  <div
                    className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-200"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={card.target}
                    aria-valuenow={Math.min(card.balance, card.target)}
                  >
                    <span
                      className="block h-full rounded-full bg-[#e11d48] transition-[width] duration-300"
                      style={{
                        width: `${Math.min((card.balance / Math.max(card.target, 1)) * 100, 100)}%`,
                      }}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                    <span>
                      {Math.max(card.target - card.balance, 0).toLocaleString(
                        "es-MX",
                      )}{" "}
                      puntos para la meta
                    </span>
                    <span>
                      {isVisitPointsProgram
                        ? `${card.program.pointsEarned ?? 0} puntos por visita`
                        : `${card.program.pointsEarned ?? 0} puntos por cada $${Number(
                            card.program.amountRequired ?? 0,
                          ).toLocaleString("es-MX")} MXN`}
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  className="grid grid-cols-5 gap-2 sm:grid-cols-10"
                  aria-label={`${card.balance} de ${card.target} sellos acumulados`}
                >
                  {Array.from({ length: Math.min(card.target, 20) }).map(
                    (_, index) => {
                      const earned = index < card.balance;

                      return (
                        <span
                          key={index}
                          title={
                            earned
                              ? `Sello ${index + 1} obtenido`
                              : `Sello ${index + 1} pendiente`
                          }
                          className="grid aspect-square min-h-9 place-items-center overflow-hidden rounded-full"
                        >
                          {brandLogoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={brandLogoUrl}
                              alt=""
                              className={`h-[82%] w-[82%] rounded-full object-contain ${
                                earned ? "opacity-100" : "grayscale opacity-20"
                              }`}
                            />
                          ) : (
                            <Stamp
                              className={
                                earned ? "text-[#e11d48]" : "text-slate-200"
                              }
                              size={21}
                            />
                          )}
                        </span>
                      );
                    },
                  )}
                </div>
              )}

              {card.rewardAvailable && (
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white shadow-sm">
                    <Gift size={19} />
                  </span>
                  <div>
                    <strong className="block text-sm">
                      Recompensa disponible
                    </strong>
                    <span className="text-sm opacity-75">
                      {card.reward?.name ?? "El cliente alcanzó la meta."}
                    </span>
                  </div>
                </div>
              )}

              {isVisitPointsProgram &&
                card.program.limitOneVisitPerDay &&
                card.checkedInToday && (
                  <div className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white shadow-sm">
                      <Check size={19} />
                    </span>
                    <div>
                      <strong className="block text-sm">
                        Visita registrada hoy
                      </strong>
                      <span className="text-sm opacity-75">
                        Este cliente podrá volver a acumular puntos mañana.
                      </span>
                    </div>
                  </div>
                )}

              {(!card.rewardAvailable || isPointsProgram) && (
                <div className="mt-5">
                  <Label
                    htmlFor="purchaseAmount"
                    className="font-bold text-[#111827]"
                  >
                    {isVisitPointsProgram
                      ? "Total de la compra (opcional)"
                      : "Total de la compra"}
                  </Label>
                  <div className="relative mt-2">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-extrabold text-[#111827]">
                      $
                    </span>
                    <Input
                      id="purchaseAmount"
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      step="0.01"
                      value={purchaseAmount}
                      onChange={(event) =>
                        setPurchaseAmount(event.target.value)
                      }
                      placeholder="0.00"
                      className="h-14 rounded-[13px] border-[#e5e7eb] pl-9 pr-16 text-lg font-bold focus-visible:ring-[#e11d48]"
                    />
                    <small className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">
                      MXN
                    </small>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {isVisitPointsProgram
                      ? "El total de la compra es opcional para registrar la visita."
                      : isSpendPointsProgram && estimatedPoints > 0
                        ? `Esta compra generará ${estimatedPoints} puntos.`
                        : "Se registrará en el historial de compras del cliente."}
                  </p>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                {card.rewardAvailable && (
                  <Button
                    type="button"
                    className="h-11 rounded-xl bg-emerald-600 px-6 font-bold text-white hover:bg-emerald-700"
                    onClick={() => setRedeemDialogOpen(true)}
                  >
                    <Gift className="mr-2 size-5" />
                    Canjear recompensa
                  </Button>
                )}

                {(!card.rewardAvailable || isPointsProgram) && (
                  <Button
                    type="button"
                    className="h-11 rounded-[14px] bg-[#e11d48] px-6 font-extrabold text-white shadow-[0_12px_26px_rgba(225,29,72,0.22)] hover:bg-[#be123c]"
                    disabled={
                      addingStamp ||
                      (isSpendPointsProgram && estimatedPoints <= 0) ||
                      (isVisitPointsProgram &&
                        Boolean(card.program.limitOneVisitPerDay) &&
                        Boolean(card.checkedInToday))
                    }
                    onClick={addStamp}
                  >
                    {addingStamp ? (
                      <LoaderCircle className="mr-2 size-5 animate-spin" />
                    ) : isPointsProgram ? (
                      <Coins className="mr-2 size-5" />
                    ) : (
                      <Stamp className="mr-2 size-5" />
                    )}
                    {addingStamp
                      ? isVisitPointsProgram
                        ? "Registrando visita…"
                        : isPointsProgram
                          ? "Agregando puntos…"
                          : "Agregando sello…"
                      : isVisitPointsProgram
                        ? card.program.limitOneVisitPerDay &&
                          card.checkedInToday
                          ? "Visita registrada hoy"
                          : `Registrar visita · +${estimatedPoints} puntos`
                        : isSpendPointsProgram
                          ? estimatedPoints > 0
                            ? `Agregar ${estimatedPoints} puntos`
                            : "Ingresa una compra válida"
                          : "Agregar 1 sello"}
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-1">
            <Card className="rounded-[18px] border-[#e5e7eb] bg-white p-4 shadow-[0_10px_30px_rgba(17,24,39,0.045)] sm:p-5">
              <h3 className="text-lg font-extrabold tracking-[-0.025em] text-[#111827]">
                Información del cliente
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <InfoRow
                  icon={<Mail size={17} />}
                  label="Correo"
                  value={card.customer.email ?? "No registrado"}
                />
                <InfoRow
                  icon={<Phone size={17} />}
                  label="Teléfono"
                  value={card.customer.phone ?? "No registrado"}
                />
                <InfoRow
                  icon={<CalendarDays size={17} />}
                  label="Nacimiento"
                  value={formatDate(card.customer.birthDate)}
                />
                <InfoRow
                  icon={<UserRound size={17} />}
                  label="Cliente desde"
                  value={formatDate(card.customer.createdAt)}
                />
              </div>
            </Card>

            <Card className="rounded-[18px] border-[#e5e7eb] bg-white p-4 shadow-[0_10px_30px_rgba(17,24,39,0.045)] sm:p-5">
              <h3 className="text-lg font-extrabold tracking-[-0.025em] text-[#111827]">
                Información de la tarjeta
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Metric
                  icon={<ShoppingBag size={18} />}
                  label="Total gastado"
                  value={formatMoney(card.totalSpent)}
                />
                <Metric
                  icon={<CreditCard size={18} />}
                  label="Compras"
                  value={String(card.purchaseCount ?? 0)}
                />
                <Metric
                  icon={
                    isPointsProgram ? <Coins size={18} /> : <Stamp size={18} />
                  }
                  label={
                    isPointsProgram ? "Puntos históricos" : "Sellos históricos"
                  }
                  value={String(card.lifetimeEarned ?? card.balance)}
                />
                <Metric
                  icon={<Gift size={18} />}
                  label="Canjes"
                  value={String(card.lifetimeRedeemed ?? 0)}
                />
              </div>
              <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2 xl:grid-cols-1">
                <InfoRow
                  icon={<CreditCard size={17} />}
                  label="Número de tarjeta"
                  value={card.cardNumber}
                />
                <InfoRow
                  icon={<WalletCards size={17} />}
                  label="Wallet"
                  value={walletStatus}
                />
                <InfoRow
                  icon={<CalendarDays size={17} />}
                  label="Instalada el"
                  value={
                    walletInstalled
                      ? formatDate(card.walletInstalledAt)
                      : "No disponible"
                  }
                />
                <InfoRow
                  icon={<Hash size={17} />}
                  label="Número de serie"
                  value={card.walletSerialNumber ?? "No disponible"}
                />
                <InfoRow
                  icon={<ShoppingBag size={17} />}
                  label="Última compra"
                  value={
                    card.lastPurchaseAmount == null
                      ? "No registrada"
                      : formatMoney(card.lastPurchaseAmount)
                  }
                />
                <InfoRow
                  icon={<CalendarDays size={17} />}
                  label="Última actividad"
                  value={formatDate(card.lastActivityAt ?? card.lastPurchaseAt)}
                />
              </div>
            </Card>
          </div>
        </div>
      )}

      <AlertDialog
        open={redeemDialogOpen}
        onOpenChange={(open) => {
          if (!redeemingReward) setRedeemDialogOpen(open);
        }}
      >
        <AlertDialogContent className="rounded-[22px] border-[#e5e7eb]">
          <AlertDialogHeader>
            <span className="mb-2 grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Gift size={24} />
            </span>
            <AlertDialogTitle className="text-2xl font-extrabold tracking-[-0.03em] text-[#111827]">
              ¿Confirmas el canje?
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              Confirma que entregaste la recompensa a{" "}
              <strong>{card?.customer.name}</strong>. Se descontarán los{" "}
              {isPointsProgram ? "puntos" : "sellos"}
              correspondientes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <small className="font-bold uppercase tracking-wider text-slate-500">
              Recompensa
            </small>
            <strong className="mt-1 block text-[#111827]">
              {card?.reward?.name ?? "Recompensa disponible"}
            </strong>
            {card?.reward?.description && (
              <span className="mt-1 block text-sm text-slate-500">
                {card.reward.description}
              </span>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={redeemingReward}
              className="rounded-xl"
            >
              Cancelar
            </AlertDialogCancel>
            <Button
              type="button"
              className="rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
              disabled={redeemingReward}
              onClick={redeemReward}
            >
              {redeemingReward ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : (
                <Check className="mr-2 size-4" />
              )}
              {redeemingReward ? "Canjeando…" : "Sí, entregar recompensa"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#fff1f4] text-[#e11d48]">
        {icon}
      </span>
      <div className="min-w-0">
        <small className="block text-xs font-medium text-slate-500">
          {label}
        </small>
        <strong className="block truncate text-sm text-[#111827]">
          {value}
        </strong>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <span className="text-[#e11d48]">{icon}</span>
      <small className="mt-2 block text-xs font-medium text-slate-500">
        {label}
      </small>
      <strong className="mt-1 block truncate text-lg font-extrabold tracking-[-0.025em] text-[#111827]">
        {value}
      </strong>
    </div>
  );
}
