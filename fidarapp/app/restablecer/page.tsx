"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import styles from "../password-recovery.module.css";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!token) return setError("El enlace de recuperación no es válido.");
    if (password.length < 8) return setError("La contraseña debe contener al menos 8 caracteres.");
    if (password !== confirmation) return setError("Las contraseñas no coinciden.");

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "No fue posible actualizar la contraseña.");

      setSuccess(payload.message ?? "Tu contraseña se actualizó correctamente.");
      setPassword("");
      setConfirmation("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible actualizar la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell mode="login">
      <div className="form-wrap">
        <span className="form-kicker">Nueva contraseña</span>
        <h2>Protege tu acceso.</h2>
        <p className="form-intro">Crea una contraseña nueva para volver a administrar tu negocio.</p>

        {success ? (
          <>
            <div className={`${styles.message} ${styles.success}`}>{success}</div>
            <Link className={styles.backLink} href="/login">Ir a iniciar sesión →</Link>
          </>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            {!token && <div className={`${styles.message} ${styles.error}`}>El enlace no contiene un token de recuperación válido.</div>}

            <label className={styles.field}>
              <span>Nueva contraseña</span>
              <input required minLength={8} autoComplete="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>

            <label className={styles.field}>
              <span>Confirmar contraseña</span>
              <input required minLength={8} autoComplete="new-password" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
            </label>

            <p className={styles.passwordHelp}>Utiliza al menos 8 caracteres y evita reutilizar contraseñas de otros servicios.</p>
            {error && <div className={`${styles.message} ${styles.error}`}>{error}</div>}

            <button className={styles.submit} type="submit" disabled={loading || !token}>
              {loading ? "Actualizando…" : "Guardar nueva contraseña"}
            </button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Cargando…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
