"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";

type Profile = {
  id: string;
  firstName: string;
  lastName: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  isEmailVerified: boolean;
  language: string;
  timeZone: string;
  inheritsOrganizationTimeZone: boolean;
  organizationId: string;
  organizationName: string;
  role: string;
  createdAtUtc: string;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

type ProfileForm = {
  firstName: string;
  lastName: string;
  phone: string;
  language: string;
  timeZone: string;
  inheritOrganizationTimeZone: boolean;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type ToastMessage = {
  type: "success" | "error";
  title: string;
  message: string;
} | null;

type ConfirmationType = "profile" | "password" | null;

const TIME_ZONES = [
  { value: "America/Tijuana", label: "Tijuana (Pacífico)" },
  { value: "America/Hermosillo", label: "Hermosillo (Sonora)" },
  { value: "America/Mazatlan", label: "Mazatlán" },
  { value: "America/Chihuahua", label: "Chihuahua" },
  { value: "America/Monterrey", label: "Monterrey" },
  { value: "America/Mexico_City", label: "Ciudad de México" },
  { value: "America/Merida", label: "Mérida" },
  { value: "America/Cancun", label: "Cancún" },
  { value: "America/Los_Angeles", label: "Los Ángeles" },
  { value: "America/Denver", label: "Denver" },
  { value: "America/Chicago", label: "Chicago" },
  { value: "America/New_York", label: "Nueva York" },
  { value: "UTC", label: "UTC" },
];

const EMPTY_PROFILE_FORM: ProfileForm = {
  firstName: "",
  lastName: "",
  phone: "",
  language: "es-MX",
  timeZone: "America/Tijuana",
  inheritOrganizationTimeZone: true,
};

const EMPTY_PASSWORD_FORM: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const inputClassName =
  "h-[46px] w-full rounded-xl border border-[#E5E7EB] bg-white px-3.5 text-sm text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#E11D48] focus:ring-4 focus:ring-[#E11D48]/10 disabled:cursor-not-allowed disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF]";

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function getRoleName(role: string) {
  switch (role) {
    case "Owner":
      return "Propietario";
    case "Admin":
      return "Administrador";
    case "Manager":
      return "Gerente";
    case "Employee":
      return "Empleado";
    default:
      return role || "Usuario";
  }
}

function updateStoredSession(profile: Profile) {
  try {
    const raw = sessionStorage.getItem("fidara_session");
    const current = raw ? JSON.parse(raw) : {};

    sessionStorage.setItem(
      "fidara_session",
      JSON.stringify({
        ...current,
        userName: profile.fullName,
        language: profile.language,
        locale: profile.language,
        timeZone: profile.timeZone,
      }),
    );

    window.dispatchEvent(new Event("fidara-session-updated"));
  } catch {
    // La API ya guardó los cambios; la sesión local no debe bloquear el flujo.
  }
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileForm, setProfileForm] =
    useState<ProfileForm>(EMPTY_PROFILE_FORM);
  const [passwordForm, setPasswordForm] =
    useState<PasswordForm>(EMPTY_PASSWORD_FORM);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationType>(null);
  const [toast, setToast] = useState<ToastMessage>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    void loadProfile();
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!confirmation) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [confirmation]);

  async function loadProfile() {
    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch("/api/profile", { cache: "no-store" });
      const payload = (await response
        .json()
        .catch(() => ({}))) as ApiResponse<Profile>;

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message ?? "No fue posible cargar el perfil.");
      }

      const data = payload.data;
      setProfile(data);
      setProfileForm({
        firstName: data.firstName,
        lastName: data.lastName ?? "",
        phone: data.phone ?? "",
        language: data.language,
        timeZone: data.timeZone,
        inheritOrganizationTimeZone: data.inheritsOrganizationTimeZone,
      });
      updateStoredSession(data);
    } catch (caught) {
      setLoadError(
        caught instanceof Error
          ? caught.message
          : "No fue posible cargar el perfil.",
      );
    } finally {
      setLoading(false);
    }
  }

  function requestProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profileForm.firstName.trim()) {
      setToast({
        type: "error",
        title: "Revisa el formulario",
        message: "El nombre es obligatorio.",
      });
      return;
    }

    setConfirmation("profile");
  }

  async function saveProfile() {
    setSavingProfile(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: profileForm.firstName.trim(),
          lastName: profileForm.lastName.trim() || null,
          phone: profileForm.phone.trim() || null,
          language: profileForm.language,
          timeZone: profileForm.inheritOrganizationTimeZone
            ? null
            : profileForm.timeZone,
        }),
      });
      const payload = (await response
        .json()
        .catch(() => ({}))) as ApiResponse<Profile>;

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message ?? "No fue posible guardar el perfil.");
      }

      const updatedProfile = payload.data;
      setProfile(updatedProfile);
      setProfileForm((current) => ({
        ...current,
        timeZone: updatedProfile.timeZone,
        inheritOrganizationTimeZone:
          updatedProfile.inheritsOrganizationTimeZone,
      }));
      updateStoredSession(updatedProfile);
      setConfirmation(null);
      setToast({
        type: "success",
        title: "Cambios guardados",
        message: "Tu perfil y preferencias se actualizaron correctamente.",
      });
    } catch (caught) {
      setConfirmation(null);
      setToast({
        type: "error",
        title: "No pudimos guardar los cambios",
        message:
          caught instanceof Error
            ? caught.message
            : "Ocurrió un error inesperado.",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  function requestPasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (passwordForm.newPassword.length < 8) {
      setToast({
        type: "error",
        title: "Contraseña demasiado corta",
        message: "La nueva contraseña debe tener al menos 8 caracteres.",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setToast({
        type: "error",
        title: "Las contraseñas no coinciden",
        message: "Revisa la confirmación de la nueva contraseña.",
      });
      return;
    }

    setConfirmation("password");
  }

  async function changePassword() {
    setSavingPassword(true);

    try {
      const response = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm),
      });
      const payload = (await response
        .json()
        .catch(() => ({}))) as ApiResponse<never>;

      if (response.status === 401) {
        throw new Error(
          payload.message ?? "La contraseña actual es incorrecta.",
        );
      }

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.message ?? "No fue posible actualizar la contraseña.",
        );
      }

      setPasswordForm(EMPTY_PASSWORD_FORM);
      setConfirmation(null);
      setToast({
        type: "success",
        title: "Contraseña actualizada",
        message: "Tu nueva contraseña ya está activa.",
      });
    } catch (caught) {
      setConfirmation(null);
      setToast({
        type: "error",
        title: "No pudimos cambiar la contraseña",
        message:
          caught instanceof Error
            ? caught.message
            : "Ocurrió un error inesperado.",
      });
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-[420px] place-items-center px-5 py-10">
        <div className="flex items-center gap-3 text-sm font-semibold text-[#6B7280]">
          <LoaderCircle className="animate-spin text-[#E11D48]" size={24} />
          Cargando perfil...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full px-5 py-8 text-[#111827] sm:px-8 lg:px-[46px] lg:pb-12">
      <div className="mx-auto max-w-[1560px]">
        <header className="mb-7">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#E11D48]">
            CUENTA
          </span>
          <h1 className="mt-3 text-[34px] font-extrabold tracking-[-0.045em] text-[#111827] sm:text-5xl">
            Mi perfil
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">
            Administra tus datos y la forma en que Fidara muestra la
            información.
          </p>
        </header>

        {loadError && (
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle size={19} />
              <span className="font-bold">{loadError}</span>
            </div>
            <button
              type="button"
              className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-extrabold transition hover:bg-rose-100"
              onClick={() => void loadProfile()}
            >
              Intentar nuevamente
            </button>
          </div>
        )}

        {profile && (
          <section className="mb-5 flex items-center gap-4 rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_30px_rgba(17,24,39,0.045)] sm:p-6">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#111827] text-sm font-extrabold text-white">
              {getInitials(profile.fullName)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-extrabold text-[#111827]">
                  {profile.fullName}
                </h2>
                {profile.isEmailVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700">
                    <CheckCircle2 size={12} /> Verificado
                  </span>
                )}
              </div>
              <p className="truncate text-sm text-[#6B7280]">{profile.email}</p>
              <p className="mt-1 text-xs font-semibold text-[#6B7280]">
                {profile.organizationName} · {getRoleName(profile.role)}
              </p>
            </div>
          </section>
        )}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
          <section className="rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_30px_rgba(17,24,39,0.045)] sm:p-6">
            <SectionHeading
              icon={<UserRound size={20} />}
              title="Información y preferencias"
              description="Estos cambios se aplican solamente a tu usuario."
            />

            <form className="mt-6 space-y-[18px]" onSubmit={requestProfileSave}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombre" htmlFor="firstName">
                  <input
                    id="firstName"
                    className={inputClassName}
                    required
                    maxLength={80}
                    value={profileForm.firstName}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        firstName: event.target.value,
                      }))
                    }
                  />
                </Field>

                <Field label="Apellidos" htmlFor="lastName">
                  <input
                    id="lastName"
                    className={inputClassName}
                    maxLength={100}
                    value={profileForm.lastName}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        lastName: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>

              <Field
                label="Correo electrónico"
                htmlFor="email"
                help="El cambio de correo requerirá verificación y se habilitará después."
              >
                <input
                  id="email"
                  className={inputClassName}
                  disabled
                  value={profile?.email ?? ""}
                />
              </Field>

              <Field label="Teléfono" htmlFor="phone">
                <input
                  id="phone"
                  className={inputClassName}
                  inputMode="tel"
                  maxLength={30}
                  value={profileForm.phone}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Idioma" htmlFor="language">
                  <select
                    id="language"
                    className={inputClassName}
                    value={profileForm.language}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        language: event.target.value,
                      }))
                    }
                  >
                    <option value="es-MX">Español (México)</option>
                    <option value="en-US">English (United States)</option>
                  </select>
                </Field>

                <Field label="Zona horaria" htmlFor="timeZone">
                  <select
                    id="timeZone"
                    className={inputClassName}
                    disabled={profileForm.inheritOrganizationTimeZone}
                    value={profileForm.timeZone}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        timeZone: event.target.value,
                      }))
                    }
                  >
                    {TIME_ZONES.map((timeZone) => (
                      <option key={timeZone.value} value={timeZone.value}>
                        {timeZone.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 transition hover:border-[#E11D48]/30">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[#E11D48]"
                  checked={profileForm.inheritOrganizationTimeZone}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      inheritOrganizationTimeZone: event.target.checked,
                    }))
                  }
                />
                <span>
                  <strong className="block text-sm font-extrabold text-[#111827]">
                    Usar la zona horaria de mi organización
                  </strong>
                  <small className="mt-1 block text-xs leading-5 text-[#6B7280]">
                    Actualmente se mostrará como {profileForm.timeZone}.
                  </small>
                </span>
              </label>

              <div className="flex justify-end border-t border-[#E5E7EB] pt-5">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-5 text-sm font-extrabold text-white shadow-lg shadow-[#E11D48]/20 transition hover:-translate-y-0.5 hover:bg-[#BE123C] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingProfile ? (
                    <LoaderCircle className="animate-spin" size={17} />
                  ) : (
                    <Save size={17} />
                  )}
                  Guardar cambios
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_30px_rgba(17,24,39,0.045)] sm:p-6">
            <SectionHeading
              icon={<KeyRound size={20} />}
              title="Contraseña"
              description="Utiliza una contraseña distinta a la actual."
            />

            <form
              className="mt-6 space-y-[18px]"
              onSubmit={requestPasswordChange}
            >
              <PasswordField
                id="currentPassword"
                label="Contraseña actual"
                autoComplete="current-password"
                value={passwordForm.currentPassword}
                visible={showCurrentPassword}
                onToggle={() => setShowCurrentPassword((value) => !value)}
                onChange={(value) =>
                  setPasswordForm((current) => ({
                    ...current,
                    currentPassword: value,
                  }))
                }
              />

              <PasswordField
                id="newPassword"
                label="Nueva contraseña"
                autoComplete="new-password"
                value={passwordForm.newPassword}
                visible={showNewPassword}
                onToggle={() => setShowNewPassword((value) => !value)}
                onChange={(value) =>
                  setPasswordForm((current) => ({
                    ...current,
                    newPassword: value,
                  }))
                }
              />

              <Field
                label="Confirmar nueva contraseña"
                htmlFor="confirmPassword"
              >
                <input
                  id="confirmPassword"
                  className={inputClassName}
                  required
                  minLength={8}
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                />
              </Field>

              <div className="flex items-start gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <strong className="block text-sm font-extrabold text-[#111827]">
                    Protege tu cuenta
                  </strong>
                  <p className="mt-1 text-xs leading-5 text-[#6B7280]">
                    Usa al menos 8 caracteres y no compartas tu contraseña.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-5 text-sm font-extrabold text-white shadow-lg shadow-[#E11D48]/20 transition hover:-translate-y-0.5 hover:bg-[#BE123C] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <KeyRound size={17} />
                Cambiar contraseña
              </button>
            </form>
          </section>
        </div>
      </div>

      {confirmation && (
        <ConfirmationDialog
          type={confirmation}
          loading={confirmation === "profile" ? savingProfile : savingPassword}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => {
            if (confirmation === "profile") {
              void saveProfile();
            } else {
              void changePassword();
            }
          }}
        />
      )}

      {toast && <ProfileToast toast={toast} onClose={() => setToast(null)} />}
    </main>
  );
}

