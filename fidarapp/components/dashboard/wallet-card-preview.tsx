"use client";

import { Coins } from "lucide-react";
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
  targetValue: number;
  pointsEarned?: number;
  amountRequired?: number;
  balance?: number;
  rewardsAvailable?: number;
  showPoweredByFidara: boolean;
  compact?: boolean;
  phoneFrame?: boolean;
};

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
  balance = 4,
  rewardsAvailable = 0,
  showPoweredByFidara,
  compact = false,
  phoneFrame = false,
}: WalletCardPreviewProps) {
  const isPointsProgram = programType === 2;
  const target = Math.max(1, Number(targetValue) || (isPointsProgram ? 100 : 10));
  const currentBalance = Math.max(0, Number(balance) || 0);
  const previewBalance = Math.min(currentBalance, target);
  const visibleStamps = Math.min(Math.round(target), 10);
  const progress = Math.min((previewBalance / target) * 100, 100);

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

      {isPointsProgram ? (
        <div className="wallet-points-preview">
          <span className="wallet-points-icon" aria-hidden="true">
            <Coins size={compact ? 20 : 28} />
          </span>

          <div className="wallet-points-copy">
            <small style={{ color: labelColor || "#f5f1e8" }}>
              PUNTOS DISPONIBLES
            </small>
            <strong>{previewBalance.toLocaleString("es-MX")} puntos</strong>
            <span>
              {Number(pointsEarned) || 0} puntos por cada ${Number(amountRequired || 0).toLocaleString("es-MX")} MXN
            </span>
          </div>

          <div className="wallet-points-progress" aria-label={`${progress}% de progreso`}>
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <div className="wallet-stamps-preview">
          {Array.from({ length: visibleStamps }).map((_, index) => {
            const completed = index < previewBalance;
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
            {isPointsProgram ? "META DE PUNTOS" : "TU PROGRESO"}
          </small>
          <strong>
            {isPointsProgram
              ? `${target.toLocaleString("es-MX")} puntos`
              : `${previewBalance} de ${target}`}
          </strong>
        </div>

        <div>
          <small style={{ color: labelColor || "#f5f1e8" }}>
            RECOMPENSAS DISPONIBLES
          </small>
          <strong>
            {rewardsAvailable} {rewardsAvailable === 1 ? "recompensa" : "recompensas"}
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

  if (!phoneFrame) return card;

  return (
    <div className="iphone-frame">
      <div className="iphone-dynamic-island" aria-hidden="true"><span /></div>
      <div className="iphone-screen">{card}</div>
      <div className="iphone-home-indicator" aria-hidden="true" />
    </div>
  );
}
