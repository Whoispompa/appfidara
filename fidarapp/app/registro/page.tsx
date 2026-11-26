"use client";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, Phone, Store, User } from "lucide-react";
import { AuthEntry, AuthField } from "@/components/auth-entry";
import styles from "@/components/auth-entry.module.css";

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
  function passwordToggle(label: string) {
    return (
      <button
        className="password-toggle"
        type="button"
        onClick={() => setShowPassword((visible) => !visible)}
        aria-label={(showPassword ? "Ocultar " : "Mostrar ") + label}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    );
  }

  return (
    <AuthEntry mode="register" title="Crea tu cuenta" subtitle="Comienza con 14 días gratis">
      <form className="auth-form" onSubmit={submit}>
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
        <div className="field-grid">
          <AuthField
            id="firstName"
            label="Nombre"
            icon={User}
            autoComplete="given-name"
            placeholder="Nombre"
            value={form.firstName}
            onChange={update("firstName")}
            required
          />
          <AuthField
            id="lastName"
            label="Apellido"
            icon={User}
            autoComplete="family-name"
            placeholder="Apellido"
            value={form.lastName}
            onChange={update("lastName")}
            required
          />
        </div>
        <div className={"field-grid " + styles.businessRow}>
          <AuthField
            id="businessName"
            label="Nombre del negocio"
            icon={Store}
            autoComplete="organization"
            placeholder="Nombre del negocio"
            value={form.businessName}
            onChange={update("businessName")}
            required
          />
          <AuthField
            id="phone"
            label="Teléfono"
            icon={Phone}
            type="tel"
            autoComplete="tel"
            placeholder="Teléfono"
            value={form.phone}
            onChange={update("phone")}
          />
        </div>
        <AuthField
          id="email"
          label="Correo electrónico"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="Correo electrónico"
          value={form.email}
          onChange={update("email")}
          required
        />
        <div className="field-grid">
          <AuthField
            id="password"
            label="Contraseña (mínimo 8 caracteres)"
            icon={LockKeyhole}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Contraseña"
            value={form.password}
            onChange={update("password")}
            action={passwordToggle("contraseña")}
            required
          />
          <AuthField
            id="confirmPassword"
            label="Repetir contraseña"
            icon={LockKeyhole}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Repite la clave"
            value={form.confirmPassword}
            onChange={update("confirmPassword")}
            action={passwordToggle("confirmación de contraseña")}
            required
          />
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
        Sin tarjeta de crédito. Puedes configurar tu programa después de registrarte.
      </p>
    </AuthEntry>
  );
}