type SectionHeadingProps = {
  icon: ReactNode;
  title: string;
  description: string;
};

function SectionHeading({ icon, title, description }: SectionHeadingProps) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-50 text-[#E11D48]">
        {icon}
      </span>
      <div>
        <h2 className="text-base font-extrabold tracking-[-0.02em] text-[#111827]">
          {title}
        </h2>
        <p className="mt-1 text-sm text-[#6B7280]">{description}</p>
      </div>
    </div>
  );
}

type FieldProps = {
  label: string;
  htmlFor: string;
  help?: string;
  children: ReactNode;
};

function Field({ label, htmlFor, help, children }: FieldProps) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-2">
      <span className="text-xs font-extrabold text-[#111827]">{label}</span>
      {children}
      {help && (
        <small className="text-xs leading-5 text-[#6B7280]">{help}</small>
      )}
    </label>
  );
}

type PasswordFieldProps = {
  id: string;
  label: string;
  autoComplete: string;
  value: string;
  visible: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
};

function PasswordField({
  id,
  label,
  autoComplete,
  value,
  visible,
  onToggle,
  onChange,
}: PasswordFieldProps) {
  return (
    <Field label={label} htmlFor={id}>
      <div className="relative">
        <input
          id={id}
          className={`${inputClassName} pr-12`}
          required
          minLength={8}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827]"
          onClick={onToggle}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </Field>
  );
}

