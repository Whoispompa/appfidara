"use client";

import dynamic from "next/dynamic";
import { FormEvent, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  Coins,
  CreditCard,
  Gift,
  Hash,
  Keyboard,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  QrCode,
  ShoppingBag,
  Stamp,
  TicketPercent,
  UserRound,
  WalletCards,
  Banknote,
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
import { FidaraConfirmDialog } from "@/components/ui/fidara-confirm-dialog";
import { useActiveLocation } from "@/components/gift-cards/active-location";
import { SubscriptionScanPanel } from "@/components/subscriptions/subscription-scan-panel";
import {
  complementaryPaymentMethodLabel,
  type GiftCardComplementaryPaymentStatus,
} from "@/lib/gift-card-complementary-payment";
import {
  type ApiEnvelope as SubscriptionEnvelope,
  type MembershipLookup,
  subscriptionsEnabled,
} from "@/lib/subscriptions";
import { operationalErrorMessage } from "@/lib/active-location-client";

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
    cashbackEarningMethod?: number | null;
    cashbackPercentage?: number | null;
    cashbackAmount?: number | null;
    cashbackAmountRequired?: number | null;
    minimumCashbackRedemption?: number | null;
    couponBenefitType?: number | null;
    couponBenefitValue?: number | null;
    couponMinimumPurchase?: number | null;
    couponMaximumDiscount?: number | null;
    couponExpirationType?: number | null;
    couponValidityDays?: number | null;
    couponFixedExpirationAt?: string | null;
    couponUsageLimit?: number | null;
    couponTerms?: string | null;
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
  cashbackAvailable?: boolean;
  cashbackBalance?: number | null;
  minimumCashbackRedemption?: number | null;
  balanceUnit?: "stamps" | "points" | "cashback";
  coupon?: {
    id: string;
    code?: string | null;
    qrToken?: string | null;
    status?: number | string | null;
    statusName?: string | null;
    issuedAt?: string | null;
    expiresAt?: string | null;
    usageLimit?: number | null;
    timesRedeemed?: number | null;
    remainingUses?: number | null;
    expired?: boolean;
    benefitType?: number | null;
    benefitValue?: number | null;
    minimumPurchase?: number | null;
    maximumDiscount?: number | null;
    terms?: string | null;
  } | null;
  couponAvailable?: boolean;
  couponExpired?: boolean;
  couponExpiresAt?: string | null;
  couponUsedCount?: number | null;
  couponRemainingUses?: number | null;
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
  lastGrossPurchaseAmount?: number | null;
  lastCashbackApplied?: number | null;
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
  cashbackAvailable?: boolean;
  cashbackBalance?: number | null;
  minimumCashbackRedemption?: number | null;
  amountDue?: number;
  operationId?: string;
  grossPurchaseAmount?: number;
  purchaseAmount?: number;
  cashbackRedeemed?: number;
  cashbackEarned?: number;
  balanceAfterRedemption?: number;
  totalSpent?: number;
  purchaseCount?: number;
  programType?: number;
  earnedAmount?: number;
  earnedUnit?: "stamps" | "points" | "cashback";
  code?: string;
  discountAmount?: number;
  amountToPay?: number;
  remainingUses?: number;
  couponStatus?: number | string;
  couponAvailable?: boolean;
  discountApplied?: number;
  coupon?: CardInformation["coupon"];
  reward?: CardInformation["reward"];
};

type GiftCardInformation = {
  id: string;
  programName?: string;
  recipientName?: string;
  currentBalance: number;
  purchasedAmount: number;
  currency?: string;
  status?: number;
  expiresAtUtc?: string | null;
};

type GiftCardMovement = {
  operationId?: string;
  movementType?: number | string;
  amount?: number;
  purchaseAmount?: number | null;
  balanceBefore?: number;
  balanceAfter?: number;
  reference?: string | null;
  createdAtUtc?: string;
  complementaryPaymentStatus?: GiftCardComplementaryPaymentStatus | null;
  complementaryPaymentMethod?: number | null;
  complementaryPaymentReference?: string | null;
  complementaryPaymentDueAmount?: number | null;
  complementaryPaymentCollectedAmount?: number | null;
  complementaryPaymentPendingAmount?: number | null;
  complementaryPaymentUnverifiedAmount?: number | null;
};

type GiftCardShare = {
  publicUrl?: string;
  whatsAppUrl?: string;
};

type GiftCardRedeemResult = {
  operationId?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  amount?: number;
  purchaseAmount?: number;
  remainingToPay?: number;
  complementaryPaymentStatus?: GiftCardComplementaryPaymentStatus;
  complementaryPaymentMethod?: number | null;
  complementaryPaymentReference?: string | null;
  complementaryPaymentDueAmount?: number;
  complementaryPaymentCollectedAmount?: number;
  complementaryPaymentPendingAmount?: number;
  complementaryPaymentUnverifiedAmount?: number;
  status?: number;
  replayed?: boolean;
  warnings?: string[];
};

type GiftCardRedeemRequest = {
  qrToken: string;
  purchaseAmount: number;
  amount: number;
  idempotencyKey: string;
  reference: string | null;
  notes: null;
  complementaryPaymentConfirmed?: true;
  complementaryPaymentMethod?: number;
  complementaryPaymentReference?: string | null;
};

type ComplementaryPaymentAttempt = {
  confirmed: true;
  method: number;
  reference: string | null;
};

function moneyToCents(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) return null;

  const [wholePart, decimalPart = ""] = normalized.split(".");
  const cents = Number(wholePart) * 100 + Number(decimalPart.padEnd(2, "0"));

  return Number.isSafeInteger(cents) ? cents : null;
}

