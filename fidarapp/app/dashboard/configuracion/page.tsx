"use client";

import {
  AlertTriangle,
  Bell,
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
import { Poppins } from "next/font/google";
import { toast } from "sonner";
import pageStyles from "../clientes/customers.module.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700", "800"], display: "swap" });

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
      toast.error("Formato no compatible", {
        description: "Selecciona una imagen PNG, JPG o WebP.",
      });
      return;
    }

    if (file.size > maximumBytes) {
      toast.error("Archivo demasiado grande", {
        description: "El logo no puede pesar más de 5 MB.",
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
      toast.success("Identidad actualizada", {
        description:
          sent > 0
            ? `El logo se guardó y se notificaron ${sent} dispositivos.`
            : "El logo se guardó correctamente para las próximas tarjetas.",
      });
    } catch (caught) {
      toast.error("No se pudo guardar", {
        description:
          caught instanceof Error
            ? caught.message
            : "Ocurrió un error inesperado.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={[pageStyles.page, poppins.className, "@container"].join(" ")}>
      <header className={pageStyles.heading}>
        <div>
          <span className={pageStyles.eyebrow}>
            NEGOCIO
          </span>
          <h1>
            Configuración
          </h1>
          <p>
            Personaliza cómo aparece tu negocio en las tarjetas y notificaciones Wallet.
          </p>
        </div>
      </header>

      {error && (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span className="flex min-w-0 items-start gap-2 [overflow-wrap:anywhere]">
            <AlertTriangle className="mt-0.5 shrink-0" size={17} />
            {error}
          </span>
          <button type="button" onClick={() => void loadBranding()} className="font-extrabold">
            Reintentar
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid min-h-56 place-items-center rounded-[24px] border border-[#E5E7EB] bg-white">
          <LoaderCircle className="animate-spin text-[#E11D48]" size={30} />
        </div>
      ) : (
        <div className="grid min-w-0 items-start gap-5 @min-[44rem]:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] @min-[64rem]:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <section aria-labelledby="identity-heading" className="min-w-0 rounded-[24px] border border-[#E5E7EB] bg-white shadow-[0_14px_42px_rgba(17,24,39,0.06)]">
            <div className="flex items-start gap-3 border-b border-[#E5E7EB] p-4 @min-[36rem]:p-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-50 text-[#E11D48]">
                <Palette size={20} />
              </span>
              <div>
                <h2 id="identity-heading" className="text-base font-extrabold">Identidad visual</h2>
                <p className="mt-1 text-xs leading-5 text-[#6B7280]">
                  Este logo reemplazará el icono predeterminado de Fidara.
                </p>
              </div>
            </div>

            <div className="space-y-5 p-4 @min-[36rem]:p-5">
              <label className="block">
                <span className="mb-2 block text-xs font-extrabold">Programa de lealtad</span>
                <select
                  value={programId}
                  onChange={(event) => handleProgramChange(event.target.value)}
                  className="h-12 w-full min-w-0 truncate rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#111827] outline-none transition focus:border-[#E11D48] focus:ring-4 focus:ring-rose-100"
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
                <span className="mb-2 block text-xs font-extrabold">Logo del negocio</span>
                <div
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center rounded-2xl border border-dashed px-3 py-4 text-center transition ${
                    dragging
                      ? "border-[#E11D48] bg-rose-50"
                      : "border-[#D1D5DB] bg-white hover:border-[#E11D48]"
                  }`}
                >
                  {displayedLogo ? (
                    <>
                      <div className="grid size-20 place-items-center overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-2">
                        <img
                          src={displayedLogo}
                          alt={`Logo de ${selectedProgram?.name ?? "negocio"}`}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <strong className="mt-3 max-w-full text-sm font-extrabold [overflow-wrap:anywhere]">
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
                      <strong className="mt-3 max-w-full text-sm font-extrabold [overflow-wrap:anywhere]">
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

                  <div className="mt-3 flex flex-wrap justify-center gap-2">
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

              <div className="grid gap-3">
                <div className="flex gap-2">
                  <ShieldCheck className="shrink-0 text-emerald-700" size={19} />
                  <div>
                    <strong className="block text-xs font-extrabold">Recomendación</strong>
                    <p className="mt-1 text-xs leading-5 text-[#6B7280]">
                      Usa una imagen cuadrada de al menos 512 × 512 px.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Bell className="shrink-0 text-[#E11D48]" size={19} />
                  <div>
                    <strong className="block text-xs font-extrabold">Actualización Wallet</strong>
                    <p className="mt-1 text-xs leading-5 text-[#6B7280]">
                      Las tarjetas instaladas reciben el cambio por push.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-t border-[#E5E7EB] pt-4">
                <button
                  type="button"
                  disabled={!selectedFile || !programId || saving}
                  onClick={() => void saveLogo()}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#E11D48] @min-[26rem]:w-auto px-5 text-sm font-extrabold text-white shadow-lg shadow-rose-600/20 transition hover:bg-[#BE123C] disabled:cursor-not-allowed disabled:opacity-40"
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

          <section aria-labelledby="wallet-heading" className="min-w-0 rounded-[24px] border border-[#E5E7EB] bg-white shadow-[0_14px_42px_rgba(17,24,39,0.06)]">
            <div className="flex items-start gap-3 border-b border-[#E5E7EB] p-4 @min-[36rem]:p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-rose-50 text-[#E11D48]">
                <Bell size={20} />
              </span>
              <div>
                <h2 id="wallet-heading" className="text-base font-extrabold">Notificaciones Wallet</h2>
                <p className="mt-1 text-xs leading-5 text-[#6B7280]">
                  Vista previa de cómo verán tus clientes una notificación.
                </p>
              </div>
            </div>

            <div className="p-4 @min-[36rem]:p-5">
              <div className="rounded-2xl bg-[#111827] p-3 @min-[36rem]:p-4">
                <div className="flex items-start gap-2.5 rounded-xl bg-white p-3">
                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-1.5">
                    {displayedLogo ? (
                      <img src={displayedLogo} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <Bell size={19} className="text-[#E11D48]" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <strong className="min-w-0 text-xs font-extrabold [overflow-wrap:anywhere]">
                        {data?.organizationName ?? "Tu negocio"}
                      </strong>
                      <small className="text-[10px] text-[#6B7280]">ahora</small>
                    </div>
                    <p className="mt-1 text-sm font-extrabold leading-5 [overflow-wrap:anywhere]">
                      ¡Tienes una nueva promoción!
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#6B7280] [overflow-wrap:anywhere]">
                      Visítanos hoy y recibe un beneficio especial.
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-center text-[11px] font-semibold text-white/75 [overflow-wrap:anywhere]">
                  {selectedProgram?.name ?? "Programa de lealtad"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E7EB] px-4 py-3 text-xs @min-[36rem]:px-5">
              <span className="text-[#6B7280]">Logo guardado</span>
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                <span className="size-1.5 shrink-0 rounded-full bg-current" />
                {selectedProgram?.logoUrl ? "Personalizado" : "Predeterminado"}
              </span>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
