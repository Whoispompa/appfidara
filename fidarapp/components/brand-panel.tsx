import { FidaraLogo } from "./fidara-logo";
export function BrandPanel() {
  return (
    <aside className="brand-panel">
      <FidaraLogo />
      <div className="hero-copy">
        <span className="eyebrow">Lealtad que sí regresa</span>
        <h1>Convierte cada visita en una razón para volver.</h1>
        <p>
          Escanea, premia y mantén tu marca en el bolsillo de tus clientes con
          Apple Wallet y Google Wallet.
        </p>
      </div>
      <div className="wallet-stage" aria-hidden="true">
        <div className="wallet-halo" />
        <div className="pass-card">
          <div className="pass-top">
            <span className="pass-logo">
              <i>F</i> Café Nómada
            </span>
            <span>Lealtad</span>
          </div>
          <div className="stamps">
            {Array.from({ length: 10 }).map((_, index) => (
              <span
                key={index}
                className={`stamp ${index < 4 ? "active" : ""}`}
              >
                ✦
              </span>
            ))}
          </div>
          <div className="pass-stats">
            <span>
              <small>Tus visitas</small>
              <strong>4 sellos</strong>
            </span>
            <span>
              <small>Siguiente premio</small>
              <strong>Faltan 6</strong>
            </span>
          </div>
        </div>
      </div>
      <div className="trust-row">
        <span>
          <i className="trust-dot" /> Configura en minutos
        </span>
        <span>Apple Wallet</span>
        <span>Google Wallet</span>
      </div>
    </aside>
  );
}
