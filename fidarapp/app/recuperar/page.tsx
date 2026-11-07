"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import styles from "../password-recovery.module.css";

export default function RecoverPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "No fue posible procesar la solicitud.");
      }

      setSuccess(payload.message ?? "Si existe una cuenta con ese correo, recibirás instrucciones para recuperar tu acceso.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible procesar la solicitud.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell mode="login">
      <div className="form-wrap">
        <span className="form-kicker">Recuperar acceso</span>
        <h2>Volvamos a entrar.</h2>
        <p className="form-intro">
          Escribe el correo asociado a tu cuenta. Te enviaremos un enlace para crear una contraseña nueva.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>Correo electrónico</span>
            <input required autoComplete="email" inputMode="email" type="email" value={email} placeholder="tu@negocio.com" onChange={(event) => setEmail(event.target.value)} />
          </label>

          {error && <div className={`${styles.message} ${styles.error}`}>{error}</div>}
          {success && <div className={`${styles.message} ${styles.success}`}>{success}</div>}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? "Enviando…" : "Enviar enlace de recuperación"}
          </button>
        </form>

        <Link className={styles.backLink} href="/login">← Volver a iniciar sesión</Link>
      </div>
    </AuthShell>
  );
}
