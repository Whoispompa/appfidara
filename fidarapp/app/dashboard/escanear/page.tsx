"use client";

import dynamic from "next/dynamic";
import { FormEvent, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Check,
  CreditCard,
  Gift,
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
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [qrToken, setQrToken] = useState("");
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [addingStamp, setAddingStamp] = useState(false);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [redeemingReward, setRedeemingReward] = useState(false);
  const [card, setCard] = useState<CardInformation | null>(null);

  const brandLogoUrl = useMemo(
    () =>
      resolveLogoUrl(card?.program.logoUrl ?? card?.organization.logoUrl),
    [card?.organization.logoUrl, card?.program.logoUrl],
  );

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

    if (!Number.isFinite(numericPurchaseAmount) || numericPurchaseAmount <= 0) {
      toast.error("Total de compra inválido", {
        description: "Ingresa un importe mayor a cero antes de agregar el sello.",
      });
      return;
    }

    setAddingStamp(true);

    try {
      const response = await fetch("/api/wallet/cards/stamps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrToken,
          purchaseAmount: numericPurchaseAmount,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const payload = (await response.json()) as ApiPayload;

      if (!response.ok) {
        throw new Error(payload.message ?? "No fue posible agregar el sello.");
      }

      const newBalance = Number(payload.balance ?? card.balance + 1);
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
                  (current.totalSpent ?? 0) + numericPurchaseAmount,
              ),
              purchaseCount: Number(
                payload.purchaseCount ?? (current.purchaseCount ?? 0) + 1,
              ),
              lifetimeEarned: (current.lifetimeEarned ?? current.balance) + 1,
              transactionCount: (current.transactionCount ?? 0) + 1,
              lastPurchaseAmount: numericPurchaseAmount,
              lastPurchaseAt: new Date().toISOString(),
            }
          : current,
      );

      setPurchaseAmount("");

      toast.success("Sello agregado", {
        description: `${card.customer.name} ahora tiene ${newBalance} de ${target} sellos.`,
      });
    } catch (caught) {
      toast.error("No se pudo agregar el sello", {
        description: getErrorMessage(
          caught,
          "Ocurrió un error inesperado al registrar el sello.",
        ),
      });
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
    setCameraEnabled(false);
    setManualMode(false);
  }

  return (
    <main className="mx-auto min-h-full w-full max-w-[1652px] px-[clamp(20px,3vw,46px)] pb-12 pt-8 text-[#111827]">
      <section className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#e11d48]">
            Atención al cliente
          </span>
          <h1 className="mt-3 text-[clamp(34px,4vw,48px)] font-extrabold leading-none tracking-[-0.045em] text-[#111827]">
            Escanear tarjeta
          </h1>
          <p className="mt-3 text-sm text-slate-500 sm:text-base">
            Consulta los sellos, las compras y la información del cliente.
          </p>
        </div>

        {card && (
          <Button
            type="button"
            variant="outline"
            className="h-[46px] rounded-[14px] border-[#e5e7eb] bg-white px-5 font-extrabold shadow-sm"
            onClick={resetScanner}
          >
            <RotateCcw className="mr-2 size-4" />
            Escanear otra
          </Button>
        )}
      </section>

      {!card && (
        <Card className="overflow-hidden rounded-[22px] border-[#e5e7eb] bg-white shadow-[0_18px_45px_rgba(17,24,39,0.06)]">
          {!cameraEnabled && !manualMode && (
            <div className="flex min-h-[430px] flex-col items-center justify-center px-6 py-12 text-center">
              <span className="grid size-16 place-items-center rounded-2xl bg-[#fff1f4] text-[#e11d48]">
                <QrCode size={31} />
              </span>
              <h2 className="mt-5 text-2xl font-extrabold tracking-[-0.03em] text-[#111827]">
                Busca una tarjeta
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Escanea el código QR del cliente o ingresa manualmente el token.
              </p>
              <div className="mt-7 flex w-full max-w-md flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  className="h-[46px] flex-1 rounded-[14px] bg-[#e11d48] font-extrabold text-white shadow-[0_12px_26px_rgba(225,29,72,0.22)] hover:bg-[#be123c]"
                  onClick={() => setCameraEnabled(true)}
                >
                  <Camera className="mr-2 size-5" />
                  Abrir cámara
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-[46px] flex-1 rounded-[14px] border-[#e5e7eb] font-extrabold"
                  onClick={() => setManualMode(true)}
                >
                  <Keyboard className="mr-2 size-5" />
                  Ingresar código
                </Button>
              </div>
            </div>
          )}

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
                onClick={() => setManualMode(false)}
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
              <Label htmlFor="qrToken" className="mt-6 font-bold text-[#111827]">
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
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.75fr)]">
          <Card className="overflow-hidden rounded-[22px] border-[#e5e7eb] bg-white shadow-[0_18px_45px_rgba(17,24,39,0.06)]">
            <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-6 sm:px-7">
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
            </div>

            <div className="px-5 py-6 sm:px-7">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <small className="font-extrabold uppercase tracking-[0.12em] text-slate-500">
                    Progreso
                  </small>
                  <p className="text-3xl font-extrabold tracking-[-0.04em] text-[#111827]">
                    {card.balance} de {card.target}
                  </p>
                </div>
                <div className="text-right">
                  <small className="font-extrabold uppercase tracking-[0.12em] text-slate-500">
                    Sellos faltantes
                  </small>
                  <p className="text-3xl font-extrabold tracking-[-0.04em] text-[#111827]">
                    {card.remaining}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-10">
                {Array.from({ length: card.target }).map((_, index) => {
                  const earned = index < card.balance;

                  return (
                    <span
                      key={index}
                      title={earned ? `Sello ${index + 1} obtenido` : `Sello ${index + 1} pendiente`}
                      className={`grid aspect-square min-h-12 place-items-center overflow-hidden rounded-xl border transition ${
                        earned
                          ? "border-[#e11d48] bg-[#e11d48] text-white shadow-[0_7px_16px_rgba(225,29,72,0.18)]"
                          : "border-slate-200 bg-slate-50 text-slate-300"
                      }`}
                    >
                      {brandLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={brandLogoUrl}
                          alt=""
                          className={`h-full w-full object-cover ${
                            earned ? "" : "grayscale opacity-25"
                          }`}
                        />
                      ) : (
                        <Stamp size={20} />
                      )}
                    </span>
                  );
                })}
              </div>

              <div
                className={`mt-6 flex items-center gap-3 rounded-2xl border p-4 ${
                  card.rewardAvailable
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-[#fafafa] text-[#111827]"
                }`}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white shadow-sm">
                  {card.rewardAvailable ? <Gift size={20} /> : <Stamp size={20} />}
                </span>
                <div>
                  <strong className="block text-sm">
                    {card.rewardAvailable
                      ? "Recompensa disponible"
                      : "Sigue acumulando"}
                  </strong>
                  <span className="text-sm opacity-75">
                    {card.rewardAvailable
                      ? card.reward?.name ?? "El cliente alcanzó la meta."
                      : `Faltan ${card.remaining} sellos para la recompensa.`}
                  </span>
                </div>
              </div>

              {!card.rewardAvailable && (
                <div className="mt-6">
                  <Label htmlFor="purchaseAmount" className="font-bold text-[#111827]">
                    Total de la compra
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
                      onChange={(event) => setPurchaseAmount(event.target.value)}
                      placeholder="0.00"
                      className="h-14 rounded-[13px] border-[#e5e7eb] pl-9 pr-16 text-lg font-bold focus-visible:ring-[#e11d48]"
                    />
                    <small className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">
                      MXN
                    </small>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Se registrará en el historial de compras del cliente.
                  </p>
                </div>
              )}

              {card.rewardAvailable ? (
                <Button
                  type="button"
                  className="mt-6 h-12 rounded-xl bg-emerald-600 px-6 font-bold text-white hover:bg-emerald-700"
                  onClick={() => setRedeemDialogOpen(true)}
                >
                  <Gift className="mr-2 size-5" />
                  Canjear recompensa
                </Button>
              ) : (
                <Button
                  type="button"
                  className="mt-6 h-[46px] rounded-[14px] bg-[#e11d48] px-6 font-extrabold text-white shadow-[0_12px_26px_rgba(225,29,72,0.22)] hover:bg-[#be123c]"
                  disabled={addingStamp}
                  onClick={addStamp}
                >
                  {addingStamp ? (
                    <LoaderCircle className="mr-2 size-5 animate-spin" />
                  ) : (
                    <Stamp className="mr-2 size-5" />
                  )}
                  {addingStamp ? "Agregando sello…" : "Agregar 1 sello"}
                </Button>
              )}
            </div>
          </Card>

          <div className="space-y-5">
            <Card className="rounded-[18px] border-[#e5e7eb] bg-white p-5 shadow-[0_10px_30px_rgba(17,24,39,0.045)] sm:p-6">
              <h3 className="text-lg font-extrabold tracking-[-0.025em] text-[#111827]">
                Información del cliente
              </h3>
              <div className="mt-5 space-y-4">
                <InfoRow icon={<Mail size={17} />} label="Correo" value={card.customer.email ?? "No registrado"} />
                <InfoRow icon={<Phone size={17} />} label="Teléfono" value={card.customer.phone ?? "No registrado"} />
                <InfoRow icon={<CalendarDays size={17} />} label="Nacimiento" value={formatDate(card.customer.birthDate)} />
                <InfoRow icon={<UserRound size={17} />} label="Cliente desde" value={formatDate(card.customer.createdAt)} />
              </div>
            </Card>

            <Card className="rounded-[18px] border-[#e5e7eb] bg-white p-5 shadow-[0_10px_30px_rgba(17,24,39,0.045)] sm:p-6">
              <h3 className="text-lg font-extrabold tracking-[-0.025em] text-[#111827]">
                Actividad
              </h3>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Metric icon={<ShoppingBag size={18} />} label="Total gastado" value={formatMoney(card.totalSpent)} />
                <Metric icon={<CreditCard size={18} />} label="Compras" value={String(card.purchaseCount ?? 0)} />
                <Metric icon={<Stamp size={18} />} label="Sellos históricos" value={String(card.lifetimeEarned ?? card.balance)} />
                <Metric icon={<Gift size={18} />} label="Canjes" value={String(card.lifetimeRedeemed ?? 0)} />
              </div>
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                <InfoRow icon={<ShoppingBag size={17} />} label="Última compra" value={card.lastPurchaseAmount == null ? "No registrada" : formatMoney(card.lastPurchaseAmount)} />
                <InfoRow icon={<CalendarDays size={17} />} label="Última actividad" value={formatDate(card.lastActivityAt ?? card.lastPurchaseAt)} />
                <InfoRow icon={<WalletCards size={17} />} label="Wallet" value={card.walletPlatform ?? (card.walletPassCount ? `${card.walletPassCount} pase(s)` : "Sin instalar")} />
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
              <strong>{card?.customer.name}</strong>. Se descontarán los sellos
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
            <AlertDialogCancel disabled={redeemingReward} className="rounded-xl">
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
        <small className="block text-xs font-medium text-slate-500">{label}</small>
        <strong className="block truncate text-sm text-[#111827]">{value}</strong>
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
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <span className="text-[#e11d48]">{icon}</span>
      <small className="mt-3 block text-xs font-medium text-slate-500">{label}</small>
      <strong className="mt-1 block truncate text-lg font-extrabold tracking-[-0.025em] text-[#111827]">
        {value}
      </strong>
    </div>
  );
}