function centsToInput(cents: number) {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

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

function complementaryPaymentSummary(input: {
  complementaryPaymentStatus?: GiftCardComplementaryPaymentStatus | null;
  complementaryPaymentMethod?: number | null;
  complementaryPaymentReference?: string | null;
  complementaryPaymentCollectedAmount?: number | null;
  complementaryPaymentUnverifiedAmount?: number | null;
}) {
  if (input.complementaryPaymentStatus === 1) {
    return "Cobro complementario no requerido";
  }
  if (input.complementaryPaymentStatus === 2) {
    const method = complementaryPaymentMethodLabel(
      input.complementaryPaymentMethod,
    );
    return [
      `Cobro complementario confirmado: ${formatMoney(input.complementaryPaymentCollectedAmount)}`,
      method,
      input.complementaryPaymentReference
        ? `Ref. ${input.complementaryPaymentReference}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (input.complementaryPaymentStatus === 0) {
    return `Cobro complementario no verificado: ${formatMoney(input.complementaryPaymentUnverifiedAmount)}`;
  }
  return null;
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

function getApiErrorMessage(
  payload: Record<string, unknown>,
  fallback: string,
) {
  const candidates = [payload.message, payload.detail, payload.error];
  return (
    candidates.find(
      (candidate): candidate is string =>
        typeof candidate === "string" && candidate.trim().length > 0,
    ) ?? fallback
  );
}

export default function ScannerPage() {
  const activeLocation = useActiveLocation();
  const [currentTimestamp] = useState(() => Date.now());
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [manualMode, setManualMode] = useState(false);
  const [qrToken, setQrToken] = useState("");
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [addingStamp, setAddingStamp] = useState(false);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [redeemingReward, setRedeemingReward] = useState(false);
  const [cashbackToRedeem, setCashbackToRedeem] = useState("");
  const [useCashback, setUseCashback] = useState(false);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [redeemingCoupon, setRedeemingCoupon] = useState(false);
  const [card, setCard] = useState<CardInformation | null>(null);
  const [giftCard, setGiftCard] = useState<GiftCardInformation | null>(null);
  const [membership, setMembership] = useState<MembershipLookup | null>(null);
  const [giftCardPurchaseAmount, setGiftCardPurchaseAmount] = useState("");
  const [giftCardAmount, setGiftCardAmount] = useState("");
  const [giftCardReference, setGiftCardReference] = useState("");
  const [complementaryPaymentConfirmed, setComplementaryPaymentConfirmed] =
    useState(false);
  const [complementaryPaymentMethod, setComplementaryPaymentMethod] =
    useState(1);
  const [complementaryPaymentReference, setComplementaryPaymentReference] =
    useState("");
  const [complementaryPaymentAttempt, setComplementaryPaymentAttempt] =
    useState<ComplementaryPaymentAttempt | null>(null);
  const [giftCardDialogOpen, setGiftCardDialogOpen] = useState(false);
  const [redeemingGiftCard, setRedeemingGiftCard] = useState(false);
  const [giftCardRedemption, setGiftCardRedemption] =
    useState<GiftCardRedeemResult | null>(null);
  const [giftCardRedemptionPurchaseCents, setGiftCardRedemptionPurchaseCents] =
    useState<number | null>(null);
  const [giftCardMovements, setGiftCardMovements] = useState<
    GiftCardMovement[]
  >([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsError, setMovementsError] = useState("");
  const [giftCardContractVerified, setGiftCardContractVerified] =
    useState(false);
  const [, setGiftCardShare] = useState<GiftCardShare | null>(null);

  const loadGiftCardMovements = useCallback(async (giftCardId: string) => {
    setMovementsLoading(true);
    setMovementsError("");
    setGiftCardContractVerified(false);
    try {
      const response = await fetch(
        `/api/gift-cards/${encodeURIComponent(giftCardId)}/movements`,
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!response.ok)
        throw new Error(
          getApiErrorMessage(payload, "No fue posible cargar los movimientos."),
        );
      const data = payload.data ?? payload;
      const list = Array.isArray(data)
        ? data
        : (Object.values(data as Record<string, unknown>).find(Array.isArray) ??
          []);
      const movements = list as GiftCardMovement[];
      setGiftCardMovements(movements);

      const exposesPurchaseAmount = movements.some((movement) =>
        Object.prototype.hasOwnProperty.call(movement, "purchaseAmount"),
      );
      if (!exposesPurchaseAmount) {
        setMovementsError(
          movements.length === 0
            ? "No fue posible verificar el contrato PurchaseAmount porque el historial no devolvió movimientos. El canje permanece bloqueado."
            : "El historial respondió con el contrato anterior y no incluye PurchaseAmount. El canje permanece bloqueado.",
        );
        return;
      }

      setGiftCardContractVerified(true);
    } catch (caught) {
      const message = getErrorMessage(
        caught,
        "No fue posible cargar el historial.",
      );
      setMovementsError(message);
      toast.error("No se pudo cargar el historial", { description: message });
    } finally {
      setMovementsLoading(false);
    }
  }, []);

  const loadGiftCardShare = useCallback(async (giftCardId: string) => {
    try {
      const response = await fetch(
        `/api/gift-cards/${encodeURIComponent(giftCardId)}/share`,
        { cache: "no-store" },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return;
      setGiftCardShare((payload.data ?? payload) as GiftCardShare);
    } catch {
      // Compartir es una acción secundaria; la consulta y el canje siguen disponibles.
    }
  }, []);

  const brandLogoUrl = useMemo(
    () => resolveLogoUrl(card?.program.logoUrl ?? card?.organization.logoUrl),
    [card?.organization.logoUrl, card?.program.logoUrl],
  );

  const isPointsProgram = card?.program.programType === 2;
  const isCashbackProgram = card?.program.programType === 3;
  const isCouponProgram = card?.program.programType === 4;

  const couponBenefitType = Number(card?.program.couponBenefitType ?? 0);
  const couponBenefitValue = Number(card?.program.couponBenefitValue ?? 0);
  const couponMinimumPurchase = Number(
    card?.program.couponMinimumPurchase ?? 0,
  );
  const couponMaximumDiscount = Number(
    card?.program.couponMaximumDiscount ?? 0,
  );
  const couponUsageLimit = Math.max(
    1,
    Number(card?.coupon?.usageLimit ?? card?.program.couponUsageLimit ?? 1),
  );
  const couponUsedCount = Math.max(
    0,
    Number(card?.coupon?.timesRedeemed ?? card?.couponUsedCount ?? 0),
  );
  const couponRemainingUses = Math.max(
    0,
    Number(
      card?.coupon?.remainingUses ??
        card?.couponRemainingUses ??
        couponUsageLimit - couponUsedCount,
    ),
  );
  const couponExpiresAt =
    card?.coupon?.expiresAt ??
    card?.couponExpiresAt ??
    card?.program.couponFixedExpirationAt ??
    null;
  const couponExpired = Boolean(
    card?.coupon?.expired ??
    card?.couponExpired ??
    (couponExpiresAt && new Date(couponExpiresAt).getTime() < currentTimestamp),
  );
  const couponAvailable = Boolean(
    card?.couponAvailable ?? (!couponExpired && couponRemainingUses > 0),
  );

  const couponBenefitText = useMemo(() => {
    if (couponBenefitType === 1) {
      return `${couponBenefitValue.toLocaleString("es-MX")}% de descuento`;
    }

    if (couponBenefitType === 2) {
      return `${formatMoney(couponBenefitValue)} de descuento`;
    }

    if (couponBenefitType === 3) return "Producto gratis";
    if (couponBenefitType === 4) return "Beneficio especial";

    return "Cupón disponible";
  }, [couponBenefitType, couponBenefitValue]);

  const couponPurchaseAmount = Number(purchaseAmount || 0);
  const couponHasValidPurchase =
    Number.isFinite(couponPurchaseAmount) && couponPurchaseAmount > 0;
  const couponMeetsMinimum =
    couponHasValidPurchase && couponPurchaseAmount >= couponMinimumPurchase;

  const couponDiscount = useMemo(() => {
    if (!isCouponProgram || !couponMeetsMinimum) return 0;

    if (couponBenefitType === 1) {
      const calculated = couponPurchaseAmount * (couponBenefitValue / 100);

      return Number(
        (couponMaximumDiscount > 0
          ? Math.min(calculated, couponMaximumDiscount)
          : calculated
        ).toFixed(2),
      );
    }

    if (couponBenefitType === 2) {
      return Number(
        Math.min(couponBenefitValue, couponPurchaseAmount).toFixed(2),
      );
    }

    return 0;
  }, [
    couponBenefitType,
    couponBenefitValue,
    couponMaximumDiscount,
    couponMeetsMinimum,
    couponPurchaseAmount,
    isCouponProgram,
  ]);

  const couponAmountToPay = Math.max(couponPurchaseAmount - couponDiscount, 0);

  const couponRequiresPurchaseAmount =
    couponBenefitType === 1 ||
    couponBenefitType === 2 ||
    couponMinimumPurchase > 0;

  const couponCanRedeem =
    couponAvailable &&
    !couponExpired &&
    couponRemainingUses > 0 &&
    (!couponRequiresPurchaseAmount || couponMeetsMinimum);

  const cashbackMinimumToUse = Number(
    card?.minimumCashbackRedemption ??
      card?.program.minimumCashbackRedemption ??
      0,
  );

  const cashbackRemainingToUnlock = Math.max(
    cashbackMinimumToUse - Number(card?.balance ?? 0),
    0,
  );

  const cashbackUnlockProgress =
    cashbackMinimumToUse <= 0
      ? 100
      : Math.min(
          (Number(card?.balance ?? 0) / cashbackMinimumToUse) * 100,
          100,
        );

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

  const estimatedCashback = useMemo(() => {
    if (!card || !isCashbackProgram) {
      return 0;
    }

    const grossAmount = Number(purchaseAmount);

    const cashbackApplied =
      useCashback && cashbackToRedeem.trim() !== ""
        ? Number(cashbackToRedeem)
        : 0;

    if (
      !Number.isFinite(grossAmount) ||
      grossAmount <= 0 ||
      !Number.isFinite(cashbackApplied) ||
      cashbackApplied < 0
    ) {
      return 0;
    }

    // El cashback nuevo se calcula únicamente
    // sobre lo pagado con efectivo o tarjeta.
    const amountPaid = Math.max(grossAmount - cashbackApplied, 0);

    const cashbackMethod = Number(card.program.cashbackEarningMethod) || 0;

    if (cashbackMethod === 1) {
      const percentage = Number(card.program.cashbackPercentage) || 0;

      return Number((amountPaid * (percentage / 100)).toFixed(2));
    }

    if (cashbackMethod === 2) {
      const cashbackAmount = Number(card.program.cashbackAmount) || 0;

      const amountRequired = Number(card.program.cashbackAmountRequired) || 0;

      if (cashbackAmount <= 0 || amountRequired <= 0) {
        return 0;
      }

      return Number(
        (Math.floor(amountPaid / amountRequired) * cashbackAmount).toFixed(2),
      );
    }

    return 0;
  }, [card, isCashbackProgram, purchaseAmount, cashbackToRedeem, useCashback]);

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

  const giftCardBalanceCents = Math.max(
    0,
    Math.round(Number(giftCard?.currentBalance ?? 0) * 100),
  );
  const giftCardPurchaseCents = moneyToCents(giftCardPurchaseAmount) ?? 0;
  const giftCardAppliedCents = moneyToCents(giftCardAmount) ?? 0;
  const giftCardMaximumCents = Math.min(
    giftCardPurchaseCents,
    giftCardBalanceCents,
  );
  const giftCardPendingCents = Math.max(
    giftCardPurchaseCents - giftCardAppliedCents,
    0,
  );
  const giftCardNewBalanceCents = Math.max(
    giftCardBalanceCents - giftCardAppliedCents,
    0,
  );
  const complementaryPaymentRequired = giftCardPendingCents > 0;
  const complementaryPaymentIsValid =
    !complementaryPaymentRequired ||
    (complementaryPaymentConfirmed &&
      [1, 2, 3].includes(complementaryPaymentMethod) &&
      (complementaryPaymentMethod === 1 ||
        complementaryPaymentReference.trim().length > 0));
  const giftCardAmountsAreValid =
    giftCardPurchaseCents > 0 &&
    giftCardAppliedCents > 0 &&
    giftCardAppliedCents <= giftCardPurchaseCents &&
    giftCardAppliedCents <= giftCardBalanceCents;
  const giftCardRedeemedCents = Math.round(
    Number(
      giftCardRedemption?.amount ??
        Number(giftCardRedemption?.balanceBefore ?? 0) -
          Number(giftCardRedemption?.balanceAfter ?? 0),
    ) * 100,
  );
  const giftCardRedemptionRemainingCents = Math.round(
    Number(
      giftCardRedemption?.remainingToPay ??
        Math.max(
          Number(giftCardRedemption?.purchaseAmount ?? 0) -
            giftCardRedeemedCents / 100,
          0,
        ),
    ) * 100,
  );

  function updateGiftCardPurchaseAmount(value: string) {
    setComplementaryPaymentAttempt(null);
    setComplementaryPaymentConfirmed(false);
    setComplementaryPaymentMethod(1);
    setComplementaryPaymentReference("");
    setGiftCardPurchaseAmount(value);
    const purchaseCents = moneyToCents(value);
    setGiftCardAmount(
      purchaseCents && purchaseCents > 0
        ? centsToInput(Math.min(purchaseCents, giftCardBalanceCents))
        : "",
    );
  }

  function updateGiftCardAppliedAmount(value: string) {
    setComplementaryPaymentAttempt(null);
    setComplementaryPaymentConfirmed(false);
    setComplementaryPaymentMethod(1);
    setComplementaryPaymentReference("");
    const cents = moneyToCents(value);
    if (cents !== null && cents > giftCardMaximumCents) {
      setGiftCardAmount(centsToInput(giftCardMaximumCents));
      return;
    }
    setGiftCardAmount(value);
  }

  const lookupCard = useCallback(
    async (rawValue: string) => {
      const cleanToken = rawValue.trim();

      if (!cleanToken || loading || card || giftCard || membership) return;
      if (!activeLocation.locationId) {
        toast.error("Selecciona una sucursal antes de escanear.");
        return;
      }

      setLoading(true);
      setQrToken(cleanToken);

      try {
        if (subscriptionsEnabled) {
          const membershipResponse = await fetch(
            "/api/subscription-memberships/lookup",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ qrToken: cleanToken }),
            },
          );
          const membershipPayload =
            (await membershipResponse.json().catch(() => ({}))) as SubscriptionEnvelope<MembershipLookup>;
          if (membershipResponse.ok && membershipPayload.data) {
            setMembership(membershipPayload.data);
            setCameraEnabled(false);
            setManualMode(false);
            return;
          }
          if (membershipResponse.status !== 404) {
            throw new Error(
              operationalErrorMessage(
                membershipPayload,
                "No fue posible consultar la suscripción.",
              ),
            );
          }
        }

        const giftResponse = await fetch("/api/gift-cards/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrToken: cleanToken }),
        });

        const giftPayload = await giftResponse.json().catch(() => ({}));

        if (giftResponse.ok) {
          const result = (giftPayload.data ??
            giftPayload) as GiftCardInformation;
          setGiftCard(result);
          setGiftCardPurchaseAmount("");
          setGiftCardAmount("");
          void loadGiftCardMovements(result.id);
          void loadGiftCardShare(result.id);
          setCameraEnabled(false);
          setManualMode(false);
          return;
        }

        if (giftResponse.status !== 404) {
          throw new Error(
            giftPayload.message ?? "No fue posible consultar la Gift Card.",
          );
        }

        const response = await fetch("/api/wallet/cards/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrToken: cleanToken }),
        });

        const payload = (await response.json()) as ApiPayload;

        if (!response.ok || !payload.data) {
          throw new Error(
            operationalErrorMessage(payload, "No encontramos la tarjeta."),
          );
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
    [
      card,
      giftCard,
      membership,
      loadGiftCardMovements,
      loadGiftCardShare,
      loading,
      activeLocation.locationId,
    ],
  );

  async function redeemGiftCard() {
    if (!giftCard || redeemingGiftCard) return;

    const purchaseCents = moneyToCents(giftCardPurchaseAmount);
    const amountCents = moneyToCents(giftCardAmount);
    const balanceCents = Math.round(giftCard.currentBalance * 100);

    if (!purchaseCents || purchaseCents <= 0) {
      toast.error("Ingresa el importe total de la compra.");
      return;
    }

    if (
      !amountCents ||
      amountCents <= 0 ||
      amountCents > purchaseCents ||
      amountCents > balanceCents
    ) {
      toast.error(
        "El saldo a utilizar no puede superar la compra ni el saldo disponible.",
      );
      return;
    }

    if (!giftCardContractVerified || movementsError) {
      toast.error("Canje bloqueado", {
        description:
          movementsError ||
          "No se ha verificado el contrato PurchaseAmount del backend.",
      });
      return;
    }

    const amount = amountCents / 100;
    let complementaryPayment = complementaryPaymentAttempt;

    if (complementaryPaymentRequired && !complementaryPayment) {
      if (!complementaryPaymentIsValid) {
        toast.error(
          "Confirma el cobro complementario y completa su método de pago.",
        );
        return;
      }
      complementaryPayment = {
        confirmed: true,
        method: complementaryPaymentMethod,
        reference: complementaryPaymentReference.trim() || null,
      };
      setComplementaryPaymentAttempt(complementaryPayment);
    }

    setRedeemingGiftCard(true);
    try {
      const storageKey = `fidara_gift_redeem_${giftCard.id ?? "scanned"}`;
      let idempotencyKey = sessionStorage.getItem(storageKey);
      if (!idempotencyKey) {
        idempotencyKey = `redeem-${crypto.randomUUID()}`;
        sessionStorage.setItem(storageKey, idempotencyKey);
      }

      const redeemRequest: GiftCardRedeemRequest = {
        qrToken,
        purchaseAmount: purchaseCents / 100,
        amount,
        idempotencyKey,
        reference: giftCardReference.trim() || null,
        notes: null,
        ...(complementaryPaymentRequired && complementaryPayment
          ? {
              complementaryPaymentConfirmed: complementaryPayment.confirmed,
              complementaryPaymentMethod: complementaryPayment.method,
              complementaryPaymentReference: complementaryPayment.reference,
            }
          : {}),
      };

      const response = await fetch("/api/gift-cards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(redeemRequest),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          operationalErrorMessage(payload, "No fue posible confirmar el canje."),
        );
      }

      const result = (payload.data ?? payload) as GiftCardRedeemResult;
      setGiftCardRedemption(result);
      setGiftCardRedemptionPurchaseCents(
        Math.round(Number(result.purchaseAmount ?? purchaseCents / 100) * 100),
      );
      setGiftCard((current) =>
        current
          ? {
              ...current,
              currentBalance: result.balanceAfter ?? current.currentBalance,
            }
          : current,
      );
      void loadGiftCardMovements(giftCard.id);
      setGiftCardAmount("");
      setGiftCardDialogOpen(false);
      sessionStorage.removeItem(storageKey);
      setComplementaryPaymentAttempt(null);

      const walletPending = result.warnings?.some((warning) =>
        warning.includes("WALLET_UPDATE_PENDING"),
      );
      toast.success(result.replayed ? "Canje recuperado" : "Canje confirmado", {
        description: walletPending
          ? "El saldo se descontó. La sincronización con Wallet continúa pendiente."
          : `Saldo restante: ${formatMoney(result.balanceAfter)}`,
      });
    } catch (caught) {
      toast.error("El canje no se pudo confirmar", {
        description: getErrorMessage(
          caught,
          "Reintenta la misma operación; no se generará una clave nueva.",
        ),
      });
    } finally {
      setRedeemingGiftCard(false);
    }
  }

  async function submitManualToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await lookupCard(qrToken);
  }

  async function registerCashbackSale() {
    if (!card || !isCashbackProgram || addingStamp) {
      return;
    }

    const grossPurchaseAmount = Number(purchaseAmount);

    const cashbackAmount =
      useCashback && cashbackToRedeem.trim() !== ""
        ? Number(cashbackToRedeem)
        : 0;

    if (!Number.isFinite(grossPurchaseAmount) || grossPurchaseAmount <= 0) {
      toast.error("Total de compra inválido", {
        description: "Ingresa un importe mayor a cero.",
      });

      return;
    }

    if (!Number.isFinite(cashbackAmount) || cashbackAmount < 0) {
      toast.error("Cashback inválido", {
        description: "El cashback no puede ser negativo.",
      });

      return;
    }

    const maximumCashback = Math.min(Number(card.balance), grossPurchaseAmount);

    if (cashbackAmount > maximumCashback) {
      toast.error("El cashback ingresado no es válido.", {
        description: `Puedes utilizar hasta ${formatMoney(
          maximumCashback,
        )} en esta compra.`,
      });

      return;
    }

    if (cashbackAmount > 0 && !card.cashbackAvailable) {
      toast.error("Cashback todavía no disponible", {
        description: `El cliente necesita alcanzar el mínimo de ${formatMoney(
          card.minimumCashbackRedemption ??
            card.program.minimumCashbackRedemption ??
            0,
        )}.`,
      });

      return;
    }

    setAddingStamp(true);

    try {
      const response = await fetch("/api/wallet/cards/cashback-sale", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          qrToken,

          grossPurchaseAmount,

          cashbackAmount,

          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const payload = (await response.json()) as ApiPayload;

      if (!response.ok) {
        throw new Error(
          operationalErrorMessage(payload, "No fue posible registrar la compra."),
        );
      }

      const cashbackRedeemed = Number(
        payload.cashbackRedeemed ?? cashbackAmount,
      );

      const cashbackEarned = Number(
        payload.cashbackEarned ?? estimatedCashback,
      );

      const amountPaid = Number(
        payload.purchaseAmount ?? grossPurchaseAmount - cashbackRedeemed,
      );

      const newBalance = Number(
        payload.balance ?? card.balance - cashbackRedeemed + cashbackEarned,
      );

      setCard((current) =>
        current
          ? {
              ...current,

              balance: newBalance,

              cashbackBalance: newBalance,

              cashbackAvailable: Boolean(
                payload.cashbackAvailable ??
                (newBalance > 0 &&
                  newBalance >=
                    Number(
                      current.minimumCashbackRedemption ??
                        current.program.minimumCashbackRedemption ??
                        0,
                    )),
              ),

              totalSpent: Number(
                payload.totalSpent ?? (current.totalSpent ?? 0) + amountPaid,
              ),

              purchaseCount: Number(
                payload.purchaseCount ?? (current.purchaseCount ?? 0) + 1,
              ),

              lifetimeEarned:
                Number(current.lifetimeEarned ?? current.balance) +
                cashbackEarned,

              lifetimeRedeemed:
                Number(current.lifetimeRedeemed ?? 0) + cashbackRedeemed,

              transactionCount:
                Number(current.transactionCount ?? 0) +
                (cashbackRedeemed > 0 ? 2 : 1),

              lastPurchaseAmount: amountPaid,

              lastGrossPurchaseAmount: grossPurchaseAmount,

              lastCashbackApplied: cashbackRedeemed,

              lastPurchaseAt: new Date().toISOString(),

              lastActivityAt: new Date().toISOString(),
            }
          : current,
      );

      setPurchaseAmount("");
      setCashbackToRedeem("");
      setUseCashback(false);

      toast.success("Compra registrada", {
        description:
          cashbackRedeemed > 0
            ? `${card.customer.name} utilizó ${formatMoney(
                cashbackRedeemed,
              )}, pagó ${formatMoney(amountPaid)} y obtuvo ${formatMoney(
                cashbackEarned,
              )} de cashback.`
            : `${card.customer.name} obtuvo ${formatMoney(
                cashbackEarned,
              )} de cashback.`,
      });
    } catch (caught) {
      toast.error("No se pudo registrar la compra", {
        description: getErrorMessage(caught, "Ocurrió un error inesperado."),
      });
    } finally {
      setAddingStamp(false);
    }
  }

  async function addStamp() {
    if (!card || addingStamp) return;

    const numericPurchaseAmount = Number(purchaseAmount);

    if (
      (isSpendPointsProgram || isCashbackProgram) &&
      (!Number.isFinite(numericPurchaseAmount) || numericPurchaseAmount <= 0)
    ) {
      toast.error("Total de compra inválido", {
        description: isCashbackProgram
          ? "Ingresa un importe mayor a cero para calcular el cashback."
          : "Ingresa un importe mayor a cero para calcular los puntos.",
      });

      return;
    }

    if (isCashbackProgram && estimatedCashback <= 0) {
      toast.error("La compra no genera cashback", {
        description:
          "El importe ingresado no cumple con la configuración del programa.",
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
          operationalErrorMessage(payload, "No fue posible registrar el progreso."),
        );
      }

      const earnedAmount = Number(
        payload.earnedAmount ??
          (isCashbackProgram
            ? estimatedCashback
            : isPointsProgram
              ? estimatedPoints
              : 1),
      );
      const newBalance = Number(payload.balance ?? card.balance + earnedAmount);
      const target = isCashbackProgram
        ? 0
        : Number(payload.target ?? card.target);

      setCard((current) =>
        current
          ? {
              ...current,
              balance: newBalance,
              target,
              remaining: isCashbackProgram
                ? 0
                : Math.max(target - newBalance, 0),

              rewardAvailable: isCashbackProgram
                ? false
                : Boolean(payload.rewardAvailable ?? newBalance >= target),

              cashbackAvailable: isCashbackProgram
                ? Boolean(
                    payload.cashbackAvailable ??
                    (newBalance > 0 &&
                      newBalance >=
                        Number(
                          current.minimumCashbackRedemption ??
                            current.program.minimumCashbackRedemption ??
                            0,
                        )),
                  )
                : current.cashbackAvailable,

              cashbackBalance: isCashbackProgram
                ? Number(payload.cashbackBalance ?? newBalance)
                : current.cashbackBalance,
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
        isCashbackProgram
          ? "Cashback agregado"
          : isVisitPointsProgram
            ? "Visita registrada"
            : isPointsProgram
              ? "Puntos agregados"
              : "Sello agregado",
        {
          description: isCashbackProgram
            ? `${card.customer.name} obtuvo ${formatMoney(
                earnedAmount,
              )} de cashback y ahora tiene ${formatMoney(newBalance)}.`
            : isPointsProgram
              ? `${card.customer.name} obtuvo ${earnedAmount} puntos y ahora tiene ${newBalance}.`
              : `${card.customer.name} ahora tiene ${newBalance} de ${target} sellos.`,
        },
      );
    } catch (caught) {
      toast.error(
        isCashbackProgram
          ? "No se pudo agregar el cashback"
          : isVisitPointsProgram
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

  async function redeemCoupon() {
    if (!card || !isCouponProgram || redeemingCoupon) return;

    if (!couponAvailable || couponExpired || couponRemainingUses <= 0) {
      toast.error("Cupón no disponible", {
        description: couponExpired
          ? "El cupón ya venció."
          : "El cupón ya no tiene usos disponibles.",
      });
      return;
    }

    if (couponRequiresPurchaseAmount && !couponHasValidPurchase) {
      toast.error("Total de compra inválido", {
        description: "Ingresa un importe mayor a cero.",
      });
      return;
    }

    if (!couponMeetsMinimum && couponMinimumPurchase > 0) {
      toast.error("No alcanza la compra mínima", {
        description: `Este cupón requiere una compra mínima de ${formatMoney(
          couponMinimumPurchase,
        )}.`,
      });
      return;
    }

    setRedeemingCoupon(true);

    try {
      const response = await fetch("/api/wallet/cards/coupons/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrToken,
          purchaseAmount: couponHasValidPurchase ? couponPurchaseAmount : null,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const payload = (await response.json()) as ApiPayload;

      if (!response.ok) {
        throw new Error(
          operationalErrorMessage(payload, "No fue posible canjear el cupón."),
        );
      }

      const discountAmount = Number(
        payload.discountApplied ?? payload.discountAmount ?? couponDiscount,
      );
      const amountToPay = Number(payload.amountToPay ?? couponAmountToPay);
      const remainingUses = Math.max(
        0,
        Number(
          payload.coupon?.remainingUses ??
            payload.remainingUses ??
            couponRemainingUses - 1,
        ),
      );

      setCard((current) =>
        current
          ? {
              ...current,
              couponAvailable: Boolean(
                payload.couponAvailable ?? remainingUses > 0,
              ),
              couponRemainingUses: remainingUses,
              couponUsedCount:
                Number(current.couponUsedCount ?? couponUsedCount) + 1,
              coupon: current.coupon
                ? {
                    ...current.coupon,
                    status:
                      payload.coupon?.status ??
                      payload.couponStatus ??
                      (remainingUses > 0 ? current.coupon.status : 2),
                    statusName: remainingUses > 0 ? "Available" : "Redeemed",
                    timesRedeemed: Number(
                      payload.coupon?.timesRedeemed ??
                        Number(current.coupon.timesRedeemed ?? 0) + 1,
                    ),
                    remainingUses,
                  }
                : current.coupon,
              totalSpent: Number(
                payload.totalSpent ?? (current.totalSpent ?? 0) + amountToPay,
              ),
              purchaseCount: Number(
                payload.purchaseCount ?? (current.purchaseCount ?? 0) + 1,
              ),
              lifetimeRedeemed: Number(current.lifetimeRedeemed ?? 0) + 1,
              transactionCount: Number(current.transactionCount ?? 0) + 1,
              lastPurchaseAmount: amountToPay,
              lastGrossPurchaseAmount: couponHasValidPurchase
                ? couponPurchaseAmount
                : current.lastGrossPurchaseAmount,
              lastPurchaseAt: new Date().toISOString(),
              lastActivityAt: new Date().toISOString(),
            }
          : current,
      );

      setCouponDialogOpen(false);
      setPurchaseAmount("");

      toast.success("Cupón canjeado", {
        description:
          couponBenefitType === 1 || couponBenefitType === 2
            ? `${card.customer.name} recibió ${formatMoney(
                discountAmount,
              )} de descuento y paga ${formatMoney(amountToPay)}.`
            : `${couponBenefitText} aplicado a ${card.customer.name}.`,
      });
    } catch (caught) {
      toast.error("No se pudo canjear el cupón", {
        description: getErrorMessage(
          caught,
          "Ocurrió un error inesperado al registrar el canje.",
        ),
      });
    } finally {
      setRedeemingCoupon(false);
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
          operationalErrorMessage(payload, "No fue posible canjear la recompensa."),
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
    setGiftCard(null);
    setMembership(null);
    setGiftCardPurchaseAmount("");
    setGiftCardAmount("");
    setGiftCardReference("");
    setComplementaryPaymentConfirmed(false);
    setComplementaryPaymentMethod(1);
    setComplementaryPaymentReference("");
    setComplementaryPaymentAttempt(null);
    setGiftCardDialogOpen(false);
    setGiftCardRedemption(null);
    setGiftCardRedemptionPurchaseCents(null);
    setGiftCardMovements([]);
    setMovementsError("");
    setGiftCardContractVerified(false);
    setGiftCardShare(null);
    setQrToken("");
    setPurchaseAmount("");
    setCashbackToRedeem("");
    setUseCashback(false);
    setCouponDialogOpen(false);
    setCameraEnabled(true);
    setManualMode(false);
  }

  return (
    <main
      className={`mx-auto min-h-full w-full max-w-[1652px] px-[clamp(20px,3vw,46px)] text-black ${
        card || giftCard || membership ? "pb-6 pt-4" : "pb-8 pt-5"
      }`}
    >
      {!card && !giftCard && !membership && (
        <section className="mx-auto mb-4 max-w-[640px] text-center">
          <h1 className="mt-2 text-[clamp(32px,4vw,46px)] font-extrabold leading-none tracking-[-0.045em] text-black">
            Escanear tarjeta
          </h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Centra el QR en la cámara o ingresa el código manualmente.
          </p>
          <div
            className={`mx-auto mt-3 inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
              activeLocation.location
                ? "bg-rose-50 text-[#E11D48]"
                : "bg-amber-50 text-amber-800"
            }`}
            role="status"
          >
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">
              {activeLocation.location
                ? `Sucursal: ${activeLocation.location.name}`
                : "Sin sucursal validada"}
            </span>
          </div>
        </section>
      )}

      {!card && !giftCard && !membership && (
        <section
          className="mx-auto w-full max-w-[640px]"
          aria-label="Escáner de códigos QR"
        >
          {cameraEnabled && (
            <div className="flex flex-col items-center">
              <div className="relative aspect-square w-full max-w-[620px] overflow-hidden rounded-[24px] bg-black shadow-[0_18px_45px_rgba(17,24,39,0.14)] sm:aspect-[4/3] [&_video]:h-full [&_video]:w-full [&_video]:object-cover">
                <Scanner
                  paused={loading || !activeLocation.locationId}
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
                >
                  <div
                    className="pointer-events-none absolute inset-0 z-10 grid place-items-center"
                    aria-hidden="true"
                  >
                    <div className="relative aspect-square w-[70%] rounded-lg border-2 border-dashed border-white/35">
                      <span className="absolute left-0 top-0 size-[15%] rounded-tl-lg border-l-4 border-t-4 border-[#E11D48]" />
                      <span className="absolute right-0 top-0 size-[15%] rounded-tr-lg border-r-4 border-t-4 border-[#E11D48]" />
                      <span className="absolute bottom-0 left-0 size-[15%] rounded-bl-lg border-b-4 border-l-4 border-[#E11D48]" />
                      <span className="absolute bottom-0 right-0 size-[15%] rounded-br-lg border-b-4 border-r-4 border-[#E11D48]" />
                    </div>
                  </div>
                </Scanner>
                {loading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90 font-bold text-black backdrop-blur-sm">
                    <LoaderCircle className="size-8 animate-spin text-[#e11d48]" />
                    Consultando tarjeta…
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                className="mt-3 min-h-12 px-4 font-bold text-slate-600"
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
              className="mx-auto flex w-full max-w-[520px] flex-col rounded-[22px] border border-[#e5e7eb] bg-white px-5 py-6 shadow-[0_18px_45px_rgba(17,24,39,0.06)] sm:px-7 sm:py-7"
              onSubmit={submitManualToken}
            >
              <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-black">
                Introduce el código
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Pega el token contenido en el QR de la tarjeta.
              </p>
              <Label htmlFor="qrToken" className="mt-5 font-bold text-black">
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
                className="mt-4 h-12 w-full rounded-[14px] bg-[#e11d48] font-extrabold text-white shadow-[0_12px_26px_rgba(225,29,72,0.22)] hover:bg-[#be123c]"
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
        </section>
      )}

      {membership && (
        <SubscriptionScanPanel
          membership={membership}
          qrToken={qrToken}
          onReset={resetScanner}
        />
      )}

      {giftCard && (
        <div>
          <Card className="overflow-hidden rounded-[22px] border-[#e5e7eb] bg-white shadow-[0_18px_45px_rgba(17,24,39,0.06)]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-[#fff1f4] text-[#e11d48]">
                  <Gift size={24} />
                </span>
                <div className="min-w-0">
                  <small className="font-extrabold uppercase tracking-[0.13em] text-[#e11d48]">
                    Gift Card encontrada
                  </small>
                  <h2 className="truncate text-xl font-extrabold tracking-[-0.035em] text-black sm:text-2xl">
                    {giftCard.recipientName ?? "Destinatario"}
                  </h2>
                  <p className="truncate text-sm text-slate-500">
                    {giftCard.programName ?? "Tarjeta de regalo"}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="min-h-12 shrink-0 px-3 font-bold text-slate-600"
                onClick={resetScanner}
              >
                <QrCode className="mr-2 size-4" />
                Escanear otra
              </Button>
            </div>

            <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)] lg:items-start">
              <div className="rounded-[20px] bg-[#111827] p-5 text-white sm:p-6 lg:sticky lg:top-4">
                <small className="font-extrabold uppercase tracking-[0.14em] text-rose-300">
                  Saldo disponible
                </small>
                <strong className="mt-1 block text-4xl font-extrabold tracking-[-0.045em]">
                  {formatMoney(giftCard.currentBalance)}
                </strong>
                <div className="mt-6 grid gap-3 border-t border-white/15 pt-5 sm:grid-cols-3">
                  <div>
                    <small className="text-slate-400">Importe original</small>
                    <strong className="block">
                      {formatMoney(giftCard.purchasedAmount)}
                    </strong>
                  </div>
                  <div>
                    <small className="text-slate-400">Estado</small>
                    <strong className="block">
                      {{
                        1: "Pago pendiente",
                        2: "Activa",
                        3: "Agotada",
                        4: "Vencida",
                        5: "Cancelada",
                      }[giftCard.status ?? 0] ?? "No disponible"}
                    </strong>
                  </div>
                  <div>
                    <small className="text-slate-400">Vencimiento</small>
                    <strong className="block">
                      {giftCard.expiresAtUtc
                        ? formatDate(giftCard.expiresAtUtc)
                        : "Sin vencimiento"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="min-w-0">
                <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label
                    htmlFor="gift-card-purchase-amount"
                    className="font-bold"
                  >
                    Importe total de la compra
                  </Label>
                  <Input
                    id="gift-card-purchase-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    className="mt-2 h-12 rounded-xl"
                    value={giftCardPurchaseAmount}
                    onChange={(event) =>
                      updateGiftCardPurchaseAmount(event.target.value)
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="gift-card-amount" className="font-bold">
                    Saldo Gift Card a utilizar
                  </Label>
                  <Input
                    id="gift-card-amount"
                    type="number"
                    min="0.01"
                    max={centsToInput(giftCardMaximumCents)}
                    step="0.01"
                    inputMode="decimal"
                    className="mt-2 h-12 rounded-xl"
                    value={giftCardAmount}
                    onChange={(event) =>
                      updateGiftCardAppliedAmount(event.target.value)
                    }
                    placeholder="0.00"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-1 h-8 px-0 text-sm font-bold text-[#e11d48]"
                    disabled={giftCardMaximumCents <= 0}
                    onClick={() =>
                      updateGiftCardAppliedAmount(
                        centsToInput(giftCardMaximumCents),
                      )
                    }
                  >
                    Aplicar máximo disponible
                  </Button>
                </div>
                <div>
                  <Label htmlFor="gift-card-reference" className="font-bold">
                    Referencia opcional
                  </Label>
                  <Input
                    id="gift-card-reference"
                    className="mt-2 h-12 rounded-xl"
                    maxLength={100}
                    value={giftCardReference}
                    onChange={(event) =>
                      setGiftCardReference(event.target.value)
                    }
                    placeholder="Ej. ticket-123"
                  />
                </div>
              </div>

              <div
                className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2"
                aria-live="polite"
              >
                <div>
                  <small className="font-bold text-slate-500">
                    Total de compra
                  </small>
                  <strong className="block text-lg">
                    {formatMoney(giftCardPurchaseCents / 100)}
                  </strong>
                </div>
                <div>
                  <small className="font-bold text-slate-500">
                    Descuento desde Gift Card
                  </small>
                  <strong className="block text-lg text-[#e11d48]">
                    −{formatMoney(giftCardAppliedCents / 100)}
                  </strong>
                </div>
                <div>
                  <small className="font-bold text-slate-500">
                    Pendiente de cobrar
                  </small>
                  <strong className="block text-lg">
                    {formatMoney(giftCardPendingCents / 100)}
                  </strong>
                </div>
                <div>
                  <small className="font-bold text-slate-500">
                    Nuevo saldo Gift Card
                  </small>
                  <strong className="block text-lg">
                    {formatMoney(giftCardNewBalanceCents / 100)}
                  </strong>
                </div>
              </div>

              {movementsLoading && (
                <div
                  className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700"
                  role="status"
                >
                  Verificando contrato e historial antes de habilitar el canje…
                </div>
              )}
              {movementsError && (
                <div
                  className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-950"
                  role="alert"
                >
                  {movementsError}
                </div>
              )}

              <label className="mt-4 grid max-w-sm gap-2 text-sm font-bold">
                Sucursal activa
                <select
                  className="h-12 rounded-xl border border-slate-300 bg-white px-3"
                  value={activeLocation.locationId}
                  disabled={
                    activeLocation.changing ||
                    activeLocation.locations.length < 2
                  }
                  onChange={(event) =>
                    void activeLocation.selectLocation(event.target.value)
                  }
                >
                  <option value="">Selecciona una sucursal</option>
                  {activeLocation.locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="button"
                className="mt-4 h-12 w-full rounded-[14px] bg-[#e11d48] px-6 font-extrabold text-white shadow-[0_12px_26px_rgba(225,29,72,0.22)] hover:bg-[#be123c]"
                disabled={
                  redeemingGiftCard ||
                  giftCard.status !== 2 ||
                  giftCard.currentBalance <= 0 ||
                  !activeLocation.locationId ||
                  !giftCardAmountsAreValid ||
                  !giftCardContractVerified ||
                  movementsLoading ||
                  Boolean(movementsError)
                }
                onClick={() => {
                  if (!giftCardAmountsAreValid) {
                    toast.error(
                      "Revisa el total de compra y el saldo a utilizar.",
                    );
                    return;
                  }
                  setGiftCardDialogOpen(true);
                }}
              >
                <Banknote className="mr-2 size-5" /> Confirmar canje
              </Button>

              {giftCardRedemption && (
                <div
                  className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950"
                  role="status"
                >
                  <strong className="flex items-center gap-2">
                    <Check size={18} /> Canje confirmado
                  </strong>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    <span>
                      Utilizado{" "}
                      <b>{formatMoney(giftCardRedeemedCents / 100)}</b>
                    </span>
                    <span>
                      Saldo anterior{" "}
                      <b>{formatMoney(giftCardRedemption.balanceBefore)}</b>
                    </span>
                    <span>
                      Saldo restante{" "}
                      <b>{formatMoney(giftCardRedemption.balanceAfter)}</b>
                    </span>
                    <span>
                      Compra total{" "}
                      <b>
                        {formatMoney(
                          (giftCardRedemptionPurchaseCents ?? 0) / 100,
                        )}
                      </b>
                    </span>
                    <span>
                      Diferencia{" "}
                      <b>
                        {formatMoney(giftCardRedemptionRemainingCents / 100)}
                      </b>
                    </span>
                    <span>
                      Operación{" "}
                      <b className="break-all">
                        {giftCardRedemption.operationId ?? "Confirmada"}
                      </b>
                    </span>
                  </div>
                  {complementaryPaymentSummary(giftCardRedemption) && (
                    <p className="mt-3 text-sm font-bold">
                      {complementaryPaymentSummary(giftCardRedemption)}
                    </p>
                  )}
                </div>
              )}
              <div className="mt-6 border-t border-slate-200 pt-5">
                <h3 className="font-extrabold">Historial</h3>
                {movementsLoading ? (
                  <LoaderCircle className="mt-3 animate-spin text-rose-600" />
                ) : movementsError ? (
                  <div
                    className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-950"
                    role="alert"
                  >
                    {movementsError}
                  </div>
                ) : giftCardMovements.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">
                    Aún no hay movimientos disponibles.
                  </p>
                ) : (
                  <div className="mt-3 grid max-h-[360px] gap-2 overflow-y-auto overscroll-contain pr-1">
                    {giftCardMovements.map((movement, index) => {
                      const movementPurchaseCents = Math.round(
                        Number(movement.purchaseAmount ?? 0) * 100,
                      );
                      const movementAmountCents = Math.round(
                        Number(movement.amount ?? 0) * 100,
                      );
                      const paymentSummary =
                        complementaryPaymentSummary(movement);
                      return (
                        <div
                          key={movement.operationId ?? index}
                          className="flex flex-wrap justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm"
                        >
                          <div>
                            <strong>
                              {movement.movementType === 1
                                ? "Venta"
                                : movement.movementType === 2
                                  ? "Canje"
                                  : "Movimiento"}
                            </strong>
                            <p className="text-slate-500">
                              {formatDate(movement.createdAtUtc)}
                              {movement.reference
                                ? ` · ${movement.reference}`
                                : ""}
                            </p>
                            {movement.purchaseAmount != null && (
                              <p className="text-slate-500">
                                Compra{" "}
                                {formatMoney(movementPurchaseCents / 100)} ·
                                Diferencia{" "}
                                {formatMoney(
                                  Math.max(
                                    movementPurchaseCents - movementAmountCents,
                                    0,
                                  ) / 100,
                                )}
                              </p>
                            )}
                            {paymentSummary && (
                              <p className="font-semibold text-slate-700">
                                {paymentSummary}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <strong>{formatMoney(movement.amount)}</strong>
                            <p className="text-slate-500">
                              Saldo {formatMoney(movement.balanceAfter)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      <FidaraConfirmDialog
        open={giftCardDialogOpen}
        onOpenChange={setGiftCardDialogOpen}
        title="Confirmar canje de Gift Card"
        description={
          complementaryPaymentRequired
            ? "Confirma el canje únicamente después de recibir la diferencia indicada. El servidor registrará el cobro complementario en el mismo movimiento."
            : "Verifica los importes antes de descontar el saldo de la Gift Card."
        }
        confirmLabel="Sí, descontar saldo"
        busyLabel="Canjeando…"
        busy={redeemingGiftCard}
        confirmDisabled={
          !giftCardContractVerified ||
          Boolean(movementsError) ||
          !complementaryPaymentIsValid
        }
        onConfirm={() => void redeemGiftCard()}
      >
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
          <div>
            <small className="font-bold text-slate-500">
              Importe total de compra
            </small>
            <strong className="block text-lg">
              {formatMoney(giftCardPurchaseCents / 100)}
            </strong>
          </div>
          <div>
            <small className="font-bold text-slate-500">
              Saldo Gift Card a utilizar
            </small>
            <strong className="block text-lg text-[#E11D48]">
              {formatMoney(giftCardAppliedCents / 100)}
            </strong>
          </div>
          <div>
            <small className="font-bold text-slate-500">
              Diferencia por cobrar
            </small>
            <strong className="block text-lg">
              {formatMoney(giftCardPendingCents / 100)}
            </strong>
          </div>
          <div>
            <small className="font-bold text-slate-500">Nuevo saldo</small>
            <strong className="block text-lg">
              {formatMoney(giftCardNewBalanceCents / 100)}
            </strong>
          </div>
        </div>
        {complementaryPaymentRequired && (
          <div className="mt-4 grid gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <label className="flex items-start gap-3 text-sm font-bold text-amber-950">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[#E11D48]"
                checked={complementaryPaymentConfirmed}
                disabled={
                  redeemingGiftCard || Boolean(complementaryPaymentAttempt)
                }
                onChange={(event) =>
                  setComplementaryPaymentConfirmed(event.target.checked)
                }
              />
              Confirmo que recibí {formatMoney(giftCardPendingCents / 100)} de
              pago complementario.
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#111827]">
              Método de pago
              <select
                className="h-12 rounded-xl border border-slate-300 bg-white px-3"
                value={complementaryPaymentMethod}
                disabled={
                  redeemingGiftCard || Boolean(complementaryPaymentAttempt)
                }
                onChange={(event) =>
                  setComplementaryPaymentMethod(Number(event.target.value))
                }
              >
                <option value={1}>Efectivo</option>
                <option value={2}>Tarjeta</option>
                <option value={3}>Transferencia</option>
              </select>
            </label>
            {(complementaryPaymentMethod === 2 ||
              complementaryPaymentMethod === 3) && (
              <label className="grid gap-2 text-sm font-bold text-[#111827]">
                Referencia del pago complementario
                <Input
                  maxLength={150}
                  value={complementaryPaymentReference}
                  disabled={
                    redeemingGiftCard || Boolean(complementaryPaymentAttempt)
                  }
                  onChange={(event) =>
                    setComplementaryPaymentReference(event.target.value)
                  }
                />
              </label>
            )}
          </div>
        )}
        {movementsError && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-950">
            {movementsError}
          </div>
        )}
      </FidaraConfirmDialog>

      {card && (
        <div className="space-y-4">
          <Card className="overflow-hidden rounded-[22px] border-[#e5e7eb] bg-white shadow-[0_18px_45px_rgba(17,24,39,0.06)]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
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
                <h2 className="truncate text-xl font-extrabold tracking-[-0.035em] text-black sm:text-2xl">
                  {card.customer.name}
                </h2>
                <p className="truncate text-sm text-slate-500">
                  {card.program.name} · {card.cardNumber}
                </p>
              </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="min-h-12 shrink-0 px-3 font-bold text-slate-600"
                onClick={resetScanner}
              >
                <QrCode className="mr-2 size-4" />
                Escanear otra
              </Button>
            </div>

            <div className="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)] lg:items-start">
              <div className="min-w-0 lg:sticky lg:top-4">
                {isCashbackProgram ? (
                <div className="relative overflow-hidden rounded-[20px] border border-[#E5E7EB] bg-white">
                  <div
                    className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-[#E11D48]/[0.07] blur-2xl"
                    aria-hidden="true"
                  />

                  <div className="relative p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-12 shrink-0 place-items-center rounded-[15px] bg-[#E11D48] text-white shadow-[0_10px_24px_rgba(225,29,72,0.22)]">
                          <Banknote size={23} />
                        </span>

                        <div>
                          <small className="font-extrabold uppercase tracking-[0.14em] text-[#E11D48]">
                            Saldo disponible
                          </small>

                          <strong className="mt-0.5 block text-3xl font-extrabold tracking-[-0.045em] text-black">
                            {formatMoney(card.balance)}
                          </strong>
                        </div>
                      </div>

                      <span className="rounded-full bg-black px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-white">
                        Cashback
                      </span>
                    </div>

                    <div className="mt-6 grid grid-cols-2 divide-x divide-[#E5E7EB] border-y border-[#E5E7EB] py-4">
                      <div className="pr-4">
                        <small className="font-bold uppercase tracking-[0.12em] text-[#6B7280]">
                          Acumulación
                        </small>

                        <strong className="mt-1 block text-sm font-extrabold text-black sm:text-base">
                          {card.program.cashbackEarningMethod === 1
                            ? `${
                                card.program.cashbackPercentage ?? 0
                              }% por compra`
                            : `${formatMoney(
                                card.program.cashbackAmount,
                              )} por cada ${formatMoney(
                                card.program.cashbackAmountRequired,
                              )}`}
                        </strong>
                      </div>

                      <div className="pl-4">
                        <small className="font-bold uppercase tracking-[0.12em] text-[#6B7280]">
                          Disponible desde
                        </small>

                        <strong className="mt-1 block text-sm font-extrabold text-black sm:text-base">
                          {formatMoney(cashbackMinimumToUse)}
                        </strong>
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between gap-4 text-xs">
                        <span className="font-bold text-[#6B7280]">
                          {card.cashbackAvailable
                            ? "Saldo listo para utilizar"
                            : "Progreso para utilizar cashback"}
                        </span>

                        <strong className="text-black">
                          {formatMoney(card.balance)}
                          {" / "}
                          {formatMoney(cashbackMinimumToUse)}
                        </strong>
                      </div>

                      <div
                        className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-[#F3F4F6]"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={cashbackMinimumToUse}
                        aria-valuenow={Math.min(
                          card.balance,
                          cashbackMinimumToUse,
                        )}
                      >
                        <span
                          className="block h-full rounded-full bg-[#E11D48] transition-[width] duration-300"
                          style={{
                            width: `${cashbackUnlockProgress}%`,
                          }}
                        />
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <span
                          className={`grid size-6 shrink-0 place-items-center rounded-full ${
                            card.cashbackAvailable
                              ? "bg-black text-white"
                              : "bg-[#F3F4F6] text-[#6B7280]"
                          }`}
                        >
                          {card.cashbackAvailable ? (
                            <Check size={14} />
                          ) : (
                            <Banknote size={13} />
                          )}
                        </span>

                        <p className="text-sm text-[#6B7280]">
                          {card.cashbackAvailable ? (
                            <>
                              El cliente puede aplicar su saldo en esta compra.
                            </>
                          ) : (
                            <>
                              Le faltan{" "}
                              <strong className="text-black">
                                {formatMoney(cashbackRemainingToUnlock)}
                              </strong>{" "}
                              para poder utilizarlo.
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : isCouponProgram ? (
                <div className="relative overflow-hidden rounded-[20px] border border-[#E5E7EB] bg-white">
                  <div
                    className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-[#E11D48]/[0.07] blur-2xl"
                    aria-hidden="true"
                  />

                  <div className="relative p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-12 shrink-0 place-items-center rounded-[15px] bg-[#E11D48] text-white shadow-[0_10px_24px_rgba(225,29,72,0.22)]">
                          <TicketPercent size={23} />
                        </span>

                        <div>
                          <small className="font-extrabold uppercase tracking-[0.14em] text-[#E11D48]">
                            Beneficio del cupón
                          </small>
                          <strong className="mt-0.5 block text-3xl font-extrabold tracking-[-0.045em] text-black">
                            {couponBenefitText}
                          </strong>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] ${
                          couponAvailable && !couponExpired
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {couponExpired
                          ? "Vencido"
                          : couponRemainingUses > 0
                            ? "Disponible"
                            : "Utilizado"}
                      </span>
                    </div>

                    <div className="mt-6 grid gap-4 border-y border-[#E5E7EB] py-4 sm:grid-cols-2">
                      <div>
                        <small className="font-bold uppercase tracking-[0.12em] text-[#6B7280]">
                          Compra mínima
                        </small>
                        <strong className="mt-1 block text-base font-extrabold text-black">
                          {couponMinimumPurchase > 0
                            ? formatMoney(couponMinimumPurchase)
                            : "Sin mínimo"}
                        </strong>
                      </div>

                      <div>
                        <small className="font-bold uppercase tracking-[0.12em] text-[#6B7280]">
                          Descuento máximo
                        </small>
                        <strong className="mt-1 block text-base font-extrabold text-black">
                          {couponBenefitType === 1 && couponMaximumDiscount > 0
                            ? formatMoney(couponMaximumDiscount)
                            : "Sin límite"}
                        </strong>
                      </div>

                      <div>
                        <small className="font-bold uppercase tracking-[0.12em] text-[#6B7280]">
                          Vencimiento
                        </small>
                        <strong className="mt-1 block text-base font-extrabold text-black">
                          {couponExpiresAt
                            ? formatDate(couponExpiresAt)
                            : "Sin vencimiento"}
                        </strong>
                      </div>

                      <div>
                        <small className="font-bold uppercase tracking-[0.12em] text-[#6B7280]">
                          Usos restantes
                        </small>
                        <strong className="mt-1 block text-base font-extrabold text-black">
                          {couponRemainingUses} de {couponUsageLimit}
                        </strong>
                      </div>
                    </div>

                    {card.program.couponTerms && (
                      <p className="mt-4 text-sm leading-6 text-slate-500">
                        <strong className="text-black">Condiciones:</strong>{" "}
                        {card.program.couponTerms}
                      </p>
                    )}
                  </div>
                </div>
              ) : isPointsProgram ? (
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
                        <strong className="block text-3xl font-extrabold tracking-[-0.04em] text-black">
                          {card.balance.toLocaleString("es-MX")}
                        </strong>
                      </div>
                    </div>

                    <div className="text-right">
                      <small className="font-bold uppercase tracking-[0.12em] text-slate-500">
                        Meta
                      </small>
                      <strong className="block text-xl font-extrabold text-black">
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
                        width: `${Math.min(
                          (card.balance / Math.max(card.target, 1)) * 100,
                          100,
                        )}%`,
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
                        : `${
                            card.program.pointsEarned ?? 0
                          } puntos por cada $${Number(
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
              {!isCashbackProgram &&
                !isCouponProgram &&
                card.rewardAvailable && (
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
              </div>
              <div className="min-w-0">
              {(!card.rewardAvailable ||
                isPointsProgram ||
                isCouponProgram) && (
                <div className="mt-5 lg:mt-0">
                  <Label
                    htmlFor="purchaseAmount"
                    className="font-bold text-black"
                  >
                    {isVisitPointsProgram
                      ? "Total de la compra (opcional)"
                      : "Total de la compra"}
                  </Label>
                  <div className="relative mt-2">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-extrabold text-black">
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
                    {isCouponProgram
                      ? !couponHasValidPurchase
                        ? couponRequiresPurchaseAmount
                          ? "Ingresa el total para validar el cupón."
                          : "El total es opcional para este beneficio."
                        : !couponMeetsMinimum
                          ? `Faltan ${formatMoney(
                              Math.max(
                                couponMinimumPurchase - couponPurchaseAmount,
                                0,
                              ),
                            )} para alcanzar la compra mínima.`
                          : `El cupón aplicará ${formatMoney(
                              couponDiscount,
                            )} de descuento.`
                      : isCashbackProgram
                        ? estimatedCashback > 0
                          ? `Esta compra generará ${formatMoney(
                              estimatedCashback,
                            )} de cashback.`
                          : "Ingresa el total de la compra para calcular el cashback."
                        : isVisitPointsProgram
                          ? "El total de la compra es opcional para registrar la visita."
                          : isSpendPointsProgram && estimatedPoints > 0
                            ? `Esta compra generará ${estimatedPoints} puntos.`
                            : "Se registrará en el historial de compras del cliente."}
                  </p>
                </div>
              )}
              {isCouponProgram && (
                <div className="mt-5 overflow-hidden rounded-[18px] border border-slate-200">
                  <div className="grid gap-4 bg-black p-4 text-white sm:grid-cols-3">
                    <div>
                      <small className="font-bold uppercase tracking-wider text-slate-400">
                        Compra
                      </small>
                      <strong className="mt-1 block text-lg">
                        {formatMoney(couponPurchaseAmount)}
                      </strong>
                    </div>

                    <div>
                      <small className="font-bold uppercase tracking-wider text-slate-400">
                        Descuento
                      </small>
                      <strong className="mt-1 block text-lg text-emerald-300">
                        -{formatMoney(couponDiscount)}
                      </strong>
                    </div>

                    <div>
                      <small className="font-bold uppercase tracking-wider text-slate-400">
                        Paga ahora
                      </small>
                      <strong className="mt-1 block text-lg">
                        {formatMoney(couponAmountToPay)}
                      </strong>
                    </div>
                  </div>

                  {!couponAvailable || couponExpired ? (
                    <div className="border-t border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                      {couponExpired
                        ? "Este cupón ya venció y no puede canjearse."
                        : "Este cupón ya no tiene usos disponibles."}
                    </div>
                  ) : !couponMeetsMinimum && couponMinimumPurchase > 0 ? (
                    <div className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                      La compra mínima para utilizarlo es de{" "}
                      {formatMoney(couponMinimumPurchase)}.
                    </div>
                  ) : null}
                </div>
              )}
              {isCashbackProgram && (
                <div className="mt-5 space-y-4">
                  <div
                    className={`overflow-hidden rounded-[18px] border bg-white transition-all ${
                      useCashback
                        ? "border-[#E11D48] ring-4 ring-rose-100"
                        : "border-slate-300"
                    }`}
                  >
                    {" "}
                    <div className="flex items-center justify-between gap-4 p-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#F3F4F6] text-[#E11D48]">
                          <Banknote size={20} />
                        </span>

                        <div>
                          <strong className="block text-sm text-black">
                            Aplicar saldo cashback
                          </strong>

                          <span className="text-xs text-slate-500">
                            {card.cashbackAvailable
                              ? `${formatMoney(card.balance)} disponibles`
                              : `Disponible al alcanzar ${formatMoney(
                                  card.minimumCashbackRedemption ??
                                    card.program.minimumCashbackRedemption ??
                                    0,
                                )}`}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={useCashback}
                        aria-label="Utilizar saldo cashback"
                        disabled={
                          !card.cashbackAvailable || Number(purchaseAmount) <= 0
                        }
                        onClick={() => {
                          const nextValue = !useCashback;

                          setUseCashback(nextValue);

                          if (!nextValue) {
                            setCashbackToRedeem("");
                          }
                        }}
                        className={`relative h-8 w-14 shrink-0 rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 ${
                          useCashback
                            ? "border-[#E11D48] bg-[#E11D48]"
                            : "border-slate-400 bg-slate-200 hover:bg-slate-300"
                        } disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:opacity-70`}
                      >
                        <span
                          aria-hidden="true"
                          className={`absolute inset-y-0 flex items-center text-[9px] font-black tracking-wide transition-all ${
                            useCashback
                              ? "left-2 text-white"
                              : "right-1.5 text-slate-600"
                          }`}
                        >
                          {useCashback ? "SÍ" : "NO"}
                        </span>

                        <span
                          aria-hidden="true"
                          className={`absolute left-1 top-1 grid size-6 place-items-center rounded-full bg-white text-[#E11D48] shadow-[0_2px_6px_rgba(15,23,42,0.28)] transition-transform ${
                            useCashback ? "translate-x-6" : "translate-x-0"
                          }`}
                        >
                          {useCashback && <Check size={14} strokeWidth={3} />}
                        </span>
                      </button>
                    </div>
                    {useCashback && (
                      <div className="border-t border-slate-200 bg-slate-50/70 p-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <Label
                            htmlFor="cashbackToRedeem"
                            className="font-bold text-black"
                          >
                            ¿Cuánto desea utilizar?
                          </Label>

                          <button
                            type="button"
                            onClick={() =>
                              setCashbackToRedeem(
                                Math.min(
                                  Number(card.balance),
                                  Number(purchaseAmount || 0),
                                ).toFixed(2),
                              )
                            }
                            className="text-xs font-extrabold text-[#E11D48] hover:underline"
                          >
                            Usar máximo
                          </button>
                        </div>

                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-extrabold text-black">
                            $
                          </span>

                          <Input
                            id="cashbackToRedeem"
                            type="number"
                            inputMode="decimal"
                            min="0.01"
                            step="0.01"
                            max={Math.min(
                              Number(card.balance),
                              Number(purchaseAmount || 0),
                            )}
                            value={cashbackToRedeem}
                            onChange={(event) =>
                              setCashbackToRedeem(event.target.value)
                            }
                            placeholder="0.00"
                            className={`h-14 rounded-[13px] bg-white pl-9 pr-16 text-lg font-bold ${
                              Number(cashbackToRedeem || 0) >
                              Math.min(
                                Number(card.balance),
                                Number(purchaseAmount || 0),
                              )
                                ? "border-red-400 focus-visible:ring-red-400"
                                : "border-slate-200 focus-visible:ring-[#E11D48]"
                            }`}
                          />

                          <small className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">
                            MXN
                          </small>
                        </div>

                        {Number(cashbackToRedeem || 0) >
                          Math.min(
                            Number(card.balance),
                            Number(purchaseAmount || 0),
                          ) && (
                          <p className="mt-2 text-xs font-semibold text-red-600">
                            Puedes utilizar como máximo{" "}
                            {formatMoney(
                              Math.min(
                                Number(card.balance),
                                Number(purchaseAmount || 0),
                              ),
                            )}
                            .
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="rounded-[18px] bg-black p-4 text-white">
                    <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
                      <div>
                        <small className="font-bold uppercase tracking-wider text-slate-400">
                          Compra
                        </small>

                        <strong className="mt-1 block text-lg">
                          {formatMoney(Number(purchaseAmount || 0))}
                        </strong>
                      </div>

                      <div>
                        <small className="font-bold uppercase tracking-wider text-slate-400">
                          Cashback
                        </small>

                        <strong className="mt-1 block text-lg text-emerald-300">
                          -
                          {formatMoney(
                            useCashback ? Number(cashbackToRedeem || 0) : 0,
                          )}
                        </strong>
                      </div>

                      <div>
                        <small className="font-bold uppercase tracking-wider text-slate-400">
                          Paga ahora
                        </small>

                        <strong className="mt-1 block text-lg">
                          {formatMoney(
                            Math.max(
                              Number(purchaseAmount || 0) -
                                (useCashback
                                  ? Number(cashbackToRedeem || 0)
                                  : 0),
                              0,
                            ),
                          )}
                        </strong>
                      </div>

                      <div>
                        <small className="font-bold uppercase tracking-wider text-slate-400">
                          Obtiene
                        </small>

                        <strong className="mt-1 block text-lg text-emerald-300">
                          +{formatMoney(estimatedCashback)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-3 [&>button]:min-h-12 [&>button]:w-full sm:[&>button]:w-auto">
                {!isCashbackProgram &&
                  !isCouponProgram &&
                  card.rewardAvailable && (
                    <Button
                      type="button"
                      className="h-11 rounded-xl bg-emerald-600 px-6 font-bold text-white hover:bg-emerald-700"
                      onClick={() => setRedeemDialogOpen(true)}
                    >
                      <Gift className="mr-2 size-5" />
                      Canjear recompensa
                    </Button>
                  )}

                {isCouponProgram && (
                  <Button
                    type="button"
                    className="h-11 rounded-[14px] bg-[#e11d48] px-6 font-extrabold text-white shadow-[0_12px_26px_rgba(225,29,72,0.22)] hover:bg-[#be123c]"
                    disabled={!couponCanRedeem || redeemingCoupon}
                    onClick={() => setCouponDialogOpen(true)}
                  >
                    {redeemingCoupon ? (
                      <LoaderCircle className="mr-2 size-5 animate-spin" />
                    ) : (
                      <TicketPercent className="mr-2 size-5" />
                    )}
                    {couponExpired
                      ? "Cupón vencido"
                      : couponRemainingUses <= 0
                        ? "Cupón utilizado"
                        : !couponMeetsMinimum && couponMinimumPurchase > 0
                          ? "No alcanza la compra mínima"
                          : "Canjear cupón"}
                  </Button>
                )}

                {!isCouponProgram &&
                  (!card.rewardAvailable || isPointsProgram) && (
                    <Button
                      type="button"
                      className="h-11 rounded-[14px] bg-[#e11d48] px-6 font-extrabold text-white shadow-[0_12px_26px_rgba(225,29,72,0.22)] hover:bg-[#be123c]"
                      disabled={
                        addingStamp ||
                        (isCashbackProgram &&
                          (!Number.isFinite(Number(purchaseAmount)) ||
                            Number(purchaseAmount) <= 0 ||
                            (useCashback &&
                              (Number(cashbackToRedeem || 0) <= 0 ||
                                Number(cashbackToRedeem || 0) >
                                  Math.min(
                                    Number(card.balance),
                                    Number(purchaseAmount || 0),
                                  ))))) ||
                        (isSpendPointsProgram && estimatedPoints <= 0) ||
                        (isVisitPointsProgram &&
                          Boolean(card.program.limitOneVisitPerDay) &&
                          Boolean(card.checkedInToday))
                      }
                      onClick={
                        isCashbackProgram ? registerCashbackSale : addStamp
                      }
                    >
                      {addingStamp ? (
                        <LoaderCircle className="mr-2 size-5 animate-spin" />
                      ) : isCashbackProgram ? (
                        <Banknote className="mr-2 size-5" />
                      ) : isPointsProgram ? (
                        <Coins className="mr-2 size-5" />
                      ) : (
                        <Stamp className="mr-2 size-5" />
                      )}
                      {addingStamp
                        ? isCashbackProgram
                          ? "Registrando compra…"
                          : isVisitPointsProgram
                            ? "Registrando visita…"
                            : isPointsProgram
                              ? "Agregando puntos…"
                              : "Agregando sello…"
                        : isCashbackProgram
                          ? Number(purchaseAmount) > 0
                            ? `Registrar compra · ${formatMoney(
                                Math.max(
                                  Number(purchaseAmount) -
                                    (useCashback
                                      ? Number(cashbackToRedeem || 0)
                                      : 0),
                                  0,
                                ),
                              )}`
                            : "Ingresa una compra válida"
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
            </div>
          </Card>

          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <Card className="rounded-[18px] border-[#e5e7eb] bg-white p-4 shadow-[0_10px_30px_rgba(17,24,39,0.045)] sm:p-5">
              <h3 className="text-lg font-extrabold tracking-[-0.025em] text-black">
                Información del cliente
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
              <h3 className="text-lg font-extrabold tracking-[-0.025em] text-black">
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
                    isCashbackProgram ? (
                      <Banknote size={18} />
                    ) : isCouponProgram ? (
                      <TicketPercent size={18} />
                    ) : isPointsProgram ? (
                      <Coins size={18} />
                    ) : (
                      <Stamp size={18} />
                    )
                  }
                  label={
                    isCashbackProgram
                      ? "Cashback acumulado"
                      : isCouponProgram
                        ? "Cupones utilizados"
                        : isPointsProgram
                          ? "Puntos históricos"
                          : "Sellos históricos"
                  }
                  value={
                    isCashbackProgram
                      ? formatMoney(card.lifetimeEarned ?? card.balance)
                      : isCouponProgram
                        ? String(couponUsedCount)
                        : String(card.lifetimeEarned ?? card.balance)
                  }
                />
                <Metric
                  icon={
                    isCashbackProgram ? (
                      <Banknote size={18} />
                    ) : isCouponProgram ? (
                      <TicketPercent size={18} />
                    ) : (
                      <Gift size={18} />
                    )
                  }
                  label={
                    isCashbackProgram
                      ? "Cashback utilizado"
                      : isCouponProgram
                        ? "Usos restantes"
                        : "Canjes"
                  }
                  value={
                    isCashbackProgram
                      ? formatMoney(card.lifetimeRedeemed)
                      : isCouponProgram
                        ? String(couponRemainingUses)
                        : String(card.lifetimeRedeemed ?? 0)
                  }
                />
              </div>
              <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">
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
            <span className="mb-2 grid size-12 place-items-center rounded-2xl bg-[#F3F4F6] text-[#E11D48]">
              <Gift size={24} />
            </span>
            <AlertDialogTitle className="text-2xl font-extrabold tracking-[-0.03em] text-black">
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
            <strong className="mt-1 block text-black">
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

      <AlertDialog
        open={couponDialogOpen}
        onOpenChange={(open) => {
          if (!redeemingCoupon) setCouponDialogOpen(open);
        }}
      >
        <AlertDialogContent className="rounded-[22px] border-[#e5e7eb]">
          <AlertDialogHeader>
            <span className="mb-2 grid size-12 place-items-center rounded-2xl bg-[#fff1f4] text-[#E11D48]">
              <TicketPercent size={24} />
            </span>
            <AlertDialogTitle className="text-2xl font-extrabold tracking-[-0.03em] text-black">
              ¿Confirmas el canje del cupón?
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              Confirma que aplicarás <strong>{couponBenefitText}</strong> a{" "}
              <strong>{card?.customer.name}</strong>. Esta acción consumirá un
              uso del cupón.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
            <div>
              <small className="font-bold uppercase tracking-wider text-slate-500">
                Compra
              </small>
              <strong className="mt-1 block text-black">
                {formatMoney(couponPurchaseAmount)}
              </strong>
            </div>
            <div>
              <small className="font-bold uppercase tracking-wider text-slate-500">
                Descuento
              </small>
              <strong className="mt-1 block text-emerald-700">
                -{formatMoney(couponDiscount)}
              </strong>
            </div>
            <div>
              <small className="font-bold uppercase tracking-wider text-slate-500">
                Paga ahora
              </small>
              <strong className="mt-1 block text-black">
                {formatMoney(couponAmountToPay)}
              </strong>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={redeemingCoupon}
              className="rounded-xl"
            >
              Cancelar
            </AlertDialogCancel>
            <Button
              type="button"
              className="rounded-xl bg-[#E11D48] font-bold text-white hover:bg-[#BE123C]"
              disabled={redeemingCoupon || !couponCanRedeem}
              onClick={redeemCoupon}
            >
              {redeemingCoupon ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : (
                <Check className="mr-2 size-4" />
              )}
              {redeemingCoupon ? "Canjeando…" : "Sí, aplicar cupón"}
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
        <strong className="block truncate text-sm text-black">{value}</strong>
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
      <strong className="mt-1 block truncate text-lg font-extrabold tracking-[-0.025em] text-black">
        {value}
      </strong>
    </div>
  );
}
