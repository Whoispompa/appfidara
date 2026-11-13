"use client";

import { Banknote, Coins } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type WalletCardPreviewProps = {
  name: string;
  programType?: number;

  logoUrl?: string | null;
  activeStampUrl?: string | null;
  inactiveStampUrl?: string | null;

  backgroundColor?: string | null;
  foregroundColor?: string | null;
  labelColor?: string | null;

  targetValue?: number | null;

  pointsEarned?: number;
  amountRequired?: number;
  pointsEarningMethod?: number;

  cashbackEarningMethod?: number;
  cashbackPercentage?: number;
  cashbackAmount?: number;
  cashbackAmountRequired?: number;
  minimumCashbackRedemption?: number;
  currency?: string;

  stripImageUrl?: string | null;
  stripColor?: string | null;

  balance?: number;
  rewardsAvailable?: number;

  showPoweredByFidara: boolean;
  compact?: boolean;
  phoneFrame?: boolean;
};

const moneyFormatter = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function WalletCardPreview({
  name,
  programType = 1,

  logoUrl,
  activeStampUrl,
  inactiveStampUrl,

  backgroundColor = "#1b6726",
  foregroundColor = "#ffffff",
  labelColor = "#f5f1e8",

  targetValue,

  pointsEarned = 1,
  amountRequired = 10,
  pointsEarningMethod = 1,

  cashbackEarningMethod = 1,
  cashbackPercentage = 5,
  cashbackAmount = 10,
  cashbackAmountRequired = 200,
  minimumCashbackRedemption = 50,
  currency = "MXN",

  stripImageUrl,
  stripColor = "#14532d",

  balance = 4,
  rewardsAvailable = 0,

  showPoweredByFidara,
  compact = false,
  phoneFrame = false,
}: WalletCardPreviewProps) {
  const isStampProgram = programType === 1;
  const isPointsProgram = programType === 2;
  const isCashbackProgram = programType === 3;

  const numericBalance = Math.max(0, Number(balance) || 0);

  const target = Math.max(
    1,
    Number(targetValue) || (isPointsProgram ? 100 : 10),
  );

  const progressBalance = Math.min(numericBalance, target);

  const visibleStamps = Math.min(Math.round(target), 10);

  const pointsProgress = Math.min((progressBalance / target) * 100, 100);

  const minimumRedemption = Math.max(0, Number(minimumCashbackRedemption) || 0);

  const cashbackProgress =
    minimumRedemption > 0
      ? Math.min((numericBalance / minimumRedemption) * 100, 100)
      : 100;

  const cashbackAvailable =
    minimumRedemption === 0 || numericBalance >= minimumRedemption;

  const centralAreaStyle = {
    backgroundColor: stripImageUrl ? undefined : stripColor || "#14532d",

    backgroundImage: stripImageUrl
      ? `linear-gradient(
          rgba(0, 0, 0, 0.3),
          rgba(0, 0, 0, 0.3)
        ),
        url("${stripImageUrl}")`
      : undefined,

    backgroundPosition: "center",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
  };

  const pointsRule =
    pointsEarningMethod === 2
      ? `${Number(pointsEarned) || 0} puntos por visita`
      : `${Number(pointsEarned) || 0} puntos por cada $${Number(
          amountRequired,
        ).toLocaleString("es-MX")} ${currency}`;

  const cashbackRule =
    cashbackEarningMethod === 2
      ? `$${moneyFormatter.format(
          Number(cashbackAmount) || 0,
        )} por cada $${moneyFormatter.format(
          Number(cashbackAmountRequired) || 0,
        )} gastados`
      : `${Number(cashbackPercentage) || 0}% de cashback por compra`;

  const card = (
    <div
      className={`wallet-card-preview ${compact ? "compact" : ""}`}
      style={{
        backgroundColor: backgroundColor || "#1b6726",
        color: foregroundColor || "#ffffff",
      }}
    >
      <div className="wallet-preview-top">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={`Logo de ${name}`} />
        ) : (
          <strong>{name || "Tu programa"}</strong>
        )}
      </div>

      {isPointsProgram && (
        <div className="wallet-points-preview" style={centralAreaStyle}>
          <span className="wallet-points-icon" aria-hidden="true">
            <Coins size={compact ? 20 : 28} />
          </span>

          <div className="wallet-points-copy">
            <small style={{ color: labelColor || "#f5f1e8" }}>
              PUNTOS DISPONIBLES
            </small>

            <strong>{progressBalance.toLocaleString("es-MX")} puntos</strong>

            <span>{pointsRule}</span>
          </div>

          <div
            className="wallet-points-progress"
            aria-label={`${pointsProgress}% de progreso`}
          >
            <span style={{ width: `${pointsProgress}%` }} />
          </div>
        </div>
      )}

      {isCashbackProgram && (
        <div
          className="wallet-points-preview wallet-cashback-preview"
          style={centralAreaStyle}
        >
          <span className="wallet-points-icon" aria-hidden="true">
            <Banknote size={compact ? 20 : 28} />
          </span>

          <div className="wallet-points-copy">
            <small style={{ color: labelColor || "#f5f1e8" }}>
              SALDO CASHBACK
            </small>

            <strong>
              ${moneyFormatter.format(numericBalance)} {currency}
            </strong>

            <span>{cashbackRule}</span>
          </div>

          <div
            className="wallet-points-progress"
            aria-label={`${cashbackProgress}% del mínimo para usar`}
          >
            <span style={{ width: `${cashbackProgress}%` }} />
          </div>
        </div>
      )}

      {isStampProgram && (
        <div className="wallet-stamps-preview" style={centralAreaStyle}>
          {Array.from({ length: visibleStamps }).map((_, index) => {
            const completed = index < progressBalance;

            const imageUrl = completed ? activeStampUrl : inactiveStampUrl;

            return (
              <span key={index} className={completed ? "active" : "inactive"}>
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={completed ? "Sello acumulado" : "Sello pendiente"}
                  />
                ) : (
                  <span className="stamp-placeholder" />
                )}
              </span>
            );
          })}
        </div>
      )}

      <div className="wallet-preview-stats">
        <div>
          <small style={{ color: labelColor || "#f5f1e8" }}>
            {isCashbackProgram
              ? "MÍNIMO PARA USAR"
              : isPointsProgram
                ? "META DE PUNTOS"
                : "TU PROGRESO"}
          </small>

          <strong>
            {isCashbackProgram
              ? `$${moneyFormatter.format(minimumRedemption)} ${currency}`
              : isPointsProgram
                ? `${target.toLocaleString("es-MX")} puntos`
                : `${progressBalance} de ${target}`}
          </strong>
        </div>

        <div>
          <small style={{ color: labelColor || "#f5f1e8" }}>
            {isCashbackProgram
              ? "DISPONIBLE PARA USAR"
              : "RECOMPENSAS DISPONIBLES"}
          </small>

          <strong>
            {isCashbackProgram
              ? cashbackAvailable
                ? `$${moneyFormatter.format(numericBalance)} ${currency}`
                : "Aún no"
              : `${rewardsAvailable} ${
                  rewardsAvailable === 1 ? "recompensa" : "recompensas"
                }`}
          </strong>
        </div>
      </div>

      <div className="wallet-qr-preview">
        <QRCodeSVG
          value="https://fidara.mx"
          size={compact ? 72 : 116}
          level="M"
          marginSize={1}
          bgColor="#ffffff"
          fgColor="#000000"
          title="Código QR de Fidara"
        />

        {showPoweredByFidara && <small>Powered by Fidara</small>}
      </div>
    </div>
  );

  if (!phoneFrame) {
    return card;
  }

  return (
    <div className="iphone-frame">
      <div className="iphone-dynamic-island" aria-hidden="true">
        <span />
      </div>

      <div className="iphone-screen">{card}</div>

      <div className="iphone-home-indicator" aria-hidden="true" />
    </div>
  );
}
