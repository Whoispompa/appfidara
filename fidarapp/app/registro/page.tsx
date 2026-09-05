"use client";
import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    businessName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [accepted, setAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const update =
    (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (form.password.length < 8)
      return setError("La contraseña debe tener al menos 8 caracteres.");
    if (form.password !== form.confirmPassword)
      return setError("Las contraseñas no coinciden.");
    if (!accepted)
      return setError("Debes aceptar el aviso de privacidad para continuar.");
    setLoading(true);
    try {
      const request = {
        firstName: form.firstName,
        lastName: form.lastName,
        businessName: form.businessName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      };
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(payload.message ?? "No pudimos crear tu cuenta.");
      sessionStorage.setItem("fidara_registered_email", form.email);
      window.location.href = "/login";
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
    <AuthShell mode="register">
      <div className="form-wrap">
        <span className="form-kicker">14 días para probarlo</span>
        <h2>Haz que vuelvan.</h2>
        <p className="form-intro">
          Crea tu negocio y publica tu primera tarjeta de lealtad.
        </p>
        <form className="auth-form" onSubmit={submit}>
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          <div className="field-grid">
            <div className="field-group">
              <label htmlFor="firstName">Nombre</label>
              <input
                id="firstName"
                autoComplete="given-name"
                placeholder="Yaira"
                value={form.firstName}
                onChange={update("firstName")}
                required
              />
            </div>
            <div className="field-group">
              <label htmlFor="lastName">Apellido</label>
              <input
                id="lastName"
                autoComplete="family-name"
                placeholder="García"
                value={form.lastName}
                onChange={update("lastName")}
                required
              />
            </div>
          </div>
          <div className="field-group">
            <label htmlFor="businessName">Nombre del negocio</label>
            <input
              id="businessName"
              autoComplete="organization"
              placeholder="Café Nómada"
              value={form.businessName}
              onChange={update("businessName")}
              required
            />
          </div>
          <div className="field-grid">
            <div className="field-group">
              <label htmlFor="email">Correo</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="hola@negocio.com"
                value={form.email}
                onChange={update("email")}
                required
              />
            </div>
            <div className="field-group">
              <label htmlFor="phone">Teléfono</label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="664 000 0000"
                value={form.phone}
                onChange={update("phone")}
              />
            </div>
          </div>
          <div className="field-grid">
            <div className="field-group">
              <label htmlFor="password">Contraseña</label>
              <div className="password-wrap">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  value={form.password}
                  onChange={update("password")}
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="Mostrar u ocultar contraseña"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="field-group">
              <label htmlFor="confirmPassword">Repetir contraseña</label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                value={form.confirmPassword}
                onChange={update("confirmPassword")}
                required
              />
            </div>
          </div>
          <label className="check-line">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />{" "}
            Acepto el aviso de privacidad y el tratamiento de mis datos.
          </label>
          <button className="submit-button" disabled={loading}>
            {loading ? "Creando tu espacio…" : "Crear mi cuenta gratis"}
          </button>
        </form>
        <p className="form-foot">
          Sin tarjeta de crédito. Puedes configurar tu programa después de
          registrarte.
        </p>
      </div>
    </AuthShell>
  );
}