type ConfirmationDialogProps = {
  type: Exclude<ConfirmationType, null>;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function ConfirmationDialog({
  type,
  loading,
  onCancel,
  onConfirm,
}: ConfirmationDialogProps) {
  const isPassword = type === "password";

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-[#111827]/60 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={() => !loading && onCancel()}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="profile-confirmation-title"
        className="w-full max-w-md rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-[0_30px_90px_rgba(17,24,39,0.30)] sm:p-7"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-50 text-[#E11D48]">
            {isPassword ? <KeyRound size={22} /> : <Save size={22} />}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <h2
                id="profile-confirmation-title"
                className="pt-1 text-xl font-extrabold tracking-[-0.025em] text-[#111827]"
              >
                {isPassword
                  ? "¿Cambiar tu contraseña?"
                  : "¿Guardar estos cambios?"}
              </h2>

              <button
                type="button"
                disabled={loading}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#F3F4F6] text-[#6B7280] transition hover:text-[#111827] disabled:opacity-50"
                onClick={onCancel}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-2 text-sm leading-6 text-[#6B7280]">
              {isPassword
                ? "La contraseña actual dejará de funcionar inmediatamente. Después deberás utilizar la contraseña nueva para iniciar sesión."
                : "Se actualizarán tus datos personales, idioma y zona horaria para todo el panel."}
            </p>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-3 sm:flex sm:justify-end">
          <button
            type="button"
            disabled={loading}
            className="min-h-11 rounded-xl border border-[#E5E7EB] bg-white px-5 text-sm font-extrabold text-[#111827] transition hover:bg-[#F3F4F6] disabled:opacity-50"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-5 text-sm font-extrabold text-white shadow-lg shadow-[#E11D48]/20 transition hover:-translate-y-0.5 hover:bg-[#BE123C] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onConfirm}
          >
            {loading ? (
              <LoaderCircle className="animate-spin" size={17} />
            ) : isPassword ? (
              <KeyRound size={17} />
            ) : (
              <Save size={17} />
            )}
            {loading
              ? "Guardando..."
              : isPassword
                ? "Sí, cambiar contraseña"
                : "Sí, guardar cambios"}
          </button>
        </div>
      </section>
    </div>
  );
}

type ProfileToastProps = {
  toast: Exclude<ToastMessage, null>;
  onClose: () => void;
};

function ProfileToast({ toast, onClose }: ProfileToastProps) {
  const success = toast.type === "success";

  return (
    <div
      className={`fixed right-4 top-4 z-[200] flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-2xl border bg-white px-4 py-4 shadow-[0_20px_60px_rgba(17,24,39,0.18)] ${
        success ? "border-emerald-200" : "border-rose-200"
      }`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
          success
            ? "bg-emerald-50 text-emerald-700"
            : "bg-rose-50 text-[#E11D48]"
        }`}
      >
        {success ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}
      </span>
      <div className="min-w-0 flex-1">
        <strong className="block text-sm font-extrabold text-[#111827]">
          {toast.title}
        </strong>
        <p className="mt-1 text-xs leading-5 text-[#6B7280]">{toast.message}</p>
      </div>
      <button
        type="button"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827]"
        onClick={onClose}
        aria-label="Cerrar notificación"
      >
        <X size={16} />
      </button>
    </div>
  );
}
