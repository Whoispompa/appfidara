import { FidaraLogo } from "./fidara-logo";
export function BrandPanel({
  showLogo = true,
  children,
}: {
  showLogo?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <aside className="brand-panel">
      {showLogo && <FidaraLogo />}
      <div className="hero-copy">
        <h1>Convierte cada visita en una razón para volver.</h1>
      </div>

      {children}
    </aside>
  );
}
