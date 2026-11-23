export const GIFT_CARD_COMPLEMENTARY_PAYMENT_ENABLED =
  process.env.NEXT_PUBLIC_GIFT_CARD_COMPLEMENTARY_PAYMENT_ENABLED === "true";

export type GiftCardComplementaryPaymentStatus = 0 | 1 | 2;

export function complementaryPaymentMethodLabel(method?: number | null) {
  if (method === 1) return "Efectivo";
  if (method === 2) return "Tarjeta";
  if (method === 3) return "Transferencia";
  return null;
}
