import { NextRequest } from "next/server";

import { proxyGiftCardRequest } from "@/lib/gift-card-bff";

type GiftCardRedeemBody = {
  purchaseAmount?: unknown;
  amount?: unknown;
  qrToken?: unknown;
  idempotencyKey?: unknown;
  complementaryPaymentConfirmed?: unknown;
  complementaryPaymentMethod?: unknown;
  complementaryPaymentReference?: unknown;
};

function hasCentPrecision(value: number) {
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-8;
}

function validateRedeemBody(body: Record<string, unknown>) {
  const request = body as GiftCardRedeemBody;
  const purchaseAmount = Number(request.purchaseAmount);
  const amount = Number(request.amount);

  if (
    typeof request.qrToken !== "string" ||
    !request.qrToken.trim() ||
    typeof request.idempotencyKey !== "string" ||
    !request.idempotencyKey.trim()
  ) {
    return {
      message: "Faltan los datos necesarios para identificar el canje.",
      code: "INVALID_REDEEM_REQUEST",
    };
  }

  if (
    typeof request.purchaseAmount !== "number" ||
    typeof request.amount !== "number" ||
    !Number.isFinite(purchaseAmount) ||
    !Number.isFinite(amount) ||
    purchaseAmount <= 0 ||
    amount <= 0 ||
    purchaseAmount < amount ||
    !hasCentPrecision(purchaseAmount) ||
    !hasCentPrecision(amount)
  ) {
    return {
      message:
        "La compra y el importe a descontar deben ser positivos, usar máximo dos decimales y la compra no puede ser menor al descuento.",
      code: "INVALID_AMOUNT",
    };
  }

  const hasComplement = purchaseAmount > amount;
  const method = request.complementaryPaymentMethod;
  const reference = request.complementaryPaymentReference;

  if (
    hasComplement &&
    (request.complementaryPaymentConfirmed !== true ||
      typeof method !== "number" ||
      ![1, 2, 3].includes(method))
  ) {
    return {
      message:
        "Confirma el cobro complementario y selecciona un método de pago válido.",
      code: "EXTERNAL_PAYMENT_CONFIRMATION_REQUIRED",
    };
  }

  if (
    hasComplement &&
    (method === 2 || method === 3) &&
    (typeof reference !== "string" || !reference.trim())
  ) {
    return {
      message:
        "La referencia del cobro complementario es obligatoria para tarjeta o transferencia.",
      code: "COMPLEMENTARY_PAYMENT_REFERENCE_REQUIRED",
    };
  }

  if (typeof reference === "string" && reference.trim().length > 150) {
    return {
      message:
        "La referencia del cobro complementario no puede superar 150 caracteres.",
      code: "FIELD_TOO_LONG",
    };
  }

  if (
    !hasComplement &&
    (request.complementaryPaymentConfirmed === true ||
      method != null ||
      (typeof reference === "string" && reference.trim()))
  ) {
    return {
      message:
        "No envíes datos de cobro complementario cuando la Gift Card cubre toda la compra.",
      code: "COMPLEMENTARY_PAYMENT_NOT_REQUIRED",
    };
  }

  return null;
}

export function POST(request: NextRequest) {
  return proxyGiftCardRequest(request, "/api/gift-cards/redeem", {
    method: "POST",
    requireLocation: true,
    validateBody: validateRedeemBody,
  });
}
