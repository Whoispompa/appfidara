import Link from "next/link";
import { BrandPanel } from "./brand-panel";
import { FidaraLogo } from "./fidara-logo";
export function AuthShell({
  mode,
  children,
}: {
  mode: "login" | "register";
  children: React.ReactNode;
}) {
  const registering = mode === "register";
  return (
    <main className={`auth-page ${registering ? "register-page" : ""}`}>
      <BrandPanel />
      <section className="form-panel">
        <nav className="form-nav" aria-label="Acceso">
          <FidaraLogo className="mobile-logo" />
          <span>
            {registering ? "¿Ya tienes una cuenta?" : "¿Aún no usas Fidara?"}
          </span>
          <Link href={registering ? "/login" : "/registro"}>
            {registering ? "Iniciar sesión" : "Crear cuenta"}
          </Link>
        </nav>
        {children}
      </section>
    </main>
  );
}
