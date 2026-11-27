"use client";

import {
  AlertTriangle,
  Bell,
  ImageIcon,
  LoaderCircle,
  Palette,
  Save,
  UploadCloud,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Poppins } from "next/font/google";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { type OrganizationBranding, resolveLogoUrl } from "@/lib/branding";
import pageStyles from "../clientes/customers.module.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700", "800"], display: "swap" });

type Program = {
  id: string;
  name: string;
  cardLogoUrl?: string | null;
  logoUrl?: string | null;
  isActive?: boolean;
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type UpdateResult = {
  organizationLogoUrl: string;
};

const acceptedTypes = ["image/png", "image/jpeg", "image/webp"];
const maximumBytes = 5 * 1024 * 1024;

async function readResponse<T>(response: Response, errorMessage: string) {
  if (response.status === 401) {
    sessionStorage.removeItem("fidara_session");
    window.location.replace("/login");
    throw new Error("Tu sesión ha expirado.");
  }

  const payload = (await response.json().catch(() => ({}))) as ApiResponse<T>;
  if (!response.ok || payload.success === false || !payload.data) {
    throw new Error(payload.message ?? errorMessage);
  }

  return payload.data;
}

export default function ConfigurationPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [organizationLogoUrl, setOrganizationLogoUrl] = useState<string | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programId, setProgramId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [programError, setProgramError] = useState("");

  const selectedProgram = programs.find((program) => program.id === programId);
  const walletLogo = resolveLogoUrl(
    selectedProgram?.cardLogoUrl ?? selectedProgram?.logoUrl,
  );
  const displayedLogo = previewUrl ?? organizationLogoUrl;

  function loadBranding(signal?: AbortSignal) {
    const errorMessage = "No fue posible cargar el logo del negocio.";

    return fetch("/api/settings/branding", { cache: "no-store", signal })
      .then((response) => readResponse<OrganizationBranding>(response, errorMessage))
      .then((data) => {
        if (!signal?.aborted) setOrganizationLogoUrl(resolveLogoUrl(data.organizationLogoUrl));
      })
      .catch((caught) => {
        if (!signal?.aborted) setError(caught instanceof Error ? caught.message : errorMessage);
      })
      .finally(() => {
        if (!signal?.aborted) setLoading(false);
      });
  }

  function loadPrograms(signal?: AbortSignal) {
    const errorMessage = "No fue posible cargar los programas.";

    return fetch("/api/programs", { cache: "no-store", signal })
      .then((response) => readResponse<Program[]>(response, errorMessage))
      .then((data) => {
        if (signal?.aborted) return;
        if (!Array.isArray(data)) throw new Error(errorMessage);

        setPrograms(data);
        setProgramId((current) =>
          data.some((program) => program.id === current) ? current : data[0]?.id ?? "",
        );
      })
      .catch((caught) => {
        if (!signal?.aborted) setProgramError(caught instanceof Error ? caught.message : errorMessage);
      })
      .finally(() => {
        if (!signal?.aborted) setLoadingPrograms(false);
      });
  }

  useEffect(() => {
    const controller = new AbortController();
    void loadBranding(controller.signal);
    void loadPrograms(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function clearSelection() {
    setPreviewUrl(null);
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function selectFile(file?: File) {
    if (!file || saving) return;

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

  async function saveLogo() {
    if (!selectedFile || loading || saving) return;

    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("Logo", selectedFile);

      const response = await fetch("/api/organizations/me/logo", {
        method: "PUT",
        body: formData,
      });
      const updated = await readResponse<UpdateResult>(
        response,
        "No fue posible guardar el logo.",
      );
      const logoUrl = resolveLogoUrl(updated.organizationLogoUrl);
      if (!logoUrl) throw new Error("La API no devolvió un logo válido.");

      setOrganizationLogoUrl(logoUrl);
      setError("");

      try {
        const rawSession = sessionStorage.getItem("fidara_session");

        if (rawSession) {
          const currentSession = JSON.parse(rawSession) as Record<string, unknown>;

          sessionStorage.setItem(
            "fidara_session",
            JSON.stringify({
              ...currentSession,
              organizationLogoUrl: logoUrl,
            }),
          );
        }
      } catch {
        // El logo ya quedó guardado en la API; la sesión se renovará al entrar de nuevo.
      }

      window.dispatchEvent(new CustomEvent("fidara:branding-updated", { detail: logoUrl }));
      clearSelection();

      toast.success("Identidad actualizada", {
        description: "El logo de tu negocio se actualizó en el panel.",
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
    <div className={`${pageStyles.page} @container`} style={poppins.style}>
      <header className={pageStyles.heading}>
        <div>
          <span className={pageStyles.eyebrow}>
            NEGOCIO
          </span>
          <h1>
            Configuración
          </h1>
          <p>
            Personaliza el logo de tu negocio en el panel y consulta los logos de tus tarjetas Wallet.
          </p>
        </div>
      </header>

      {error && (
        <div role="alert" className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span className="flex min-w-0 items-start gap-2 [overflow-wrap:anywhere]">
            <AlertTriangle className="mt-0.5 shrink-0" size={17} />
            {error}
          </span>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              setLoading(true);
              setError("");
              void loadBranding();
            }}
            className="font-extrabold disabled:opacity-40"
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="grid min-w-0 items-start gap-5 @min-[44rem]:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] @min-[64rem]:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section aria-labelledby="identity-heading" className="min-w-0 rounded-[24px] border border-[#E5E7EB] bg-white shadow-[0_14px_42px_rgba(17,24,39,0.06)]">
          <div className="flex items-start gap-3 border-b border-[#E5E7EB] p-4 @min-[36rem]:p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-50 text-[#E11D48]">
              <Palette size={20} />
            </span>
            <div>
              <h2 id="identity-heading" className="text-base font-extrabold">Identidad del negocio</h2>
              <p className="mt-1 text-xs leading-5 text-[#6B7280]">
                Este logo aparece junto al nombre de tu negocio en el encabezado del panel.
              </p>
            </div>
          </div>

          {loading ? (
            <div role="status" className="grid min-h-56 place-items-center">
              <LoaderCircle className="animate-spin text-[#E11D48]" size={30} />
              <span className="sr-only">Cargando el logo del negocio</span>
            </div>
          ) : (
            <div aria-busy={saving} className="space-y-5 p-4 @min-[36rem]:p-5">
              <div>
                <span className="mb-2 block text-xs font-extrabold">Logo del negocio</span>
                <div
                  onDragEnter={(event) => {
                    event.preventDefault();
                    if (!saving) setDragging(true);
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
                      <Avatar className="size-20 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-2 [&_[data-slot=avatar-image]]:rounded-none [&_[data-slot=avatar-image]]:object-contain">
                        <AvatarImage
                          key={displayedLogo}
                          src={displayedLogo}
                          alt="Logo del negocio"
                        />
                        <AvatarFallback><ImageIcon size={24} /></AvatarFallback>
                      </Avatar>
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
                    disabled={saving}
                    className="hidden"
                  />

                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={saving}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 text-xs font-extrabold transition hover:border-[#E11D48] hover:text-[#E11D48] disabled:opacity-40"
                    >
                      <ImageIcon size={15} />
                      {displayedLogo ? "Cambiar imagen" : "Seleccionar imagen"}
                    </button>
                    {selectedFile && (
                      <button
                        type="button"
                        onClick={clearSelection}
                        disabled={saving}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-extrabold text-[#6B7280] hover:bg-white disabled:opacity-40"
                      >
                        <X size={15} />
                        Cancelar cambio
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-t border-[#E5E7EB] pt-4">
                <button
                  type="button"
                  disabled={!selectedFile || saving}
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
          )}
        </section>

        <section aria-labelledby="wallet-heading" className="min-w-0 rounded-[24px] border border-[#E5E7EB] bg-white shadow-[0_14px_42px_rgba(17,24,39,0.06)]">
          <div className="flex items-start gap-3 border-b border-[#E5E7EB] p-4 @min-[36rem]:p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-rose-50 text-[#E11D48]">
              <Bell size={20} />
            </span>
            <div>
              <h2 id="wallet-heading" className="text-base font-extrabold">Logos de Wallet</h2>
              <p className="mt-1 text-xs leading-5 text-[#6B7280]">
                Consulta el logo guardado de cada programa. Puedes cambiarlo en el editor de tarjetas del programa.
              </p>
            </div>
          </div>

          <div className="space-y-4 p-4 @min-[36rem]:p-5">
            {loadingPrograms ? (
              <div role="status" className="flex items-center gap-2 text-sm text-[#6B7280]">
                <LoaderCircle className="animate-spin text-[#E11D48]" size={17} />
                Cargando programas…
              </div>
            ) : programError ? (
              <div role="alert" className="space-y-2 text-sm text-rose-800">
                <p>{programError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setLoadingPrograms(true);
                    setProgramError("");
                    void loadPrograms();
                  }}
                  className="font-extrabold"
                >
                  Reintentar
                </button>
              </div>
            ) : selectedProgram ? (
              <>
                {programs.length > 1 && (
                  <label className="block">
                    <span className="mb-2 block text-xs font-extrabold">Programa de lealtad</span>
                    <select
                      value={programId}
                      onChange={(event) => setProgramId(event.target.value)}
                      className="h-12 w-full min-w-0 truncate rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#111827] outline-none transition focus:border-[#E11D48] focus:ring-4 focus:ring-rose-100"
                    >
                      {programs.map((program) => (
                        <option key={program.id} value={program.id}>
                          {program.name}{program.isActive === false ? " · Inactivo" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] p-3">
                  <Avatar className="size-14 overflow-hidden rounded-xl bg-white p-1.5 [&_[data-slot=avatar-image]]:rounded-none [&_[data-slot=avatar-image]]:object-contain">
                    {walletLogo && <AvatarImage key={walletLogo} src={walletLogo} alt="" />}
                    <AvatarFallback><ImageIcon size={20} /></AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold [overflow-wrap:anywhere]">
                      {selectedProgram.name}
                    </p>
                    <p className="mt-1 text-xs text-[#6B7280]">
                      {walletLogo ? "Logo guardado" : "Sin logo personalizado"}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-[#6B7280]">Aún no hay programas disponibles.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
