import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
export default function RecoverPage() {
  return (
    <AuthShell mode="login">
      <div className="form-wrap">
        <span className="form-kicker">Recuperar acceso</span>
        <h2>Volvamos a entrar.</h2>
        <p className="form-intro">
          Esta pantalla queda preparada para conectarla al endpoint de
          recuperación de contraseña cuando lo agreguemos.
        </p>
        <Link className="text-link" href="/login">
          ← Volver a iniciar sesión
        </Link>
      </div>
    </AuthShell>
  );
}
