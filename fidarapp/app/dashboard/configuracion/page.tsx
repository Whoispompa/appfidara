"use client";

import { AlertTriangle, Bell, ImageIcon, LoaderCircle, Palette, Save, UploadCloud, X } from "lucide-react";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { Poppins } from "next/font/google";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { type OrganizationBranding, resolveLogoUrl } from "@/lib/branding";
import styles from "./configuration.module.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700", "800"], display: "swap" });

type Program = {
  id: string;
  name: string;
  programType?: number;
  cardLogoUrl?: string | null;
  logoUrl?: string | null;
  isActive?: boolean;
};
type ApiResponse<T> = { success?: boolean; message?: string; data?: T };
type UpdateResult = { organizationLogoUrl: string };

const acceptedTypes = ["image/png", "image/jpeg", "image/webp"];
const maximumBytes = 5 * 1024 * 1024;
const programTypeNames: Record<number, string> = {
  1: "Sellos", 2: "Puntos", 3: "Cashback", 4: "Cupones", 5: "Gift Card", 6: "Suscripciones",
};

async function readResponse<T>(response: Response, errorMessage: string) {
  if (response.status === 401) {
    sessionStorage.removeItem("fidara_session");
    window.location.replace("/login");
    throw new Error("Tu sesión ha expirado.");
  }
  const payload = (await response.json().catch(() => ({}))) as ApiResponse<T>;
  if (!response.ok || payload.success === false || !payload.data) throw new Error(payload.message ?? errorMessage);
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
  const walletLogo = resolveLogoUrl(selectedProgram?.cardLogoUrl ?? selectedProgram?.logoUrl);
  const displayedLogo = previewUrl ?? organizationLogoUrl;

  function loadBranding(signal?: AbortSignal) {
    const errorMessage = "No fue posible cargar el logo del negocio.";
    return fetch("/api/settings/branding", { cache: "no-store", signal })
      .then((response) => readResponse<OrganizationBranding>(response, errorMessage))
      .then((data) => { if (!signal?.aborted) setOrganizationLogoUrl(resolveLogoUrl(data.organizationLogoUrl)); })
      .catch((caught) => { if (!signal?.aborted) setError(caught instanceof Error ? caught.message : errorMessage); })
      .finally(() => { if (!signal?.aborted) setLoading(false); });
  }

  function loadPrograms(signal?: AbortSignal) {
    const errorMessage = "No fue posible cargar los programas.";
    return fetch("/api/programs", { cache: "no-store", signal })
      .then((response) => readResponse<Program[]>(response, errorMessage))
      .then((data) => {
        if (signal?.aborted) return;
        if (!Array.isArray(data)) throw new Error(errorMessage);
        setPrograms(data);
        setProgramId((current) => data.some((program) => program.id === current) ? current : data[0]?.id ?? "");
      })
      .catch((caught) => { if (!signal?.aborted) setProgramError(caught instanceof Error ? caught.message : errorMessage); })
      .finally(() => { if (!signal?.aborted) setLoadingPrograms(false); });
  }

  useEffect(() => {
    const controller = new AbortController();
    void loadBranding(controller.signal);
    void loadPrograms(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function clearSelection() {
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function selectFile(file?: File) {
    if (!file || saving) return;
    if (!acceptedTypes.includes(file.type)) {
      toast.error("Formato no compatible", { description: "Selecciona una imagen PNG, JPG o WebP." });
      return;
    }
    if (file.size > maximumBytes) {
      toast.error("Archivo demasiado grande", { description: "El logo no puede pesar más de 5 MB." });
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) { selectFile(event.target.files?.[0]); }
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
      const response = await fetch("/api/organizations/me/logo", { method: "PUT", body: formData });
      const updated = await readResponse<UpdateResult>(response, "No fue posible guardar el logo.");
      const logoUrl = resolveLogoUrl(updated.organizationLogoUrl);
      if (!logoUrl) throw new Error("La API no devolvió un logo válido.");
      setOrganizationLogoUrl(logoUrl);
      setError("");
      try {
        const rawSession = sessionStorage.getItem("fidara_session");
        if (rawSession) {
          const currentSession = JSON.parse(rawSession) as Record<string, unknown>;
          sessionStorage.setItem("fidara_session", JSON.stringify({ ...currentSession, organizationLogoUrl: logoUrl }));
        }
      } catch {
        // El logo ya quedó guardado; la sesión se renovará al entrar de nuevo.
      }
      window.dispatchEvent(new CustomEvent("fidara:branding-updated", { detail: logoUrl }));
      clearSelection();
      toast.success("Identidad actualizada", { description: "El logo de tu negocio se actualizó en el panel." });
    } catch (caught) {
      toast.error("No se pudo guardar", { description: caught instanceof Error ? caught.message : "Ocurrió un error inesperado." });
    } finally { setSaving(false); }
  }

  if (loading || loadingPrograms) return <ConfigurationSkeleton />;

  return (
    <main className={`${styles.page} ${poppins.className}`}>
      <header className={styles.heading}>
        <h1>Configuración</h1>
      </header>

      {error && (
        <div role="alert" className={styles.alert}>
          <span><AlertTriangle size={17} />{error}</span>
          <button type="button" disabled={saving} onClick={() => { setLoading(true); setError(""); void loadBranding(); }}>Reintentar</button>
        </div>
      )}

      <div className={styles.sections}>
        <section aria-labelledby="identity-heading" className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.iconBox}><Palette size={20} /></span>
            <div><h2 id="identity-heading">Identidad del negocio</h2><p>Este logo aparece junto al nombre de tu negocio en el panel.</p></div>
          </div>
          <div className={styles.cardBody} aria-busy={saving}>
            <div className={styles.logoGuidance}>
              <span className={styles.label}>Logo del negocio</span>
              <p>Recomendado: 512 × 512 px, PNG con fondo transparente.</p>
            </div>
            <div className={`${styles.dropzone} ${dragging ? styles.dragging : ""}`} onDragEnter={(event) => { event.preventDefault(); if (!saving) setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={handleDrop}>
              <div className={styles.logoPresentation}>
                {displayedLogo ? (
                  <Avatar className={styles.businessLogo}><AvatarImage key={displayedLogo} src={displayedLogo} alt="Logo del negocio" /><AvatarFallback><ImageIcon size={28} /></AvatarFallback></Avatar>
                ) : <span className={styles.emptyLogo}><UploadCloud size={28} /></span>}
                <div className={styles.logoCopy}>
                  <strong title={selectedFile?.name}>{selectedFile?.name ?? (displayedLogo ? "Logo actual" : "Agrega el logo de tu negocio")}</strong>
                  <p>{selectedFile ? `${(selectedFile.size / 1024).toFixed(0)} KB · listo para guardar` : "PNG, JPG o WebP · máximo 5 MB"}</p>
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} disabled={saving} hidden />
              <div className={styles.fileActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => fileInputRef.current?.click()} disabled={saving}><ImageIcon size={16} />{displayedLogo ? "Cambiar imagen" : "Seleccionar imagen"}</button>
                {selectedFile && <button type="button" className={styles.cancelButton} onClick={clearSelection} disabled={saving}><X size={16} />Cancelar cambio</button>}
              </div>
            </div>
            <div className={styles.cardActions}>
              <button type="button" className={styles.primaryButton} disabled={!selectedFile || saving} onClick={() => void saveLogo()}>
                {saving ? <LoaderCircle className={styles.spinner} size={17} /> : <Save size={17} />}{saving ? "Actualizando…" : "Guardar identidad"}
              </button>
            </div>
          </div>
        </section>

        <section aria-labelledby="wallet-heading" className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.iconBox}><Bell size={20} /></span>
            <div><h2 id="wallet-heading">Logos de Wallet</h2><p>Consulta la identidad guardada para cada programa.</p></div>
          </div>
          <div className={styles.cardBody}>
            {programError ? (
              <div role="alert" className={styles.inlineError}><p>{programError}</p><button type="button" onClick={() => { setLoadingPrograms(true); setProgramError(""); void loadPrograms(); }}>Reintentar</button></div>
            ) : selectedProgram ? (
              <>
                <label><span className={styles.label}>Programa de lealtad</span><select value={programId} onChange={(event) => setProgramId(event.target.value)}>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}{program.isActive === false ? " · Inactivo" : ""}</option>)}</select></label>
                <div className={styles.walletPreview}>
                  {walletLogo ? (
                    <Avatar className={styles.walletLogo}><AvatarImage key={walletLogo} src={walletLogo} alt={`Logo de ${selectedProgram.name}`} /><AvatarFallback><ImageIcon size={24} /></AvatarFallback></Avatar>
                  ) : <span className={styles.walletEmpty}><ImageIcon size={25} /></span>}
                  <div><strong>{selectedProgram.name}</strong><span>{programTypeNames[selectedProgram.programType ?? 0] ?? "Programa de lealtad"}</span><p>{walletLogo ? "Logo personalizado" : "Sin logo personalizado"}</p></div>
                </div>
                <p className={styles.readOnlyNote}>El logo de Wallet se modifica únicamente desde el editor de tarjetas.</p>
              </>
            ) : (
              <div className={styles.emptyState}><span><ImageIcon size={24} /></span><strong>Sin programas disponibles</strong><p>Los programas que crees aparecerán aquí.</p></div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function ConfigurationSkeleton() {
  return (
    <main className={`${styles.page} ${styles.skeleton} ${poppins.className}`}>
      <span className="sr-only" role="status">Cargando configuración…</span>
      <div aria-hidden="true"><span className={styles.skeletonTitle} /><span className={styles.skeletonDescription} /></div>
      <div className={styles.sections} aria-hidden="true">
        <section className={styles.card}>
          <div className={styles.cardHeader}><span className={styles.skeletonIcon} /><div className={styles.skeletonHeaderCopy}><span className={styles.skeletonHeading} /><span className={styles.skeletonLine} /></div></div>
          <div className={styles.skeletonBody}>
            <div className={styles.skeletonGuidance}><span className={styles.skeletonLabel} /><span className={styles.skeletonHint} /></div>
            <div className={styles.skeletonUpload}>
              <div className={styles.skeletonLogoRow}><span className={styles.skeletonBusinessLogo} /><div className={styles.skeletonFileCopy}><span /><span /></div></div>
              <span className={styles.skeletonChangeButton} />
            </div>
            <div className={styles.skeletonActions}><span className={styles.skeletonSaveButton} /></div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}><span className={styles.skeletonIcon} /><div className={styles.skeletonHeaderCopy}><span className={styles.skeletonHeading} /><span className={styles.skeletonLine} /></div></div>
          <div className={styles.skeletonBody}>
            <div><span className={styles.skeletonLabel} /><span className={styles.skeletonSelect} /></div>
            <div className={styles.skeletonWalletPreview}><span className={styles.skeletonWalletLogo} /><div className={styles.skeletonProgramCopy}><span /><span /><span /></div></div>
            <span className={styles.skeletonNote} />
          </div>
        </section>
      </div>
    </main>
  );
}
