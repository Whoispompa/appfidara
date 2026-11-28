"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Apple,
  BadgePercent,
  ArrowDown,
  ArrowUp,
  Banknote,
  Check,
  Coins,
  CreditCard,
  Crown,
  Gift,
  ImageIcon,
  LoaderCircle,
  MapPin,
  Palette,
  Plus,
  Save,
  Search,
  Stamp,
  Ticket,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Copy, ExternalLink, FileDown } from "lucide-react";

import { QRCodeSVG } from "qrcode.react";

import { WalletCardPreview } from "@/components/dashboard/wallet-card-preview";
import { GiftCardSalePanel } from "@/components/gift-cards/gift-card-sale-panel";
import { SubscriptionProgramPanel } from "@/components/subscriptions/subscription-program-panel";
import {
  isValidSubscriptionProgramId,
  subscriptionsEnabled,
} from "@/lib/subscriptions";
import { toast } from "sonner";

function AndroidWalletIcon({ size = 19 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7.2 6.35 5.85 4.02a.55.55 0 0 1 .2-.75.55.55 0 0 1 .75.2l1.38 2.38A8.2 8.2 0 0 1 12 4.9c1.38 0 2.68.34 3.82.95l1.38-2.38a.55.55 0 1 1 .95.55L16.8 6.35A7.45 7.45 0 0 1 19.45 12H4.55A7.45 7.45 0 0 1 7.2 6.35ZM8.25 9.1a.85.85 0 1 0 0-1.7.85.85 0 0 0 0 1.7Zm7.5 0a.85.85 0 1 0 0-1.7.85.85 0 0 0 0 1.7ZM4.55 13.1h14.9v6.25c0 .91-.74 1.65-1.65 1.65h-1.15v1.35a1.1 1.1 0 0 1-2.2 0V21h-4.9v1.35a1.1 1.1 0 0 1-2.2 0V21H6.2c-.91 0-1.65-.74-1.65-1.65V13.1Z" />
    </svg>
  );
}

type RewardInformation = {
  id: string;
  name: string;
  description?: string | null;
  requiredValue: number;
  rewardType: number;
  rewardValue?: number | null;
};

type ProgramInformation = {
  id: string;
  organizationName?: string;
  organizationSlug?: string;
  name: string;
  description?: string | null;
  programType: number;
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
  giftCardAllowCustomAmount?: boolean;
  giftCardCustomMinAmount?: number | null;
  giftCardCustomMaxAmount?: number | null;
  giftCardExpirationEnabled?: boolean;
  giftCardValidityDays?: number | null;
  giftCardPresetAmounts?: GiftCardPreset[];
  isRecurring: boolean;
  cardLogoUrl?: string | null;
  activeStampImageUrl?: string | null;
  inactiveStampImageUrl?: string | null;
  cardBackgroundColor?: string | null;
  cardForegroundColor?: string | null;
  cardLabelColor?: string | null;
  cardStripImageUrl?: string | null;
  cardStripColor?: string | null;
  showPoweredByFidara: boolean;
  reward?: RewardInformation | null;
};

type ProgramLocationOption = {
  id: string;
  name: string;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
};

type ProgramLocationsData = {
  programId: string;
  participatingLocationIds: string[];
  availableLocations: ProgramLocationOption[];
};

type GiftCardPreset = {
  amount: number;
  isActive: boolean;
  displayOrder: number;
};

type ProgramForm = {
  programType: number;
  name: string;
  description: string;
  targetValue: string;
  pointsEarned: string;
  amountRequired: string;
  pointsEarningMethod: number;
  limitOneVisitPerDay: boolean;
  cashbackEarningMethod: number;
  cashbackPercentage: string;
  cashbackAmount: string;
  cashbackAmountRequired: string;
  minimumCashbackRedemption: string;
  couponBenefitType: number;
  couponBenefitValue: string;
  couponMinimumPurchase: string;
  couponMaximumDiscount: string;
  couponExpirationType: number;
  couponValidityDays: string;
  couponFixedExpirationAt: string;
  couponUsageLimit: string;
  couponTerms: string;
  giftCardAllowCustomAmount: boolean;
  giftCardCustomMinAmount: string;
  giftCardCustomMaxAmount: string;
  giftCardExpirationEnabled: boolean;
  giftCardValidityDays: string;
  giftCardPresetAmounts: GiftCardPreset[];
  isRecurring: boolean;
  cardBackgroundColor: string;
  cardForegroundColor: string;
  cardLabelColor: string;
  cardStripColor: string;
  stripDesignMode: "image" | "color";
  showPoweredByFidara: boolean;
  rewardName: string;
  rewardDescription: string;
  rewardType: number;
  rewardValue: string;
};

type ImageFiles = {
  logo: File | null;
  activeStamp: File | null;
  inactiveStamp: File | null;
  stripImage: File | null;
};

