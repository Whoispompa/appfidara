// Esta página es la de inicio de sesión de Fidara. 
// Permite a los usuarios ingresar sus credenciales para acceder a su cuenta y administrar clientes, sellos y recompensas. 
// Incluye validación de correo electrónico y contraseña, así como opciones para mostrar/ocultar la contraseña y mantener la sesión iniciada.


"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);
  useEffect(() => {
    const saved = sessionStorage.getItem("fidara_registered_email");
    if (saved)
      queueMicrotask(() => {
        setEmail(saved);
        setRegistered(true);
        sessionStorage.removeItem("fidara_registered_email");
      });
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          payload.message ?? "No pudimos iniciar sesión. Revisa tus datos.",
        );
      sessionStorage.setItem(
        "fidara_session",
        JSON.stringify(payload.data ?? {}),
      );
      window.location.href = "/dashboard";
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
    <AuthShell mode="login">
      <div className="form-wrap">
        <span className="form-kicker">Bienvenido de vuelta</span>
        <h2>
          Tu negocio,
          <br />
          en movimiento.
        </h2>
        <p className="form-intro">
          Ingresa para administrar clientes, sellos y recompensas.
        </p>
        <form className="auth-form" onSubmit={submit}>
          {registered && (
            <div className="success-box">
              Tu negocio ya está registrado. Ahora inicia sesión.
            </div>
          )}
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          <div className="field-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tu@negocio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field-group">
            <label htmlFor="password">Contraseña</label>
            <div className="password-wrap">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
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
          <button className="submit-button" disabled={loading}>
            {loading ? "Entrando…" : "Entrar a Fidara"}
          </button>
        </form>
        <p className="form-foot">
          Al continuar aceptas nuestros <a href="#">Términos</a> y{" "}
          <a href="#">Aviso de privacidad</a>.
        </p>
      </div>
    </AuthShell>
  );
}
