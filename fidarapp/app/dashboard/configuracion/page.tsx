"use client";

import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ImageIcon,
  LoaderCircle,
  Palette,
  Save,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Program = {
  id: string;
  name: string;
  logoPath?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  updatedAt?: string | null;
};

type BrandingData = {
  organizationId: string;
  organizationName: string;
  organizationLogoPath?: string | null;
  organizationLogoUrl?: string | null;
  programs: Program[];
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type UpdateResult = {
  programId: string;
  programName: string;
  logoPath: string;
  logoUrl: string;
  organizationLogoPath: string;
  organizationLogoUrl: string;
  applePush?: {
    sent: number;
    failed: number;
    removed: number;
  };
};

type Toast = {
  type: "success" | "error";
  title: string;
  message: string;
} | null;

const acceptedTypes = ["image/png", "image/jpeg", "image/webp"];
const maximumBytes = 5 * 1024 * 1024;

export default function ConfigurationPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<BrandingData | null>(null);
  const [programId, setProgramId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<Toast>(null);

  const selectedProgram = useMemo(
    () => data?.programs.find((program) => program.id === programId),
    [data, programId],
  );

  const displayedLogo = previewUrl || selectedProgram?.logoUrl || null;

  async function loadBranding() {
    setLoading(true);

    try {
      const response = await fetch("/api/settings/branding", {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as ApiResponse<BrandingData>;

      if (response.status === 401) {
        sessionStorage.removeItem("fidara_session");
        window.location.replace("/login");
        return;
      }

      if (!response.ok || !payload.data) {
        throw new Error(payload.message ?? "No fue posible cargar la configuración.");
      }

      setData(payload.data);
      setProgramId((current) => current || payload.data?.programs[0]?.id || "");
      setError("");
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

  useEffect(() => {
    void loadBranding();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function clearSelection() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function selectFile(file?: File) {
    if (!file) return;

    if (!acceptedTypes.includes(file.type)) {
      setToast({
        type: "error",
        title: "Formato no compatible",
        message: "Selecciona una imagen PNG, JPG o WebP.",
      });
      return;
    }

    if (file.size > maximumBytes) {
      setToast({
        type: "error",
        title: "Archivo demasiado grande",
        message: "El logo no puede pesar más de 5 MB.",
      });
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files?.[0]);
  }

  function handleProgramChange(nextProgramId: string) {
    clearSelection();
    setProgramId(nextProgramId);
  }

  async function saveLogo() {
    if (!selectedFile || !programId || saving) return;

    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("programId", programId);
      formData.append("logo", selectedFile);

      const response = await fetch("/api/settings/branding", {
        method: "PUT",
        body: formData,
      });
      const payload = (await response.json().catch(() => ({}))) as ApiResponse<UpdateResult>;

      if (response.status === 401) {
        sessionStorage.removeItem("fidara_session");
        window.location.replace("/login");
        return;
      }

      if (!response.ok || !payload.data) {
        throw new Error(payload.message ?? "No fue posible guardar el logo.");
      }

      const updated = payload.data;

      setData((current) =>
        current
          ? {
              ...current,
              organizationLogoPath: updated.organizationLogoPath,
              organizationLogoUrl: updated.organizationLogoUrl,
              programs: current.programs.map((program) =>
                program.id === updated.programId
                  ? {
                      ...program,
                      logoPath: updated.logoPath,
                      logoUrl: updated.logoUrl,
                      updatedAt: new Date().toISOString(),
                    }
                  : program,
              ),
            }
          : current,
      );

      try {
        const rawSession = sessionStorage.getItem("fidara_session");

        if (rawSession) {
          const currentSession = JSON.parse(rawSession) as Record<string, unknown>;

          sessionStorage.setItem(
            "fidara_session",
            JSON.stringify({
              ...currentSession,
              organizationLogoUrl: updated.organizationLogoUrl,
            }),
          );

          window.dispatchEvent(
            new CustomEvent("fidara:branding-updated"),
          );
        }
      } catch {
        // El logo ya quedó guardado en la API; la sesión se renovará al entrar de nuevo.
      }

      clearSelection();

      const sent = updated.applePush?.sent ?? 0;
      setToast({
        type: "success",
        title: "Identidad actualizada",
        message:
          sent > 0
            ? `El logo se guardó y se notificaron ${sent} dispositivos.`
            : "El logo se guardó correctamente para las próximas tarjetas.",
      });
    } catch (caught) {
      setToast({
        type: "error",
        title: "No se pudo guardar",
        message:
          caught instanceof Error
            ? caught.message
            : "Ocurrió un error inesperado.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-full bg-[#F3F4F6] px-4 py-6 text-[#111827] sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-[1380px]">
        <header className="mb-7">
          <span className="text-[11px] font-black tracking-[0.18em] text-[#E11D48]">
            PERSONALIZACIÓN
          </span>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
            Configuración
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7280]">
            Personaliza cómo aparece tu negocio en las tarjetas y notificaciones Wallet.
          </p>
        </header>

        {error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <span className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 shrink-0" size={17} />
              {error}
            </span>
            <button type="button" onClick={() => void loadBranding()} className="font-extrabold">
              Reintentar
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid min-h-[420px] place-items-center rounded-[24px] border border-[#E5E7EB] bg-white">
            <LoaderCircle className="animate-spin text-[#E11D48]" size={30} />
          </div>
        ) : (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-[0_18px_45px_rgba(17,24,39,0.06)]">
              <div className="flex items-start gap-3 border-b border-[#E5E7EB] px-5 py-5 sm:px-6">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-50 text-[#E11D48]">
                  <Palette size={20} />
                </span>
                <div>
                  <h2 className="text-base font-black">Identidad del negocio</h2>
                  <p className="mt-1 text-xs leading-5 text-[#6B7280]">
                    Este logo reemplazará el icono predeterminado de Fidara.
                  </p>
                </div>
              </div>

              <div className="space-y-6 p-5 sm:p-6">
                <label className="block">
                  <span className="mb-2 block text-xs font-extrabold">Programa de lealtad</span>
                  <select
                    value={programId}
                    onChange={(event) => handleProgramChange(event.target.value)}
                    className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold outline-none transition focus:border-[#E11D48] focus:ring-4 focus:ring-rose-100"
                  >
                    {data?.programs.length === 0 && (
                      <option value="">No hay programas disponibles</option>
                    )}
                    {data?.programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name}{program.isActive ? "" : " · Inactivo"}
                      </option>
                    ))}
                  </select>
                </label>

                <div>
                  <span className="mb-2 block text-xs font-extrabold">Logo del café o negocio</span>
                  <div
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setDragging(true);
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    className={`relative flex min-h-56 flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-7 text-center transition ${
                      dragging
                        ? "border-[#E11D48] bg-rose-50"
                        : "border-[#D1D5DB] bg-[#F8FAFC] hover:border-[#E11D48]"
                    }`}
                  >
                    {displayedLogo ? (
                      <>
                        <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-[26px] border border-[#E5E7EB] bg-white p-3 shadow-sm">
                          <img
                            src={displayedLogo}
                            alt={`Logo de ${selectedProgram?.name ?? "negocio"}`}
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <strong className="mt-4 text-sm font-extrabold">
                          {selectedFile?.name ?? "Logo actual"}
                        </strong>
                        <p className="mt-1 text-xs text-[#6B7280]">
                          {selectedFile
                            ? `${(selectedFile.size / 1024).toFixed(0)} KB · listo para guardar`
                            : "Selecciona otra imagen para reemplazarlo"}
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-[#E11D48]">
                          <UploadCloud size={24} />
                        </span>
                        <strong className="mt-4 text-sm font-extrabold">
                          Arrastra aquí el logo de tu negocio
                        </strong>
                        <p className="mt-1 text-xs text-[#6B7280]">
                          PNG, JPG o WebP · máximo 5 MB
                        </p>
                      </>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 text-xs font-extrabold transition hover:border-[#E11D48] hover:text-[#E11D48]"
                      >
                        <ImageIcon size={15} />
                        {displayedLogo ? "Cambiar imagen" : "Seleccionar imagen"}
                      </button>
                      {selectedFile && (
                        <button
                          type="button"
                          onClick={clearSelection}
                          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-extrabold text-[#6B7280] hover:bg-white"
                        >
                          <X size={15} />
                          Cancelar cambio
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex gap-3 rounded-2xl bg-[#F8FAFC] p-4">
                    <ShieldCheck className="shrink-0 text-emerald-700" size={19} />
                    <div>
                      <strong className="block text-xs font-extrabold">Recomendación</strong>
                      <p className="mt-1 text-xs leading-5 text-[#6B7280]">
                        Usa una imagen cuadrada de al menos 512 × 512 px.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 rounded-2xl bg-[#F8FAFC] p-4">
                    <Bell className="shrink-0 text-[#E11D48]" size={19} />
                    <div>
                      <strong className="block text-xs font-extrabold">Actualización Wallet</strong>
                      <p className="mt-1 text-xs leading-5 text-[#6B7280]">
                        Las tarjetas instaladas reciben el cambio por push.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end border-t border-[#E5E7EB] pt-5">
                  <button
                    type="button"
                    disabled={!selectedFile || !programId || saving}
                    onClick={() => void saveLogo()}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-5 text-sm font-extrabold text-white shadow-lg shadow-rose-600/20 transition hover:bg-[#BE123C] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? (
                      <LoaderCircle className="animate-spin" size={17} />
                    ) : (
                      <Save size={17} />
                    )}
                    {saving ? "Actualizando…" : "Guardar identidad"}
                  </button>
                </div>
              </div>
            </section>

            <aside className="xl:sticky xl:top-6">
              <div className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-[0_18px_45px_rgba(17,24,39,0.06)]">
                <div className="border-b border-[#E5E7EB] px-5 py-4">
                  <h2 className="text-sm font-black">Vista previa de notificación</h2>
                  <p className="mt-1 text-[11px] text-[#6B7280]">
                    Así reconocerán tus clientes el mensaje.
                  </p>
                </div>

                <div className="bg-[radial-gradient(circle_at_top_right,rgba(225,29,72,0.16),transparent_45%),#111827] p-5 sm:p-7">
                  <div className="mx-auto max-w-[350px] rounded-[32px] border border-white/10 bg-black/30 p-3 shadow-2xl">
                    <div className="mb-3 flex justify-between px-2 pt-1 text-[10px] font-bold text-white/75">
                      <span>9:41</span>
                      <span>● ● ●</span>
                    </div>
                    <div className="rounded-[22px] bg-white p-4 shadow-xl">
                      <div className="flex items-start gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-1.5">
                          {displayedLogo ? (
                            <img src={displayedLogo} alt="" className="h-full w-full object-contain" />
                          ) : (
                            <Bell size={19} className="text-[#E11D48]" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between gap-3">
                            <strong className="truncate text-xs font-black">
                              {data?.organizationName ?? "Tu negocio"}
                            </strong>
                            <small className="shrink-0 text-[10px] text-[#9CA3AF]">ahora</small>
                          </div>
                          <p className="mt-2 text-sm font-extrabold leading-5">
                            ¡Tienes una nueva promoción!
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#6B7280]">
                            Visítanos hoy y recibe un beneficio especial.
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="py-3 text-center text-[10px] font-bold text-white/65">
                      {selectedProgram?.name ?? "Programa de lealtad"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between px-5 py-4 text-xs">
                  <span className="text-[#6B7280]">Estado</span>
                  <span className="inline-flex items-center gap-1.5 font-extrabold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {selectedProgram?.logoUrl ? "Logo personalizado" : "Logo predeterminado"}
                  </span>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      {toast && (
        <div
          className={`fixed right-4 top-4 z-[200] flex w-[calc(100%_-_2rem)] max-w-sm items-start gap-3 rounded-2xl border bg-white px-4 py-4 shadow-[0_20px_60px_rgba(17,24,39,0.18)] ${
            toast.type === "success" ? "border-emerald-200" : "border-rose-200"
          }`}
          role="status"
        >
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-[#E11D48]"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertTriangle size={18} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <strong className="block text-sm font-extrabold">{toast.title}</strong>
            <p className="mt-1 text-xs leading-5 text-[#6B7280]">{toast.message}</p>
          </div>
          <button type="button" onClick={() => setToast(null)} className="grid h-8 w-8 place-items-center text-[#6B7280]">
            <X size={16} />
          </button>
        </div>
      )}
    </main>
  );
}