type ImagePreviews = {
  logo: string | null;
  activeStamp: string | null;
  inactiveStamp: string | null;
  stripImage: string | null;
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

function sameLocationIds(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const normalizedRight = new Set(right);
  return left.every((id) => normalizedRight.has(id));
}

function normalizeNumericInput(value: string) {
  if (value === "") {
    return "";
  }

  return value.replace(/^0+(?=\d)/, "");
}

const initialForm: ProgramForm = {
  programType: 1,
  name: "",
  description: "",
  targetValue: "10",
  pointsEarned: "1",
  amountRequired: "10",
  pointsEarningMethod: 1,
  limitOneVisitPerDay: false,
  cashbackEarningMethod: 1,
  cashbackPercentage: "5",
  cashbackAmount: "10",
  cashbackAmountRequired: "200",
  minimumCashbackRedemption: "50",
  couponBenefitType: 1,
  couponBenefitValue: "10",
  couponMinimumPurchase: "0",
  couponMaximumDiscount: "",
  couponExpirationType: 2,
  couponValidityDays: "30",
  couponFixedExpirationAt: "",
  couponUsageLimit: "1",
  couponTerms: "",
  giftCardAllowCustomAmount: true,
  giftCardCustomMinAmount: "100",
  giftCardCustomMaxAmount: "2000",
  giftCardExpirationEnabled: false,
  giftCardValidityDays: "365",
  giftCardPresetAmounts: [200, 500, 1000].map((amount, displayOrder) => ({
    amount,
    isActive: true,
    displayOrder,
  })),
  isRecurring: true,
  cardBackgroundColor: "#FFFFFF",
  cardForegroundColor: "#111827",
  cardLabelColor: "#111827",
  cardStripColor: "#FFFFFF",
  stripDesignMode: "color",
  showPoweredByFidara: true,
  rewardName: "",
  rewardDescription: "",
  rewardType: 1,
  rewardValue: "0",
};

const emptyProgram: ProgramInformation = {
  id: "",
  organizationName: "",

  organizationSlug: "",
  name: "",
  description: "",
  programType: 1,
  targetValue: 10,
  pointsEarned: null,
  amountRequired: null,
  pointsEarningMethod: 1,
  limitOneVisitPerDay: false,
  cashbackEarningMethod: 1,
  cashbackPercentage: 5,
  cashbackAmount: 10,
  cashbackAmountRequired: 200,
  minimumCashbackRedemption: 50,
  couponBenefitType: 1,
  couponBenefitValue: 10,
  couponMinimumPurchase: 0,
  couponMaximumDiscount: null,
  couponExpirationType: 2,
  couponValidityDays: 30,
  couponFixedExpirationAt: null,
  couponUsageLimit: 1,
  couponTerms: null,
  giftCardAllowCustomAmount: true,
  giftCardCustomMinAmount: 100,
  giftCardCustomMaxAmount: 2000,
  giftCardExpirationEnabled: false,
  giftCardValidityDays: null,
  giftCardPresetAmounts: [200, 500, 1000].map((amount, displayOrder) => ({
    amount,
    isActive: true,
    displayOrder,
  })),
  isRecurring: true,
  cardLogoUrl: null,
  activeStampImageUrl: null,
  inactiveStampImageUrl: null,
  cardBackgroundColor: "#FFFFFF",
  cardForegroundColor: "#111827",
  cardLabelColor: "#111827",
  cardStripImageUrl: null,
  cardStripColor: "#FFFFFF",
  showPoweredByFidara: true,

  reward: {
    id: "",
    name: "",
    description: "",
    requiredValue: 10,
    rewardType: 1,
    rewardValue: null,
  },
};

export default function CardEditorPage() {
  const router = useRouter();

  const params = useParams<{
    programId: string;
  }>();

  const [linkCopied, setLinkCopied] = useState(false);
  const [walletPreviewPlatform, setWalletPreviewPlatform] = useState<
    "apple" | "google"
  >("apple");

  const programId = params.programId;

  const isNewProgram = programId === "nueva" || programId === "new";

  const [programTypeSelected, setProgramTypeSelected] = useState(!isNewProgram);

  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const [program, setProgram] = useState<ProgramInformation | null>(null);

  const [form, setForm] = useState<ProgramForm>(initialForm);

  const [availableLocations, setAvailableLocations] = useState<ProgramLocationOption[]>([]);
  const [participatingLocationIds, setParticipatingLocationIds] = useState<string[]>([]);
  const [savedParticipatingLocationIds, setSavedParticipatingLocationIds] = useState<string[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(!isNewProgram);
  const [locationsError, setLocationsError] = useState("");
  const [locationSearch, setLocationSearch] = useState("");

  const [files, setFiles] = useState<ImageFiles>({
    logo: null,
    activeStamp: null,
    inactiveStamp: null,
    stripImage: null,
  });

  const [previews, setPreviews] = useState<ImagePreviews>({
    logo: null,
    activeStamp: null,
    inactiveStamp: null,
    stripImage: null,
  });

  const joinUrl =
    program?.programType !== 5 &&
    program?.programType !== 6 &&
    program?.id &&
    program.organizationSlug
      ? `https://get.fidara.mx/join/${program.organizationSlug}?programId=${program.id}`
      : "";

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const isStampProgram = form.programType === 1;
  const isPointsProgram = form.programType === 2;
  const isCashbackProgram = form.programType === 3;
  const isCouponProgram = form.programType === 4;
  const isGiftCardProgram = form.programType === 5;
  const isSubscriptionProgram = form.programType === 6;
  const programTypeLabel = isStampProgram
    ? "Sellos"
    : isPointsProgram
      ? "Puntos"
      : isCashbackProgram
        ? "Cashback"
        : isCouponProgram
          ? "Cupones"
          : isSubscriptionProgram
            ? "Suscripción"
            : "Tarjeta de regalo";
  const editorTitle = isNewProgram
    ? `Crear programa de ${programTypeLabel.toLocaleLowerCase("es-MX")}`
    : `Editar programa "${form.name.trim() || program?.name?.trim() || "Sin nombre"}"`;
  const savedSubscriptionProgramId = isValidSubscriptionProgramId(program?.id)
    ? program.id
    : !isNewProgram && isValidSubscriptionProgramId(programId)
      ? programId
      : null;

  const usesTraditionalReward = isStampProgram || isPointsProgram;

  const loadProgram = useCallback(async () => {
    setLoading(true);
    setError("");

    if (isNewProgram) {
      setProgram(emptyProgram);

      setForm(initialForm);

      setProgramTypeSelected(false);

      setShowTypeSelector(true);

      setFiles({
        logo: null,
        activeStamp: null,
        inactiveStamp: null,
        stripImage: null,
      });

      setPreviews({
        logo: null,
        activeStamp: null,
        inactiveStamp: null,
        stripImage: null,
      });

      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/programs/${programId}`, {
        cache: "no-store",
      });

      const payload = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload.message ?? "No fue posible cargar el programa.",
        );
      }

      const data: ProgramInformation = payload.data;

      setProgram(data);

      setProgramTypeSelected(true);

      setShowTypeSelector(false);

      setForm({
        programType: Number(data.programType) || 1,
        name: data.name,
        description: data.description ?? "",

        targetValue: String(data.targetValue ?? 10),

        pointsEarned: String(data.pointsEarned ?? 1),

        amountRequired: String(data.amountRequired ?? 10),

        pointsEarningMethod: Number(data.pointsEarningMethod ?? 1),

        limitOneVisitPerDay: Boolean(data.limitOneVisitPerDay),
        cashbackEarningMethod: Number(data.cashbackEarningMethod ?? 1),

        cashbackPercentage: String(data.cashbackPercentage ?? 5),

        cashbackAmount: String(data.cashbackAmount ?? 10),

        cashbackAmountRequired: String(data.cashbackAmountRequired ?? 200),

        minimumCashbackRedemption: String(data.minimumCashbackRedemption ?? 50),

        couponBenefitType: Number(data.couponBenefitType ?? 1),

        couponBenefitValue: String(data.couponBenefitValue ?? 10),

        couponMinimumPurchase: String(data.couponMinimumPurchase ?? 0),

        couponMaximumDiscount:
          data.couponMaximumDiscount == null
            ? ""
            : String(data.couponMaximumDiscount),

        couponExpirationType: Number(data.couponExpirationType ?? 2),

        couponValidityDays: String(data.couponValidityDays ?? 30),

        couponFixedExpirationAt: data.couponFixedExpirationAt
          ? data.couponFixedExpirationAt.slice(0, 16)
          : "",

        couponUsageLimit: String(data.couponUsageLimit ?? 1),

        couponTerms: data.couponTerms ?? "",

        giftCardAllowCustomAmount: data.giftCardAllowCustomAmount ?? true,

        giftCardCustomMinAmount: String(data.giftCardCustomMinAmount ?? 100),

        giftCardCustomMaxAmount: String(data.giftCardCustomMaxAmount ?? 2000),

        giftCardExpirationEnabled: data.giftCardExpirationEnabled ?? false,

        giftCardValidityDays: String(data.giftCardValidityDays ?? 365),

        giftCardPresetAmounts: Array.isArray(data.giftCardPresetAmounts)
          ? [...data.giftCardPresetAmounts].sort(
              (left, right) => left.displayOrder - right.displayOrder,
            )
          : [],

        isRecurring: data.isRecurring,

        cardBackgroundColor: data.cardBackgroundColor ?? "#1b6726",

        cardForegroundColor: data.cardForegroundColor ?? "#ffffff",

        cardLabelColor: data.cardLabelColor ?? "#f5f1e8",

        cardStripColor: data.cardStripColor ?? "#14532d",

        stripDesignMode: data.cardStripImageUrl ? "image" : "color",

        showPoweredByFidara: data.showPoweredByFidara,

        rewardName: data.reward?.name ?? "",

        rewardDescription: data.reward?.description ?? "",

        rewardType: Number(data.reward?.rewardType ?? 1),

        rewardValue: String(data.reward?.rewardValue ?? 0),
      });

      setPreviews({
        logo: absoluteUrl(data.cardLogoUrl),

        activeStamp: absoluteUrl(data.activeStampImageUrl),

        inactiveStamp: absoluteUrl(data.inactiveStampImageUrl),

        stripImage: absoluteUrl(data.cardStripImageUrl),
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible cargar el programa.",
      );
    } finally {
      setLoading(false);
    }
  }, [isNewProgram, programId, router]);

  const loadProgramLocations = useCallback(async () => {
    if (isNewProgram) return;

    setLocationsLoading(true);
    setLocationsError("");
    try {
      const response = await fetch(`/api/programs/${programId}/locations`, {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (!response.ok || !payload.data) {
        throw new Error(
          payload.message ?? "No fue posible cargar las sucursales participantes.",
        );
      }

      const data = payload.data as ProgramLocationsData;
      const available = Array.isArray(data.availableLocations)
        ? data.availableLocations
        : [];
      const participating = Array.isArray(data.participatingLocationIds)
        ? data.participatingLocationIds
        : [];
      setAvailableLocations(available);
      setParticipatingLocationIds(participating);
      setSavedParticipatingLocationIds(participating);
    } catch (caught) {
      setLocationsError(
        caught instanceof Error
          ? caught.message
          : "No fue posible cargar las sucursales participantes.",
      );
    } finally {
      setLocationsLoading(false);
    }
  }, [isNewProgram, programId, router]);

  useEffect(() => {
    // Carga inicial desde el BFF al montar/cambiar el programa.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProgram();
  }, [loadProgram]);

  useEffect(() => {
    void Promise.resolve().then(loadProgramLocations);
  }, [loadProgramLocations]);

  const locationsDirty = !sameLocationIds(
    participatingLocationIds,
    savedParticipatingLocationIds,
  );
  const selectedActiveLocationCount = availableLocations.filter((location) =>
    participatingLocationIds.includes(location.id),
  ).length;
  const normalizedLocationSearch = locationSearch.trim().toLocaleLowerCase("es-MX");
  const filteredLocations = normalizedLocationSearch
    ? availableLocations.filter((location) =>
        [location.name, location.addressLine1, location.city, location.state]
          .filter((value): value is string => Boolean(value))
          .some((value) =>
            value.toLocaleLowerCase("es-MX").includes(normalizedLocationSearch),
          ),
      )
    : availableLocations;

  function toggleParticipatingLocation(locationId: string) {
    const availableIds = new Set(availableLocations.map((location) => location.id));
    setParticipatingLocationIds((current) => {
      const activeSelection = current.filter((id) => availableIds.has(id));
      return activeSelection.includes(locationId)
        ? activeSelection.filter((id) => id !== locationId)
        : [...activeSelection, locationId];
    });
  }

  function selectAllParticipatingLocations() {
    setParticipatingLocationIds(availableLocations.map((location) => location.id));
  }

  function deselectAllParticipatingLocations() {
    setParticipatingLocationIds([]);
  }

  async function saveProgramLocations() {
    setLocationsError("");
    const response = await fetch(`/api/programs/${programId}/locations`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationIds: participatingLocationIds }),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) {
      router.replace("/login");
      throw new Error("Tu sesión ha expirado.");
    }
    if (!response.ok || !payload.data) {
      throw new Error(
        payload.message ?? "No fue posible guardar las sucursales participantes.",
      );
    }

    const data = payload.data as ProgramLocationsData;
    const participating = Array.isArray(data.participatingLocationIds)
      ? data.participatingLocationIds
      : participatingLocationIds;
    setAvailableLocations(
      Array.isArray(data.availableLocations)
        ? data.availableLocations
        : availableLocations,
    );
    setParticipatingLocationIds(participating);
    setSavedParticipatingLocationIds(participating);
  }

  function updateField<Key extends keyof ProgramForm>(
    field: Key,
    value: ProgramForm[Key],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

  }

  function selectProgramType(programType: 1 | 2 | 3 | 4 | 5 | 6) {
    setForm((current) => ({
      ...current,

      programType,

      targetValue: programType === 1 ? "10" : programType === 2 ? "100" : "0",

      pointsEarned: programType === 2 ? current.pointsEarned || "1" : "1",

      amountRequired: programType === 2 ? current.amountRequired || "10" : "10",

      pointsEarningMethod:
        programType === 2 ? current.pointsEarningMethod || 1 : 1,

      limitOneVisitPerDay:
        programType === 2 ? current.limitOneVisitPerDay : false,

      cashbackEarningMethod:
        programType === 3 ? current.cashbackEarningMethod || 1 : 1,

      cashbackPercentage:
        programType === 3 ? current.cashbackPercentage || "5" : "5",

      cashbackAmount: programType === 3 ? current.cashbackAmount || "10" : "10",

      cashbackAmountRequired:
        programType === 3 ? current.cashbackAmountRequired || "200" : "200",

      minimumCashbackRedemption:
        programType === 3 ? current.minimumCashbackRedemption || "50" : "50",

      couponBenefitType: programType === 4 ? current.couponBenefitType || 1 : 1,

      couponBenefitValue:
        programType === 4 ? current.couponBenefitValue || "10" : "10",

      couponMinimumPurchase:
        programType === 4 ? current.couponMinimumPurchase || "0" : "0",

      couponMaximumDiscount:
        programType === 4 ? current.couponMaximumDiscount : "",

      couponExpirationType:
        programType === 4 ? current.couponExpirationType || 2 : 2,

      couponValidityDays:
        programType === 4 ? current.couponValidityDays || "30" : "30",

      couponFixedExpirationAt:
        programType === 4 ? current.couponFixedExpirationAt : "",

      couponUsageLimit:
        programType === 4 ? current.couponUsageLimit || "1" : "1",

      couponTerms: programType === 4 ? current.couponTerms : "",

      isRecurring:
        programType === 5 || programType === 6 ? false : current.isRecurring,
    }));

    setProgramTypeSelected(true);
    setShowTypeSelector(false);
    setError("");
  }

  function updateGiftCardPreset(
    index: number,
    changes: Partial<GiftCardPreset>,
  ) {
    setForm((current) => ({
      ...current,
      giftCardPresetAmounts: current.giftCardPresetAmounts.map(
        (preset, presetIndex) =>
          presetIndex === index ? { ...preset, ...changes } : preset,
      ),
    }));
  }

  function moveGiftCardPreset(index: number, direction: -1 | 1) {
    setForm((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.giftCardPresetAmounts.length) {
        return current;
      }
      const presets = [...current.giftCardPresetAmounts];
      [presets[index], presets[target]] = [presets[target], presets[index]];
      return {
        ...current,
        giftCardPresetAmounts: presets.map((preset, displayOrder) => ({
          ...preset,
          displayOrder,
        })),
      };
    });
  }

  function selectImage(
    field: keyof ImageFiles,
    previewField: keyof ImagePreviews,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no puede superar los 5 MB.");

      event.target.value = "";
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Selecciona una imagen PNG, JPG o WebP.");

      event.target.value = "";
      return;
    }

    setFiles((current) => ({
      ...current,
      [field]: file,
    }));

    setPreviews((current) => {
      const previous = current[previewField];

      if (previous?.startsWith("blob:")) {
        URL.revokeObjectURL(previous);
      }

      return {
        ...current,
        [previewField]: URL.createObjectURL(file),
      };
    });

    setError("");
  }

  async function selectStripImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.type !== "image/png") {
      setError("La imagen central debe estar en formato PNG.");
      event.target.value = "";
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setError("La imagen central no puede pesar más de 3 MB.");
      event.target.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    try {
      const dimensions = await new Promise<{
        width: number;
        height: number;
      }>((resolve, reject) => {
        const image = new Image();

        image.onload = () =>
          resolve({
            width: image.naturalWidth,
            height: image.naturalHeight,
          });

        image.onerror = () =>
          reject(new Error("No fue posible leer la imagen central."));

        image.src = objectUrl;
      });

      if (dimensions.width < 1125 || dimensions.height < 432) {
        URL.revokeObjectURL(objectUrl);
        setError("La imagen central debe medir al menos 1125 × 432 px.");
        event.target.value = "";
        return;
      }

      setFiles((current) => ({
        ...current,
        stripImage: file,
      }));

      setPreviews((current) => {
        if (current.stripImage?.startsWith("blob:")) {
          URL.revokeObjectURL(current.stripImage);
        }

        return {
          ...current,
          stripImage: objectUrl,
        };
      });

      updateField("stripDesignMode", "image");
      setError("");
    } catch (caught) {
      URL.revokeObjectURL(objectUrl);
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible leer la imagen central.",
      );
      event.target.value = "";
    }
  }

  async function copyJoinUrl() {
    if (!joinUrl) {
      return;
    }

    await navigator.clipboard.writeText(joinUrl);

    setLinkCopied(true);

    window.setTimeout(() => {
      setLinkCopied(false);
    }, 1800);
  }

  async function saveProgram(event: FormEvent) {
    event.preventDefault();

    if (!program || saving) {
      return;
    }
    const targetValue = Number(form.targetValue);

    const pointsEarned = Number(form.pointsEarned);

    const amountRequired = Number(form.amountRequired);

    const cashbackPercentage = Number(form.cashbackPercentage);

    const cashbackAmount = Number(form.cashbackAmount);

    const cashbackAmountRequired = Number(form.cashbackAmountRequired);

    const minimumCashbackRedemption = Number(form.minimumCashbackRedemption);

    const couponBenefitValue = Number(form.couponBenefitValue);

    const couponMinimumPurchase = Number(form.couponMinimumPurchase || "0");

    const couponMaximumDiscount =
      form.couponMaximumDiscount.trim() === ""
        ? null
        : Number(form.couponMaximumDiscount);

    const couponValidityDays = Number(form.couponValidityDays);

    const couponUsageLimit = Number(form.couponUsageLimit);

    const giftCardCustomMinAmount = Number(form.giftCardCustomMinAmount);

    const giftCardCustomMaxAmount = Number(form.giftCardCustomMaxAmount);

    const giftCardValidityDays = Number(form.giftCardValidityDays);

    const rewardValue = Number(form.rewardValue || "0");

    if (!form.name.trim()) {
      setError("El nombre del programa es obligatorio.");

      return;
    }

    if (isStampProgram) {
      if (
        !Number.isInteger(targetValue) ||
        targetValue < 1 ||
        targetValue > 20
      ) {
        setError("La meta debe ser un número entero entre 1 y 20 sellos.");
        return;
      }
    }

    if (isPointsProgram) {
      if (!Number.isFinite(targetValue) || targetValue <= 0) {
        setError(
          "Los puntos necesarios para la recompensa deben ser mayores a cero.",
        );
        return;
      }

      if (!Number.isFinite(pointsEarned) || pointsEarned <= 0) {
        setError("Los puntos otorgados deben ser mayores a cero.");

        return;
      }

      if (
        form.pointsEarningMethod === 1 &&
        (!Number.isFinite(amountRequired) || amountRequired <= 0)
      ) {
        setError(
          "El importe necesario para generar puntos debe ser mayor a cero.",
        );
        return;
      }
    }

    if (isCashbackProgram) {
      if (form.cashbackEarningMethod === 1) {
        if (
          !Number.isFinite(cashbackPercentage) ||
          cashbackPercentage <= 0 ||
          cashbackPercentage > 100
        ) {
          setError(
            "El porcentaje de cashback debe ser mayor a 0 y no puede superar 100.",
          );

          return;
        }
      } else if (form.cashbackEarningMethod === 2) {
        if (!Number.isFinite(cashbackAmount) || cashbackAmount <= 0) {
          setError("El cashback otorgado debe ser mayor a cero.");

          return;
        }

        if (
          !Number.isFinite(cashbackAmountRequired) ||
          cashbackAmountRequired <= 0
        ) {
          setError(
            "El importe necesario para generar cashback debe ser mayor a cero.",
          );

          return;
        }
      } else {
        setError("Selecciona un método de cashback.");

        return;
      }

      if (
        !Number.isFinite(minimumCashbackRedemption) ||
        minimumCashbackRedemption < 0
      ) {
        setError(
          "El saldo mínimo para utilizar cashback no puede ser negativo.",
        );

        return;
      }
    }

    if (isCouponProgram) {
      if (![1, 2, 3, 4].includes(form.couponBenefitType)) {
        setError("Selecciona un beneficio válido.");
        return;
      }

      if (
        form.couponBenefitType === 1 &&
        (!Number.isFinite(couponBenefitValue) ||
          couponBenefitValue <= 0 ||
          couponBenefitValue > 100)
      ) {
        setError("El porcentaje del cupón debe estar entre 1 y 100.");
        return;
      }

      if (
        form.couponBenefitType === 2 &&
        (!Number.isFinite(couponBenefitValue) || couponBenefitValue <= 0)
      ) {
        setError("El descuento debe ser mayor a cero.");
        return;
      }

      if (
        !Number.isFinite(couponMinimumPurchase) ||
        couponMinimumPurchase < 0
      ) {
        setError("La compra mínima no puede ser negativa.");
        return;
      }

      if (
        couponMaximumDiscount !== null &&
        (!Number.isFinite(couponMaximumDiscount) ||
          couponMaximumDiscount <= 0)
      ) {
        setError("El descuento máximo debe ser mayor a cero.");
        return;
      }

      if (
        form.couponExpirationType === 1 &&
        (!form.couponFixedExpirationAt ||
          Number.isNaN(new Date(form.couponFixedExpirationAt).getTime()))
      ) {
        setError("Selecciona una fecha de vencimiento válida.");
        return;
      }

      if (
        form.couponExpirationType === 2 &&
        (!Number.isInteger(couponValidityDays) || couponValidityDays < 1)
      ) {
        setError("Los días de vigencia deben ser mayores a cero.");
        return;
      }

      if (!Number.isInteger(couponUsageLimit) || couponUsageLimit < 1) {
        setError("El cupón debe permitir al menos un uso.");
        return;
      }
    }

    if (isGiftCardProgram) {
      const presetAmounts = form.giftCardPresetAmounts.map(({ amount }) => amount);
      const hasInvalidPreset = presetAmounts.some(
        (amount) =>
          !Number.isFinite(amount) ||
          amount <= 0 ||
          Math.round(amount * 100) !== amount * 100,
      );
      const hasDuplicates = new Set(presetAmounts).size !== presetAmounts.length;

      if (hasInvalidPreset) {
        setError("Cada monto preestablecido debe ser positivo y tener máximo dos decimales.");
        return;
      }

      if (hasDuplicates) {
        setError("Los montos preestablecidos no pueden repetirse.");
        return;
      }

      if (!form.giftCardAllowCustomAmount && !form.giftCardPresetAmounts.some((preset) => preset.isActive)) {
        setError("Activa al menos un monto o permite importes personalizados.");
        return;
      }

      if (
        form.giftCardAllowCustomAmount &&
        (!Number.isFinite(giftCardCustomMinAmount) ||
          !Number.isFinite(giftCardCustomMaxAmount) ||
          giftCardCustomMinAmount <= 0 ||
          giftCardCustomMaxAmount < giftCardCustomMinAmount ||
          Math.round(giftCardCustomMinAmount * 100) !== giftCardCustomMinAmount * 100 ||
          Math.round(giftCardCustomMaxAmount * 100) !== giftCardCustomMaxAmount * 100)
      ) {
        setError("Configura un rango personalizado válido con máximo dos decimales.");
        return;
      }

      if (
        form.giftCardExpirationEnabled &&
        (!Number.isInteger(giftCardValidityDays) || giftCardValidityDays < 1)
      ) {
        setError("La vigencia debe ser de al menos un día.");
        return;
      }
    }

    if (
      usesTraditionalReward &&
      form.rewardType === 3 &&
      (!Number.isFinite(rewardValue) || rewardValue <= 0 || rewardValue > 100)
    ) {
      setError("El porcentaje de descuento debe estar entre 1 y 100.");
      return;
    }

    if (usesTraditionalReward && !form.rewardName.trim()) {
      setError("El nombre de la recompensa es obligatorio.");
      return;
    }

    if (
      usesTraditionalReward &&
      form.rewardType === 2 &&
      (!Number.isFinite(rewardValue) || rewardValue <= 0)
    ) {
      setError("El valor del descuento debe ser mayor a cero.");
      return;
    }

    setSaving(true);
    setError("");
    let locationsSaveError: string | null = null;

    try {
      const formData = new FormData();

      formData.append("Name", form.name.trim());

      formData.append("Description", form.description.trim());

      formData.append("ProgramType", String(form.programType));

      // Sellos y puntos tienen meta.
      // Cashback y cupones no utilizan TargetValue.
      if (isStampProgram || isPointsProgram) {
        formData.append("TargetValue", String(targetValue));
      }

      // Configuración del programa de puntos.
      if (isPointsProgram) {
        formData.append("PointsEarned", String(pointsEarned));

        formData.append(
          "PointsEarningMethod",
          String(form.pointsEarningMethod),
        );

        formData.append(
          "LimitOneVisitPerDay",
          String(form.pointsEarningMethod === 2 && form.limitOneVisitPerDay),
        );

        if (form.pointsEarningMethod === 1) {
          formData.append("AmountRequired", String(amountRequired));
        }
      }

      // Configuración del programa de cashback.
      if (isCashbackProgram) {
        formData.append(
          "CashbackEarningMethod",
          String(form.cashbackEarningMethod),
        );

        formData.append(
          "MinimumCashbackRedemption",
          String(minimumCashbackRedemption),
        );

        if (form.cashbackEarningMethod === 1) {
          formData.append("CashbackPercentage", String(cashbackPercentage));
        }

        if (form.cashbackEarningMethod === 2) {
          formData.append("CashbackAmount", String(cashbackAmount));

          formData.append(
            "CashbackAmountRequired",
            String(cashbackAmountRequired),
          );
        }
      }

      // Configuración del programa de cupones.
      if (isCouponProgram) {
        formData.append("CouponBenefitType", String(form.couponBenefitType));

        if (
          form.couponBenefitType === 1 ||
          form.couponBenefitType === 2
        ) {
          formData.append("CouponBenefitValue", String(couponBenefitValue));
        }

        formData.append(
          "CouponMinimumPurchase",
          String(couponMinimumPurchase),
        );

        if (
          form.couponBenefitType === 1 &&
          couponMaximumDiscount !== null
        ) {
          formData.append(
            "CouponMaximumDiscount",
            String(couponMaximumDiscount),
          );
        }

        formData.append(
          "CouponExpirationType",
          String(form.couponExpirationType),
        );

        if (form.couponExpirationType === 1) {
          formData.append(
            "CouponFixedExpirationAt",
            new Date(form.couponFixedExpirationAt).toISOString(),
          );
        }

        if (form.couponExpirationType === 2) {
          formData.append("CouponValidityDays", String(couponValidityDays));
        }

        formData.append("CouponUsageLimit", String(couponUsageLimit));
        formData.append("CouponTerms", form.couponTerms.trim());
      }

      if (isGiftCardProgram) {
        formData.append(
          "GiftCardAllowCustomAmount",
          String(form.giftCardAllowCustomAmount),
        );
        formData.append(
          "GiftCardExpirationEnabled",
          String(form.giftCardExpirationEnabled),
        );

        if (form.giftCardAllowCustomAmount) {
          formData.append(
            "GiftCardCustomMinAmount",
            String(giftCardCustomMinAmount),
          );
          formData.append(
            "GiftCardCustomMaxAmount",
            String(giftCardCustomMaxAmount),
          );
        }

        if (form.giftCardExpirationEnabled) {
          formData.append("GiftCardValidityDays", String(giftCardValidityDays));
        }

        form.giftCardPresetAmounts.forEach((preset, index) => {
          formData.append(
            `GiftCardPresetAmounts[${index}].Amount`,
            String(preset.amount),
          );
          formData.append(
            `GiftCardPresetAmounts[${index}].IsActive`,
            String(preset.isActive),
          );
          formData.append(
            `GiftCardPresetAmounts[${index}].DisplayOrder`,
            String(index),
          );
        });
      }

      // La parte central se comparte entre todos los programas.
      formData.append("CardStripColor", form.cardStripColor);

      if (form.stripDesignMode === "image" && files.stripImage) {
        formData.append("StripImage", files.stripImage);
      }

      formData.append(
        "RemoveStripImage",
        String(form.stripDesignMode === "color"),
      );

      formData.append("IsRecurring", String(form.isRecurring));

      formData.append("CardBackgroundColor", form.cardBackgroundColor);

      formData.append("CardForegroundColor", form.cardForegroundColor);

      formData.append("CardLabelColor", form.cardLabelColor);

      formData.append("ShowPoweredByFidara", String(form.showPoweredByFidara));

      // Sellos y puntos utilizan Reward.
      // Cashback y cupones tienen configuración propia.
      if (usesTraditionalReward) {
        formData.append("RewardName", form.rewardName.trim());

        formData.append("RewardDescription", form.rewardDescription.trim());

        formData.append("RewardType", String(form.rewardType));

        if (form.rewardType === 2 || form.rewardType === 3) {
          formData.append("RewardValue", String(rewardValue));
        }
      }

      // El logo está disponible para todos los programas.
      if (files.logo) {
        formData.append("Logo", files.logo);
      }

      // Estas imágenes solo corresponden a sellos.
      if (isStampProgram && files.activeStamp) {
        formData.append("ActiveStamp", files.activeStamp);
      }

      if (isStampProgram && files.inactiveStamp) {
        formData.append("InactiveStamp", files.inactiveStamp);
      }

      const endpoint = isNewProgram
        ? "/api/programs"
        : `/api/programs/${program.id}`;

      const response = await fetch(endpoint, {
        method: isNewProgram ? "POST" : "PUT",

        body: formData,
      });

      const payload = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload.message ?? "No fue posible guardar el programa.",
        );
      }

      if (isNewProgram) {
        const createdProgram: ProgramInformation | undefined = payload.data;
        const createdProgramId = createdProgram?.id ?? payload.programId;

        if (
          !createdProgramId ||
          (isSubscriptionProgram &&
            !isValidSubscriptionProgramId(createdProgramId))
        ) {
          throw new Error(
            "La API creó la tarjeta, pero no devolvió su identificador.",
          );
        }

        if (
          isSubscriptionProgram &&
          createdProgram &&
          createdProgram.id === createdProgramId
        ) {
          setProgram(createdProgram);
        }

        router.replace(`/dashboard/tarjeta/${createdProgramId}`);

        router.refresh();
        return;
      }

      if (locationsDirty) {
        try {
          await saveProgramLocations();
        } catch (caught) {
          locationsSaveError =
            caught instanceof Error
              ? caught.message
              : "No fue posible guardar las sucursales participantes.";
          setLocationsError(locationsSaveError);
        }
      }

      const updated: ProgramInformation = payload.data;

      setProgram(updated);

      if (Number(updated.programType) === 5) {
        setForm((current) => ({
          ...current,
          giftCardAllowCustomAmount:
            updated.giftCardAllowCustomAmount ?? current.giftCardAllowCustomAmount,
          giftCardCustomMinAmount: String(
            updated.giftCardCustomMinAmount ?? current.giftCardCustomMinAmount,
          ),
          giftCardCustomMaxAmount: String(
            updated.giftCardCustomMaxAmount ?? current.giftCardCustomMaxAmount,
          ),
          giftCardExpirationEnabled:
            updated.giftCardExpirationEnabled ?? current.giftCardExpirationEnabled,
          giftCardValidityDays: String(
            updated.giftCardValidityDays ?? current.giftCardValidityDays,
          ),
          giftCardPresetAmounts: Array.isArray(updated.giftCardPresetAmounts)
            ? [...updated.giftCardPresetAmounts].sort(
                (left, right) => left.displayOrder - right.displayOrder,
              )
            : current.giftCardPresetAmounts,
        }));
      }

      setPreviews({
        logo: absoluteUrl(updated.cardLogoUrl),

        activeStamp: absoluteUrl(updated.activeStampImageUrl),

        inactiveStamp: absoluteUrl(updated.inactiveStampImageUrl),

        stripImage: absoluteUrl(updated.cardStripImageUrl),
      });

      setFiles({
        logo: null,
        activeStamp: null,
        inactiveStamp: null,
        stripImage: null,
      });

      if (locationsSaveError) {
        toast.error("Programa guardado parcialmente", {
          description: `Los datos generales se actualizaron, pero las sucursales no: ${locationsSaveError}`,
        });
      } else {
        toast.success("Programa actualizado", {
          description: locationsDirty
            ? "La tarjeta y sus sucursales participantes se guardaron correctamente."
            : payload.message ?? "La tarjeta se guardó correctamente.",
        });
      }
    } catch (caught) {
      toast.error("No se pudo guardar el programa", {
        description:
          caught instanceof Error
            ? caught.message
            : "No fue posible guardar el programa.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card-editor-loading">
        <LoaderCircle className="scanner-spinner" size={28} />
        Cargando programa...
      </div>
    );
  }

  return (
    <div className="card-editor-page">
      {showTypeSelector && isNewProgram && (
        <div
          className="card-type-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="card-type-modal-title"
        >
          <section className="card-type-modal">
            <div className="card-type-modal-heading">
              <div>
                <span className="page-eyebrow">Programa de lealtad</span>
                <h2 id="card-type-modal-title">Elige el tipo de tarjeta</h2>
                <p>
                  Selecciona cómo quieres recompensar a tus clientes. Podrás
                  personalizar el diseño en el siguiente paso.
                </p>
              </div>

              <button
                type="button"
                className="card-type-modal-close"
                aria-label="Cerrar selector"
                onClick={() => {
                  if (programTypeSelected) {
                    setShowTypeSelector(false);
                  } else {
                    router.back();
                  }
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="card-type-catalog">
              <button
                type="button"
                className={`card-type-option available ${form.programType === 1 ? "selected" : ""}`}
                aria-pressed={form.programType === 1}
                onClick={() => selectProgramType(1)}
              >
                <span className="card-type-icon">
                  <Stamp size={25} />
                </span>
                <span className="card-type-copy">
                  <strong>Sellos</strong>
                  <small>
                    Premia compras o visitas con una tarjeta visual.
                  </small>
                </span>
              </button>

              <button
                type="button"
                className={`card-type-option available ${form.programType === 2 ? "selected" : ""}`}
                aria-pressed={form.programType === 2}
                onClick={() => selectProgramType(2)}
              >
                <span className="card-type-icon">
                  <Coins size={25} />
                </span>
                <span className="card-type-copy">
                  <strong>Puntos</strong>
                  <small>Acumula puntos por gasto o por cada visita.</small>
                </span>
              </button>

              <button
                type="button"
                className={`card-type-option available ${form.programType === 3 ? "selected" : ""}`}
                aria-pressed={form.programType === 3}
                onClick={() => selectProgramType(3)}
              >
                <span className="card-type-icon">
                  <Banknote size={25} />
                </span>

                <span className="card-type-copy">
                  <strong>Cashback</strong>

                  <small>Devuelve una parte de cada compra como saldo.</small>
                </span>

              </button>

              <button
                type="button"
                className={`card-type-option available ${form.programType === 4 ? "selected" : ""}`}
                aria-pressed={form.programType === 4}
                onClick={() => selectProgramType(4)}
              >
                <span className="card-type-icon">
                  <Ticket size={25} />
                </span>

                <span className="card-type-copy">
                  <strong>Cupones</strong>
                  <small>
                    Ofrece descuentos, productos gratis y promociones con
                    vencimiento.
                  </small>
                </span>

              </button>
              <button
                type="button"
                className={`card-type-option ${subscriptionsEnabled ? "available" : "upcoming"} ${form.programType === 6 ? "selected" : ""}`}
                disabled={!subscriptionsEnabled}
                aria-pressed={form.programType === 6}
                onClick={() => selectProgramType(6)}
              >
                <span className="card-type-icon">
                  <Crown size={25} />
                </span>
                <span className="card-type-copy">
                  <strong>Suscripción</strong>
                  <small>Planes periódicos con beneficios incluidos.</small>
                </span>
              </button>

              <button
                type="button"
                className={`card-type-option available ${form.programType === 5 ? "selected" : ""}`}
                aria-pressed={form.programType === 5}
                onClick={() => selectProgramType(5)}
              >
                <span className="card-type-icon">
                  <CreditCard size={25} />
                </span>
                <span className="card-type-copy">
                  <strong>Tarjeta de regalo</strong>
                  <small>Saldo digital para regalar y utilizar después.</small>
                </span>
              </button>
            </div>

          </section>
        </div>
      )}

      <section className="card-editor-heading">
        <div>
          <span className="page-eyebrow">Mi tarjeta</span>

          <h1>{editorTitle}</h1>

          <p>
            Personaliza la experiencia que tus clientes guardan en su Wallet.
          </p>
        </div>

        <button
          type="submit"
          form="program-form"
          className="card-save-button"
          disabled={saving}
        >
          {saving ? (
            <>
              <LoaderCircle className="scanner-spinner" size={18} />

              {isNewProgram ? "Creando..." : "Guardando..."}
            </>
          ) : (
            <>
              <Save size={18} />

              {isNewProgram ? "Crear tarjeta" : "Guardar cambios"}
            </>
          )}
        </button>
      </section>

      {error && <div className="card-editor-alert error-box">{error}</div>}


      <div className="card-editor-layout">
        <form
          id="program-form"
          className="card-settings"
          onSubmit={saveProgram}
        >
          <section className="settings-card">
            <div className="settings-card-heading">
              <span>
                <Stamp size={19} />
              </span>

              <div>
                <h2>Información del programa</h2>
                <p>Información principal de tu tarjeta.</p>
              </div>
            </div>

            {isNewProgram ? (
              <div className="selected-program-summary">
                <span className="selected-program-main">
                  <span className="selected-program-icon">
                    {isStampProgram ? (
                      <Stamp size={22} />
                    ) : isPointsProgram ? (
                      <Coins size={22} />
                    ) : isCashbackProgram ? (
                      <Banknote size={22} />
                    ) : isGiftCardProgram ? (
                      <CreditCard size={22} />
                    ) : isSubscriptionProgram ? (
                      <Crown size={22} />
                    ) : (
                      <Ticket size={22} />
                    )}
                  </span>

                  <span className="selected-program-copy">
                    <small>Tipo de tarjeta</small>
                    <strong>{programTypeLabel}</strong>
                  </span>
                </span>
                <button type="button" onClick={() => setShowTypeSelector(true)}>
                  Cambiar tipo
                </button>
              </div>
            ) : (
              <p className="existing-program-type">
                <small>Tipo de tarjeta</small>
                <strong>{programTypeLabel}</strong>
              </p>
            )}

            {isPointsProgram && (
              <div className="points-earning-settings">
                <div className="settings-card-heading">
                  <div>
                    <h3>¿Cómo acumularán puntos los clientes?</h3>
                    <p>Selecciona la acción que generará los puntos.</p>
                  </div>
                </div>

                <div className="program-type-grid">
                  <button
                    type="button"
                    className={form.pointsEarningMethod === 1 ? "selected" : ""}
                    onClick={() => {
                      updateField("pointsEarningMethod", 1);
                      updateField("limitOneVisitPerDay", false);
                    }}
                  >
                    <span>
                      <Coins size={22} />
                    </span>
                    <strong>Por gasto</strong>
                    <small>Otorga puntos según el total de la compra.</small>
                  </button>

                  <button
                    type="button"
                    className={form.pointsEarningMethod === 2 ? "selected" : ""}
                    onClick={() => {
                      updateField("pointsEarningMethod", 2);

                      if (Number(form.pointsEarned) === 1) {
                        updateField("pointsEarned", "10");
                      }
                    }}
                  >
                    <span>
                      <Stamp size={22} />
                    </span>
                    <strong>Por visita</strong>
                    <small>
                      Otorga una cantidad fija de puntos en cada visita.
                    </small>
                  </button>
                </div>

                {form.pointsEarningMethod === 2 && (
                  <label className="settings-toggle full-field">
                    <input
                      type="checkbox"
                      checked={form.limitOneVisitPerDay}
                      onChange={(event) =>
                        updateField("limitOneVisitPerDay", event.target.checked)
                      }
                    />

                    <span className="toggle-control" />

                    <span>
                      <strong>Limitar a una visita con puntos por día</strong>
                      <br />
                      <small>
                        Evita que el cliente acumule puntos varias veces durante
                        el mismo día local de la sucursal.
                      </small>
                    </span>
                  </label>
                )}
              </div>
            )}

            <div className="settings-fields">
              <label>
                <span>Nombre del programa</span>

                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  maxLength={100}
                  required
                />
              </label>

              <label>
                <span>Descripción</span>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  rows={3}
                  maxLength={300}
                />
              </label>
            </div>
          </section>

          {!isNewProgram && (
            <section className="settings-card">
              <div className="settings-card-heading">
                <span>
                  <MapPin size={19} />
                </span>
                <div>
                  <h2>Sucursales participantes</h2>
                  <p>
                    Selecciona las sucursales donde tus clientes podrán acumular
                    y utilizar sus beneficios con esta tarjeta.
                  </p>
                </div>
              </div>

              {locationsLoading ? (
                <div className="grid gap-3" role="status" aria-label="Cargando sucursales">
                  {[0, 1, 2].map((item) => (
                    <div
                      key={item}
                      className="h-[74px] animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
                    />
                  ))}
                </div>
              ) : locationsError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
                  <strong className="block">No se pudieron cargar las sucursales</strong>
                  <span className="mt-1 block">{locationsError}</span>
                  <button
                    type="button"
                    className="mt-3 rounded-xl border border-rose-200 bg-white px-4 py-2 font-bold"
                    onClick={() => void loadProgramLocations()}
                  >
                    Intentar nuevamente
                  </button>
                </div>
              ) : availableLocations.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  No existen sucursales activas disponibles para este programa.
                </div>
              ) : (
                <>
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-bold text-slate-600">
                      {selectedActiveLocationCount} de {availableLocations.length} seleccionadas
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 transition hover:border-rose-200 hover:text-[#E11D48] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={saving || selectedActiveLocationCount === availableLocations.length}
                        onClick={selectAllParticipatingLocations}
                      >
                        Seleccionar todas
                      </button>
                      <button
                        type="button"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 transition hover:border-rose-200 hover:text-[#E11D48] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={saving || selectedActiveLocationCount === 0}
                        onClick={deselectAllParticipatingLocations}
                      >
                        Deseleccionar todas
                      </button>
                    </div>
                  </div>

                  {availableLocations.length > 6 && (
                    <label className="relative mb-4 block">
                      <span className="sr-only">Buscar sucursal</span>
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="search"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100"
                        value={locationSearch}
                        placeholder="Buscar por nombre, ciudad o dirección"
                        onChange={(event) => setLocationSearch(event.target.value)}
                      />
                    </label>
                  )}

                  {filteredLocations.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-600">
                      No hay sucursales que coincidan con la búsqueda.
                    </div>
                  ) : (
                    <div className="grid max-h-[520px] gap-3 overflow-x-hidden overflow-y-auto pr-1 sm:grid-cols-2">
                      {filteredLocations.map((location) => {
                        const selected = participatingLocationIds.includes(location.id);
                        const address = [location.addressLine1, location.city, location.state]
                          .filter(Boolean)
                          .join(", ");
                        return (
                          <label
                            key={location.id}
                            className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                              selected
                                ? "border-[#E11D48] bg-rose-50"
                                : "border-slate-200 bg-white hover:border-rose-200"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5 size-5 shrink-0 accent-[#E11D48]"
                              checked={selected}
                              disabled={saving}
                              onChange={() => toggleParticipatingLocation(location.id)}
                            />
                            <span className="min-w-0">
                              <strong className="block truncate text-sm text-slate-950">
                                {location.name}
                              </strong>
                              <small className="mt-1 block break-words text-xs text-slate-500">
                                {address || "Sin dirección registrada"}
                              </small>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {!locationsLoading && !locationsError && availableLocations.length > 1 && selectedActiveLocationCount === 0 && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900" role="alert">
                  Sin sucursales seleccionadas, el programa dejará de estar disponible para operaciones presenciales.
                </div>
              )}

              {!locationsLoading && !locationsError && availableLocations.length > 0 && (
                <p className="mt-4 text-xs font-semibold text-slate-500">
                  {locationsDirty
                    ? "Hay cambios pendientes. Se guardarán al pulsar Guardar cambios."
                    : "Las sucursales participantes están actualizadas."}
                </p>
              )}
            </section>
          )}

          {isGiftCardProgram && (
            <section className="settings-card">
              <div className="settings-card-heading">
                <span><CreditCard size={19} /></span>
                <div>
                  <h2>Montos y vigencia</h2>
                  <p>Configura las opciones disponibles al registrar una venta.</p>
                </div>
              </div>

              <div className="settings-fields">
                <div className="full-field gift-card-presets">
                  <div className="gift-card-presets-heading">
                    <div>
                      <strong>Montos preestablecidos</strong>
                      <small>Activa, ordena o elimina las opciones de venta.</small>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const largest = Math.max(
                          0,
                          ...form.giftCardPresetAmounts.map((preset) => preset.amount),
                        );
                        updateField("giftCardPresetAmounts", [
                          ...form.giftCardPresetAmounts,
                          {
                            amount: largest + 100,
                            isActive: true,
                            displayOrder: form.giftCardPresetAmounts.length,
                          },
                        ]);
                      }}
                    >
                      <Plus size={16} /> Agregar monto
                    </button>
                  </div>

                  {form.giftCardPresetAmounts.length === 0 ? (
                    <p className="field-help">No hay montos preestablecidos.</p>
                  ) : (
                    form.giftCardPresetAmounts.map((preset, index) => (
                      <div className="gift-card-preset-row" key={index}>
                        <label>
                          <span>Monto {index + 1}</span>
                          <div className="money-field">
                            <b>$</b>
                            <input
                              type="number"
                              min={0.01}
                              step={0.01}
                              value={preset.amount}
                              onChange={(event) =>
                                updateGiftCardPreset(index, {
                                  amount: Number(event.target.value),
                                })
                              }
                            />
                            <small>MXN</small>
                          </div>
                        </label>
                        <label className="gift-card-preset-active">
                          <input
                            type="checkbox"
                            checked={preset.isActive}
                            onChange={(event) =>
                              updateGiftCardPreset(index, {
                                isActive: event.target.checked,
                              })
                            }
                          />
                          Activo
                        </label>
                        <div className="gift-card-preset-actions">
                          <button type="button" aria-label="Subir monto" disabled={index === 0} onClick={() => moveGiftCardPreset(index, -1)}><ArrowUp size={16} /></button>
                          <button type="button" aria-label="Bajar monto" disabled={index === form.giftCardPresetAmounts.length - 1} onClick={() => moveGiftCardPreset(index, 1)}><ArrowDown size={16} /></button>
                          <button
                            type="button"
                            aria-label="Eliminar monto"
                            onClick={() =>
                              updateField(
                                "giftCardPresetAmounts",
                                form.giftCardPresetAmounts
                                  .filter((_, presetIndex) => presetIndex !== index)
                                  .map((item, displayOrder) => ({ ...item, displayOrder })),
                              )
                            }
                          ><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <label className="settings-toggle full-field">
                  <input type="checkbox" checked={form.giftCardAllowCustomAmount} onChange={(event) => updateField("giftCardAllowCustomAmount", event.target.checked)} />
                  <span className="toggle-control" />
                  <span><strong>Permitir monto personalizado</strong><br /><small>El empleado podrá capturar un importe dentro del rango.</small></span>
                </label>

                {form.giftCardAllowCustomAmount && <>
                  <label><span>Importe mínimo</span><div className="money-field"><b>$</b><input type="number" min={0.01} step={0.01} value={form.giftCardCustomMinAmount} onChange={(event) => updateField("giftCardCustomMinAmount", normalizeNumericInput(event.target.value))} /><small>MXN</small></div></label>
                  <label><span>Importe máximo</span><div className="money-field"><b>$</b><input type="number" min={0.01} step={0.01} value={form.giftCardCustomMaxAmount} onChange={(event) => updateField("giftCardCustomMaxAmount", normalizeNumericInput(event.target.value))} /><small>MXN</small></div></label>
                </>}

                <label className="settings-toggle full-field">
                  <input type="checkbox" checked={form.giftCardExpirationEnabled} onChange={(event) => updateField("giftCardExpirationEnabled", event.target.checked)} />
                  <span className="toggle-control" />
                  <span><strong>Configurar vencimiento</strong><br /><small>Deshabilitado por defecto; se fija al crear la venta.</small></span>
                </label>

                {form.giftCardExpirationEnabled && <label><span>Días de vigencia</span><input type="number" min={1} step={1} value={form.giftCardValidityDays} onChange={(event) => updateField("giftCardValidityDays", normalizeNumericInput(event.target.value))} /></label>}
              </div>
            </section>
          )}

          {isCashbackProgram && (
            <section className="settings-card">
              <div className="settings-card-heading">
                <span>
                  <Banknote size={19} />
                </span>

                <div>
                  <h2>Cashback</h2>
                  <p>Configura cómo recibirán saldo tus clientes.</p>
                </div>
              </div>

              <div className="points-earning-settings">
                <div className="settings-card-heading">
                  <div>
                    <h3>¿Cómo recibirán cashback los clientes?</h3>

                    <p>Selecciona cómo se calculará el saldo en cada compra.</p>
                  </div>
                </div>

                <div className="program-type-grid">
                  <button
                    type="button"
                    className={
                      form.cashbackEarningMethod === 1 ? "selected" : ""
                    }
                    onClick={() => updateField("cashbackEarningMethod", 1)}
                  >
                    <span>
                      <BadgePercent size={22} />
                    </span>

                    <strong>Por porcentaje</strong>

                    <small>
                      Devuelve un porcentaje del total de la compra.
                    </small>
                  </button>

                  <button
                    type="button"
                    className={
                      form.cashbackEarningMethod === 2 ? "selected" : ""
                    }
                    onClick={() => updateField("cashbackEarningMethod", 2)}
                  >
                    <span>
                      <Banknote size={22} />
                    </span>

                    <strong>Por cantidad fija</strong>

                    <small>
                      Entrega una cantidad de saldo por cada monto gastado.
                    </small>
                  </button>
                </div>
              </div>

              <div className="settings-fields reward-fields">
                {form.cashbackEarningMethod === 1 ? (
                  <label>
                    <span>Porcentaje de cashback</span>

                    <div className="money-field">
                      <input
                        type="number"
                        min={0.01}
                        max={100}
                        step={0.01}
                        value={form.cashbackPercentage}
                        onChange={(event) =>
                          updateField(
                            "cashbackPercentage",
                            normalizeNumericInput(event.target.value),
                          )
                        }
                        required
                      />

                      <small>%</small>
                    </div>

                    <small className="field-help">
                      Ejemplo: una compra de $500 con{" "}
                      {form.cashbackPercentage || 0}% entrega $
                      {(
                        (500 * (Number(form.cashbackPercentage) || 0)) /
                        100
                      ).toFixed(2)}{" "}
                      MXN de cashback.
                    </small>
                  </label>
                ) : (
                  <>
                    <label>
                      <span>Cashback otorgado</span>

                      <div className="money-field">
                        <b>$</b>

                        <input
                          type="number"
                          min={0.01}
                          step={0.01}
                          value={form.cashbackAmount}
                          onChange={(event) =>
                            updateField(
                              "cashbackAmount",
                              normalizeNumericInput(event.target.value),
                            )
                          }
                          required
                        />

                        <small>MXN</small>
                      </div>
                    </label>

                    <label>
                      <span>Por cada compra de</span>

                      <div className="money-field">
                        <b>$</b>

                        <input
                          type="number"
                          min={0.01}
                          step={0.01}
                          value={form.cashbackAmountRequired}
                          onChange={(event) =>
                            updateField(
                              "cashbackAmountRequired",
                              normalizeNumericInput(event.target.value),
                            )
                          }
                          required
                        />

                        <small>MXN</small>
                      </div>
                    </label>

                    <div className="full-field">
                      <small className="field-help">
                        Por cada ${form.cashbackAmountRequired || 0} MXN
                        gastados se entregarán ${form.cashbackAmount || 0} MXN
                        de cashback.
                      </small>
                    </div>
                  </>
                )}

                <label className="full-field">
                  <span>Saldo mínimo para utilizar cashback</span>

                  <div className="money-field">
                    <b>$</b>

                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.minimumCashbackRedemption}
                      onChange={(event) =>
                        updateField(
                          "minimumCashbackRedemption",
                          normalizeNumericInput(event.target.value),
                        )
                      }
                      required
                    />

                    <small>MXN</small>
                  </div>

                  <small className="field-help">
                    El cliente podrá usar su saldo cuando acumule al menos esta
                    cantidad.
                  </small>
                </label>
              </div>
            </section>
          )}

          {isCouponProgram && (
            <section className="settings-card">
              <div className="settings-card-heading">
                <span>
                  <Ticket size={19} />
                </span>

                <div>
                  <h2>Cupón</h2>
                  <p>Configura el beneficio, vigencia y condiciones.</p>
                </div>
              </div>

              <div className="settings-fields reward-fields">
                <label>
                  <span>Tipo de beneficio</span>

                  <select
                    value={form.couponBenefitType}
                    onChange={(event) =>
                      updateField(
                        "couponBenefitType",
                        Number(event.target.value),
                      )
                    }
                  >
                    <option value={1}>Descuento porcentual</option>
                    <option value={2}>Descuento en pesos</option>
                    <option value={3}>Producto gratis</option>
                    <option value={4}>Beneficio personalizado</option>
                  </select>
                </label>

                {(form.couponBenefitType === 1 ||
                  form.couponBenefitType === 2) && (
                  <label>
                    <span>
                      {form.couponBenefitType === 1
                        ? "Porcentaje de descuento"
                        : "Cantidad de descuento"}
                    </span>

                    <div className="money-field">
                      {form.couponBenefitType === 2 && <b>$</b>}

                      <input
                        type="number"
                        min={0.01}
                        max={form.couponBenefitType === 1 ? 100 : undefined}
                        step={0.01}
                        value={form.couponBenefitValue}
                        onChange={(event) =>
                          updateField(
                            "couponBenefitValue",
                            normalizeNumericInput(event.target.value),
                          )
                        }
                        required
                      />

                      <small>
                        {form.couponBenefitType === 1 ? "%" : "MXN"}
                      </small>
                    </div>
                  </label>
                )}

                <label>
                  <span>Compra mínima</span>

                  <div className="money-field">
                    <b>$</b>

                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.couponMinimumPurchase}
                      onChange={(event) =>
                        updateField(
                          "couponMinimumPurchase",
                          normalizeNumericInput(event.target.value),
                        )
                      }
                    />

                    <small>MXN</small>
                  </div>
                </label>

                {form.couponBenefitType === 1 && (
                  <label>
                    <span>Descuento máximo</span>

                    <div className="money-field">
                      <b>$</b>

                      <input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={form.couponMaximumDiscount}
                        onChange={(event) =>
                          updateField(
                            "couponMaximumDiscount",
                            normalizeNumericInput(event.target.value),
                          )
                        }
                        placeholder="Sin límite"
                      />

                      <small>MXN</small>
                    </div>
                  </label>
                )}

                <label>
                  <span>Tipo de vencimiento</span>

                  <select
                    value={form.couponExpirationType}
                    onChange={(event) =>
                      updateField(
                        "couponExpirationType",
                        Number(event.target.value),
                      )
                    }
                  >
                    <option value={1}>Fecha fija</option>
                    <option value={2}>Días después de entregarlo</option>
                    <option value={3}>Sin vencimiento</option>
                  </select>
                </label>

                {form.couponExpirationType === 1 && (
                  <label>
                    <span>Fecha de vencimiento</span>

                    <input
                      type="datetime-local"
                      value={form.couponFixedExpirationAt}
                      onChange={(event) =>
                        updateField(
                          "couponFixedExpirationAt",
                          event.target.value,
                        )
                      }
                      required
                    />
                  </label>
                )}

                {form.couponExpirationType === 2 && (
                  <label>
                    <span>Días de vigencia</span>

                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={form.couponValidityDays}
                      onChange={(event) =>
                        updateField(
                          "couponValidityDays",
                          normalizeNumericInput(event.target.value),
                        )
                      }
                      required
                    />
                  </label>
                )}

                <label>
                  <span>Usos permitidos</span>

                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={form.couponUsageLimit}
                    onChange={(event) =>
                      updateField(
                        "couponUsageLimit",
                        normalizeNumericInput(event.target.value),
                      )
                    }
                    required
                  />
                </label>

                <label className="full-field">
                  <span>Términos y condiciones</span>

                  <textarea
                    value={form.couponTerms}
                    onChange={(event) =>
                      updateField("couponTerms", event.target.value)
                    }
                    rows={3}
                    maxLength={1000}
                    placeholder="Ej. No acumulable con otras promociones."
                  />
                </label>
              </div>
            </section>
          )}

          {usesTraditionalReward && (
            <section className="settings-card">
              <div className="settings-card-heading">
                <span>
                  <Gift size={19} />
                </span>

                <div>
                  <h2>Recompensa</h2>
                  <p>Define qué recibe el cliente.</p>
                </div>
              </div>

              <div className="settings-fields reward-fields">
                {isStampProgram ? (
                  <label>
                    <span>Sellos requeridos</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      step={1}
                      value={form.targetValue}
                      onChange={(event) =>
                        updateField(
                          "targetValue",
                          normalizeNumericInput(event.target.value),
                        )
                      }
                      required
                    />
                  </label>
                ) : (
                  <>
                    {form.pointsEarningMethod === 1 && (
                      <label>
                        <span>Por cada compra de</span>
                        <div className="money-field">
                          <b>$</b>
                          <input
                            type="number"
                            min={0.01}
                            step={0.01}
                            value={form.amountRequired}
                            onChange={(event) =>
                              updateField(
                                "amountRequired",
                                normalizeNumericInput(event.target.value),
                              )
                            }
                            required
                          />
                          <small>MXN</small>
                        </div>
                      </label>
                    )}

                    <label>
                      <span>
                        {form.pointsEarningMethod === 2
                          ? "Puntos por visita"
                          : "Puntos otorgados"}
                      </span>
                      <input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={form.pointsEarned}
                        onChange={(event) =>
                          updateField(
                            "pointsEarned",
                            normalizeNumericInput(event.target.value),
                          )
                        }
                        required
                      />
                    </label>

                    <label className="full-field">
                      <span>Puntos necesarios para la recompensa</span>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={form.targetValue}
                        onChange={(event) =>
                          updateField(
                            "targetValue",
                            normalizeNumericInput(event.target.value),
                          )
                        }
                        required
                      />
                      <small className="field-help">
                        {form.pointsEarningMethod === 2
                          ? `Cada visita otorgará ${form.pointsEarned || 0} puntos.`
                          : `Por cada $${form.amountRequired || 0} MXN se otorgarán ${form.pointsEarned || 0} puntos.`}
                      </small>
                    </label>
                  </>
                )}

                <label>
                  <span>Nombre de la recompensa</span>

                  <input
                    value={form.rewardName}
                    onChange={(event) =>
                      updateField("rewardName", event.target.value)
                    }
                    placeholder="Ej. Café gratis"
                    maxLength={100}
                    required
                  />
                </label>

                <label>
                  <span>Tipo de recompensa</span>
                  <select
                    value={form.rewardType}
                    onChange={(event) =>
                      updateField("rewardType", Number(event.target.value))
                    }
                  >
                    <option value={1}>Producto o beneficio</option>
                    <option value={2}>Descuento en pesos</option>
                    <option value={3}>Descuento porcentual</option>
                  </select>
                </label>

                {(form.rewardType === 2 || form.rewardType === 3) && (
                  <label>
                    <span>
                      {form.rewardType === 2
                        ? "Valor del descuento"
                        : "Porcentaje de descuento"}
                    </span>
                    <div className="money-field">
                      {form.rewardType === 2 && <b>$</b>}
                      <input
                        type="number"
                        min={0.01}
                        max={form.rewardType === 3 ? 100 : undefined}
                        step={0.01}
                        value={form.rewardValue}
                        onChange={(event) =>
                          updateField(
                            "rewardValue",
                            normalizeNumericInput(event.target.value),
                          )
                        }
                        required
                      />
                      <small>{form.rewardType === 2 ? "MXN" : "%"}</small>
                    </div>
                  </label>
                )}

                <label className="full-field">
                  <span>Descripción de la recompensa</span>

                  <textarea
                    value={form.rewardDescription}
                    onChange={(event) =>
                      updateField("rewardDescription", event.target.value)
                    }
                    rows={2}
                    maxLength={250}
                  />
                </label>

                <label className="settings-toggle full-field">
                  <input
                    type="checkbox"
                    checked={form.isRecurring}
                    onChange={(event) =>
                      updateField("isRecurring", event.target.checked)
                    }
                  />

                  <span className="toggle-control" />

                  <span>
                    <strong>Reiniciar después del canje</strong>

                    <br />
                    <small>
                      El cliente podrá comenzar otra tarjeta al recibir su
                      premio.
                    </small>
                  </span>
                </label>
              </div>
            </section>
          )}

          <section className="settings-card">
            <div className="settings-card-heading">
              <span>
                <Palette size={19} />
              </span>

              <div>
                <h2>Colores</h2>

                <p>Ajusta la identidad visual.</p>
              </div>
            </div>

            <div className="color-fields">
              <label>
                <span>Fondo</span>

                <div className="color-input">
                  <input
                    type="color"
                    value={form.cardBackgroundColor}
                    onChange={(event) =>
                      updateField("cardBackgroundColor", event.target.value)
                    }
                  />

                  <strong>{form.cardBackgroundColor}</strong>
                </div>
              </label>

              <label>
                <span>Texto</span>

                <div className="color-input">
                  <input
                    type="color"
                    value={form.cardForegroundColor}
                    onChange={(event) =>
                      updateField("cardForegroundColor", event.target.value)
                    }
                  />

                  <strong>{form.cardForegroundColor}</strong>
                </div>
              </label>

              <label>
                <span>Etiquetas</span>

                <div className="color-input">
                  <input
                    type="color"
                    value={form.cardLabelColor}
                    onChange={(event) =>
                      updateField("cardLabelColor", event.target.value)
                    }
                  />

                  <strong>{form.cardLabelColor}</strong>
                </div>
              </label>
            </div>
          </section>

          <section className="settings-card">
            <div className="settings-card-heading">
              <span>
                <ImageIcon size={19} />
              </span>

              <div>
                <h2>Imágenes</h2>

                <p>PNG, JPG o WebP de máximo 5 MB.</p>
              </div>
            </div>

            <div className="image-upload-grid">
              <label className="image-upload">
                <span>Logo de la tarjeta</span>

                <div>
                  {previews.logo ? (
                    <img src={previews.logo} alt="Logo actual" />
                  ) : (
                    <ImageIcon size={24} />
                  )}

                  <strong>
                    <Upload size={15} />
                    Cambiar
                  </strong>
                </div>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => selectImage("logo", "logo", event)}
                />
              </label>

              {isStampProgram && (
                <>
                  <label className="image-upload">
                    <span>Sello activo</span>

                    <div>
                      {previews.activeStamp ? (
                        <img src={previews.activeStamp} alt="Sello activo" />
                      ) : (
                        <Stamp size={24} />
                      )}

                      <strong>
                        <Upload size={15} />
                        Cambiar
                      </strong>
                    </div>

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) =>
                        selectImage("activeStamp", "activeStamp", event)
                      }
                    />
                  </label>

                  <label className="image-upload">
                    <span>Sello inactivo</span>

                    <div>
                      {previews.inactiveStamp ? (
                        <img
                          src={previews.inactiveStamp}
                          alt="Sello inactivo"
                        />
                      ) : (
                        <Stamp size={24} />
                      )}

                      <strong>
                        <Upload size={15} />
                        Cambiar
                      </strong>
                    </div>

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) =>
                        selectImage("inactiveStamp", "inactiveStamp", event)
                      }
                    />
                  </label>
                </>
              )}
              <div className="full-field">
                <div className="settings-card-heading">
                  <div>
                    <h3>Diseño de la parte central</h3>
                    <p>
                      Usa una imagen para Wallet o conserva un bloque de color.
                    </p>
                  </div>
                </div>

                <div className="program-type-grid">
                  <button
                    type="button"
                    className={
                      form.stripDesignMode === "image" ? "selected" : ""
                    }
                    onClick={() => updateField("stripDesignMode", "image")}
                  >
                    <span>
                      <ImageIcon size={22} />
                    </span>
                    <strong>Usar imagen</strong>
                    <small>PNG · mínimo 1125 × 432 px · máximo 3 MB.</small>
                  </button>

                  <button
                    type="button"
                    className={
                      form.stripDesignMode === "color" ? "selected" : ""
                    }
                    onClick={() => updateField("stripDesignMode", "color")}
                  >
                    <span>
                      <Palette size={22} />
                    </span>
                    <strong>Usar color</strong>
                    <small>Aplica un color sólido al área central.</small>
                  </button>
                </div>

                {form.stripDesignMode === "image" ? (
                  <label className="image-upload">
                    <span>Imagen central</span>

                    <div>
                      {previews.stripImage ? (
                        <img
                          src={previews.stripImage}
                          alt="Imagen central actual"
                        />
                      ) : (
                        <ImageIcon size={24} />
                      )}

                      <strong>
                        <Upload size={15} />
                        {previews.stripImage ? "Cambiar" : "Seleccionar PNG"}
                      </strong>
                    </div>

                    <input
                      type="file"
                      accept="image/png"
                      onChange={selectStripImage}
                    />
                  </label>
                ) : (
                  <label>
                    <span>Color de la parte central</span>
                    <div className="color-input">
                      <input
                        type="color"
                        value={form.cardStripColor}
                        onChange={(event) =>
                          updateField("cardStripColor", event.target.value)
                        }
                      />
                      <strong>{form.cardStripColor}</strong>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* <label className="settings-toggle powered-toggle">
              <input
                type="checkbox"
                checked={form.showPoweredByFidara}
                onChange={(event) =>
                  updateField("showPoweredByFidara", event.target.checked)
                }
              />

              <span className="toggle-control" />

              <span>
                <strong>Mostrar Powered by Fidara</strong>

                <small>Aparecerá junto al código QR.</small>
              </span>
            </label> */}
          </section>
        </form>

        <aside className="wallet-preview-column">
          <div className="wallet-preview-sticky">
            <div className="wallet-preview-heading">
              <span className="page-eyebrow">Vista previa</span>
              <div className="wallet-platform-switch" role="group" aria-label="Plataforma de vista previa">
                <button
                  type="button"
                  className={walletPreviewPlatform === "apple" ? "selected" : ""}
                  aria-label="Apple Wallet"
                  aria-pressed={walletPreviewPlatform === "apple"}
                  title="Apple Wallet"
                  onClick={() => setWalletPreviewPlatform("apple")}
                >
                  <Apple size={19} />
                </button>
                <button
                  type="button"
                  className={walletPreviewPlatform === "google" ? "selected" : ""}
                  aria-label="Google Wallet"
                  aria-pressed={walletPreviewPlatform === "google"}
                  title="Google Wallet"
                  onClick={() => setWalletPreviewPlatform("google")}
                >
                  <AndroidWalletIcon />
                </button>
              </div>
            </div>

            <WalletCardPreview
              platform={walletPreviewPlatform}
              name={form.name}
              programType={form.programType}
              logoUrl={previews.logo}
              activeStampUrl={previews.activeStamp}
              inactiveStampUrl={previews.inactiveStamp}
              backgroundColor={form.cardBackgroundColor}
              foregroundColor={form.cardForegroundColor}
              labelColor={form.cardLabelColor}
              targetValue={
                isCashbackProgram || isCouponProgram || isGiftCardProgram
                  ? null
                  : Number(form.targetValue) || 0
              }
              pointsEarned={Number(form.pointsEarned) || 0}
              amountRequired={Number(form.amountRequired) || 0}
              pointsEarningMethod={form.pointsEarningMethod}
              cashbackEarningMethod={form.cashbackEarningMethod}
              cashbackPercentage={Number(form.cashbackPercentage) || 0}
              cashbackAmount={Number(form.cashbackAmount) || 0}
              cashbackAmountRequired={Number(form.cashbackAmountRequired) || 0}
              minimumCashbackRedemption={
                Number(form.minimumCashbackRedemption) || 0
              }
              couponBenefitType={form.couponBenefitType}
              couponBenefitValue={Number(form.couponBenefitValue) || 0}
              couponMinimumPurchase={Number(form.couponMinimumPurchase) || 0}
              couponMaximumDiscount={
                form.couponMaximumDiscount
                  ? Number(form.couponMaximumDiscount)
                  : null
              }
              couponExpirationType={form.couponExpirationType}
              couponValidityDays={Number(form.couponValidityDays) || 0}
              couponFixedExpirationAt={
                form.couponFixedExpirationAt || null
              }
              couponUsageLimit={Number(form.couponUsageLimit) || 1}
              couponTerms={form.couponTerms}
              currency="MXN"
              stripImageUrl={
                form.stripDesignMode === "image" ? previews.stripImage : null
              }
              stripColor={form.cardStripColor}
              balance={
                isCashbackProgram
                  ? 40
                  : isGiftCardProgram
                    ? form.giftCardPresetAmounts.find((preset) => preset.isActive)?.amount ?? 0
                  : isCouponProgram
                    ? 0
                    : isPointsProgram
                      ? Math.min(Number(form.targetValue) || 0, 40)
                      : 4
              }
              rewardsAvailable={0}
              showPoweredByFidara={form.showPoweredByFidara}
            />

            <p className="preview-note">
              Esta vista es aproximada. {walletPreviewPlatform === "apple" ? "Apple Wallet" : "Google Wallet"} ajusta algunos detalles según el dispositivo.
            </p>
          </div>
          {joinUrl && program && (
            <section className="join-share-panel">
              <div className="join-share-heading">
                <span className="page-eyebrow">Comparte tu tarjeta</span>

                <h2>Enlace de inscripción</h2>

                <p>
                  Tus clientes pueden escanear este código para obtener la
                  tarjeta.
                </p>
              </div>

              <div className="join-share-qr">
                <QRCodeSVG
                  value={joinUrl}
                  size={210}
                  level="H"
                  marginSize={2}
                  bgColor="#ffffff"
                  fgColor="#111111"
                  title={`Unirse a ${program.name}`}
                />
              </div>

              <div className="join-url-field">
                <span>{joinUrl}</span>

                <button
                  type="button"
                  onClick={() => void copyJoinUrl()}
                  aria-label="Copiar enlace"
                >
                  {linkCopied ? <Check size={17} /> : <Copy size={17} />}
                </button>
              </div>

              <div className="join-share-actions">
                <a
                  href={joinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="open-join-button"
                >
                  <ExternalLink size={17} />
                  Abrir enlace
                </a>

                <a
                  href={`/material/${program.id}?print=1`}
                  target="_blank"
                  rel="noreferrer"
                  className="pdf-material-button"
                >
                  <FileDown size={17} />
                  Descargar PDF
                </a>
              </div>
            </section>
          )}
        </aside>
      </div>

      {subscriptionsEnabled &&
        isSubscriptionProgram &&
        savedSubscriptionProgramId && (
          <SubscriptionProgramPanel programId={savedSubscriptionProgramId} />
        )}

      {isGiftCardProgram && program && (
        <div id="venta-gift-card" className="mt-6 scroll-mt-6">
          <GiftCardSalePanel programId={program.id} />
        </div>
      )}
    </div>
  );
}
