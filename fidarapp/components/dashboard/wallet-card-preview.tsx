"use client";

import { QRCodeSVG } from "qrcode.react";

type WalletCardPreviewProps = {
  name: string;
  logoUrl?: string | null;
  activeStampUrl?: string | null;
  inactiveStampUrl?: string | null;
  backgroundColor?: string | null;
  foregroundColor?: string | null;
  labelColor?: string | null;
  targetValue: number;
  balance?: number;
  rewardsAvailable?: number;
  showPoweredByFidara: boolean;
  compact?: boolean;
  phoneFrame?: boolean;
};

export function WalletCardPreview({
  name,
  logoUrl,
  activeStampUrl,
  inactiveStampUrl,
  backgroundColor = "#1b6726",
  foregroundColor = "#ffffff",
  labelColor = "#f5f1e8",
  targetValue,
  balance = 4,
  rewardsAvailable = 0,
  showPoweredByFidara,
  compact = false,
  phoneFrame = false,
}: WalletCardPreviewProps) {
  const target = Math.max(1, Math.round(Number(targetValue) || 10));

  const currentBalance = Math.max(0, Math.min(Number(balance) || 0, target));

  const visibleStamps = Math.min(target, 10);

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
          <img src={logoUrl} alt={`Logo de ${name}`} />
        ) : (
          <strong>{name || "Tu programa"}</strong>
        )}
      </div>

      <div className="wallet-stamps-preview">
        {Array.from({
          length: visibleStamps,
        }).map((_, index) => {
          const completed = index < currentBalance;

          const imageUrl = completed ? activeStampUrl : inactiveStampUrl;

          return (
            <span key={index} className={completed ? "active" : "inactive"}>
              {imageUrl ? (
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

      <div className="wallet-preview-stats">
        <div>
          <small
            style={{
              color: labelColor || "#f5f1e8",
            }}
          >
            TU PROGRESO
          </small>

          <strong>
            {currentBalance} de {target}
          </strong>
        </div>

        <div>
          <small
            style={{
              color: labelColor || "#f5f1e8",
            }}
          >
            RECOMPENSAS DISPONIBLES
          </small>

          <strong>
            {rewardsAvailable}{" "}
            {rewardsAvailable === 1 ? "recompensa" : "recompensas"}
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
