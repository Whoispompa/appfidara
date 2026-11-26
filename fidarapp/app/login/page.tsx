// Esta página es la de inicio de sesión de Fidara.
// Permite a los usuarios ingresar sus credenciales para acceder a su cuenta y administrar clientes, sellos y recompensas.
// Incluye validación de correo electrónico y contraseña, así como opciones para mostrar/ocultar la contraseña y mantener la sesión iniciada.

"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { toast } from "sonner";
import { AuthEntry, AuthField } from "@/components/auth-entry";
import styles from "@/components/auth-entry.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const saved = sessionStorage.getItem("fidara_registered_email");
    if (!saved) return;

    queueMicrotask(() => {
      setEmail(saved);
      sessionStorage.removeItem("fidara_registered_email");
      toast.success("Tu cuenta está lista", {
        description:
          "Tu negocio fue registrado correctamente. Inicia sesión para configurar tu programa.",
      });
    });
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email,
          password,
          remember,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.message ?? "No pudimos iniciar sesión. Revisa tus datos.",
        );
      }

      const sessionData = payload.data ?? {};

      sessionStorage.setItem("fidara_session", JSON.stringify(sessionData));

      const requestedPath = sessionData.nextPath;

      const nextPath =
        typeof requestedPath === "string" &&
        requestedPath.startsWith("/") &&
        !requestedPath.startsWith("//")
          ? requestedPath
          : "/dashboard";

      window.location.assign(nextPath);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Ocurrió un error inesperado.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <AuthEntry mode="login" title="Ingresa a tu panel">
      <form className="auth-form" onSubmit={submit}>
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
        <AuthField
          id="email"
          label="Correo electrónico"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <AuthField
          id="password"
          label="Contraseña"
          icon={LockKeyhole}
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          action={
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />
        <div className="form-meta">
          <label className="check-line">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />{" "}
            Mantener mi sesión
          </label>
          <Link className="text-link" href="/recuperar">
            Olvidé mi contraseña
          </Link>
        </div>
        <button className="submit-button" disabled={loading} aria-busy={loading}>
          {loading && <LoaderCircle className={styles.spinner} size={17} aria-hidden="true" />}
          {loading ? "Entrando…" : "Entrar a Fidara"}
        </button>
      </form>
      <p className="form-foot">
        Al continuar aceptas nuestros <a href="#">Términos</a> y{" "}
        <a href="#">Aviso de privacidad</a>.
      </p>
    </AuthEntry>
  );
}
