export const subscriptionsEnabled =
  process.env.NEXT_PUBLIC_FIDARA_SUBSCRIPTIONS_ENABLED === "true";

const GUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidSubscriptionProgramId(
  value: string | null | undefined,
): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value !== "new" &&
    value !== "nueva" &&
    value !== "00000000-0000-0000-0000-000000000000" &&
    GUID_PATTERN.test(value)
  );
}

export type MembershipPeriod = {
  unit: 1 | 2 | 3 | 4;
  count: number;
};

export type MembershipPlanBenefit = {
  id?: string;
  type: 1 | 2 | 3;
  name: string;
  description?: string | null;
  usageLimit?: number | null;
  resetPeriod?: MembershipPeriod | null;
  carryOver: boolean;
  discountPercent?: number | null;
  minimumPurchase?: number | null;
  maximumDiscount?: number | null;
};

export type MembershipPlan = {
  id: string;
  programId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  rowVersion: string;
  currentVersion: {
    id: string;
    version: number;
    price: number;
    currency: string;
    billingPeriod: MembershipPeriod;
    validity: MembershipPeriod;
    publishedAtUtc: string;
    benefits: MembershipPlanBenefit[];
  };
};

export type MembershipPaymentOperation = {
  membershipId: string;
  paymentId: string;
  planId: string;
  planVersion: number;
  operationType: 1 | 2;
  paymentStatus: number;
  amount: number;
  currency: string;
  proposedStartsAtUtc: string;
  proposedEndsAtUtc: string;
  startsOnPaymentConfirmation: boolean;
  membershipRowVersion: string;
  replayed: boolean;
};

export type MembershipBenefitAvailability = MembershipPlanBenefit & {
  entitlementId: string;
  usedInWindow: number;
  remainingUses?: number | null;
  windowStartsAtUtc: string;
  windowEndsAtUtc: string;
  available: boolean;
};

export type MembershipLookup = {
  membershipId: string;
  loyaltyCardId: string;
  customerId: string;
  customerName: string;
  programId: string;
  programName: string;
  membershipStatus: 1 | 2 | 3 | 4;
  termId: string;
  planId: string;
  planName: string;
  planVersion: number;
  startsAtUtc: string;
  endsAtUtc: string;
  benefits: MembershipBenefitAvailability[];
};

export type MembershipListItem = {
  id: string;
  programId: string;
  programName: string;
  customerId: string;
  customerName: string;
  status: 1 | 2 | 3 | 4;
  currentPlanName?: string | null;
  currentTermStartsAtUtc?: string | null;
  currentTermEndsAtUtc?: string | null;
  createdAtUtc: string;
};

export type MembershipDetail = MembershipListItem & {
  loyaltyCardId: string;
  activatedAtUtc?: string | null;
  cancelledAtUtc?: string | null;
  rowVersion: string;
  terms: Array<{
    id: string;
    planId: string;
    planName: string;
    status: number;
    startsAtUtc: string;
    endsAtUtc: string;
  }>;
  payments: Array<{
    id: string;
    operationType: 1 | 2;
    status: number;
    amount: number;
    currency: string;
    confirmedAtUtc?: string | null;
  }>;
};

export type ApiEnvelope<T> = {
  success?: boolean;
  code?: string;
  message?: string;
  data?: T;
};

export function membershipStatusLabel(status: number) {
  return (
    { 1: "Pendiente", 2: "Activa", 3: "Vencida", 4: "Cancelada" }[
      status
    ] ?? "Desconocida"
  );
}

export function periodLabel(period: MembershipPeriod) {
  const unit =
    {
      1: period.count === 1 ? "día" : "días",
      2: period.count === 1 ? "semana" : "semanas",
      3: period.count === 1 ? "mes" : "meses",
      4: period.count === 1 ? "año" : "años",
    }[period.unit] ?? "periodos";
  return `${period.count} ${unit}`;
}
