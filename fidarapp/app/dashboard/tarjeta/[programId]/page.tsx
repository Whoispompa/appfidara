"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Check,
  Gift,
  ImageIcon,
  LoaderCircle,
  Palette,
  Repeat2,
  Save,
  Stamp,
  Upload,
} from "lucide-react";

import { Copy, ExternalLink, FileDown } from "lucide-react";

import { QRCodeSVG } from "qrcode.react";

import { WalletCardPreview } from "@/components/dashboard/wallet-card-preview";

type RewardInformation = {
  id: string;
  name: string;
  description?: string | null;
  requiredValue: number;
};

type ProgramInformation = {
  id: string;
  organizationName?: string;
  organizationSlug?: string;
  name: string;
  description?: string | null;
  programType: number;
  targetValue: number;
  isRecurring: boolean;
  cardLogoUrl?: string | null;
  activeStampImageUrl?: string | null;
  inactiveStampImageUrl?: string | null;
  cardBackgroundColor?: string | null;
  cardForegroundColor?: string | null;
  cardLabelColor?: string | null;
  showPoweredByFidara: boolean;
  reward: RewardInformation;
};

type ProgramForm = {
  name: string;
  description: string;
  targetValue: number;
  isRecurring: boolean;
  cardBackgroundColor: string;
  cardForegroundColor: string;
  cardLabelColor: string;
  showPoweredByFidara: boolean;
  rewardName: string;
  rewardDescription: string;
};

type ImageFiles = {
  logo: File | null;
  activeStamp: File | null;
  inactiveStamp: File | null;
};

type ImagePreviews = {
  logo: string | null;
  activeStamp: string | null;
  inactiveStamp: string | null;
};

const apiUrl =
  process.env.NEXT_PUBLIC_FIDARA_API_URL ?? "https://api.fidara.mx";

function absoluteUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  return `${apiUrl}${value}`;
}

const initialForm: ProgramForm = {
  name: "",
  description: "",
  targetValue: 10,
  isRecurring: true,
  cardBackgroundColor: "#1b6726",
  cardForegroundColor: "#ffffff",
  cardLabelColor: "#f5f1e8",
  showPoweredByFidara: true,
  rewardName: "",
  rewardDescription: "",
};

const emptyProgram: ProgramInformation = {
  id: "",
  organizationName: "",

  organizationSlug: "",
  name: "",
  description: "",
  programType: 1,
  targetValue: 10,
  isRecurring: true,
  cardLogoUrl: null,
  activeStampImageUrl: null,
  inactiveStampImageUrl: null,
  cardBackgroundColor: "#1b6726",
  cardForegroundColor: "#ffffff",
  cardLabelColor: "#f5f1e8",
  showPoweredByFidara: true,

  reward: {
    id: "",
    name: "",
    description: "",
    requiredValue: 10,
  },
};

export default function CardEditorPage() {
  const router = useRouter();

  const params = useParams<{
    programId: string;
  }>();

  const [linkCopied, setLinkCopied] = useState(false);

  const programId = params.programId;

  const isNewProgram = programId === "nueva";

  const [program, setProgram] = useState<ProgramInformation | null>(null);

  const [form, setForm] = useState<ProgramForm>(initialForm);

  const [files, setFiles] = useState<ImageFiles>({
    logo: null,
    activeStamp: null,
    inactiveStamp: null,
  });

  const [previews, setPreviews] = useState<ImagePreviews>({
    logo: null,
    activeStamp: null,
    inactiveStamp: null,
  });

  const joinUrl =
    program?.id && program.organizationSlug
      ? `https://get.fidara.mx/join/${program.organizationSlug}?programId=${program.id}`
      : "";

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const loadProgram = useCallback(async () => {
    setLoading(true);
    setError("");

    if (isNewProgram) {
      setProgram(emptyProgram);

      setForm(initialForm);

      setFiles({
        logo: null,
        activeStamp: null,
        inactiveStamp: null,
      });

      setPreviews({
        logo: null,
        activeStamp: null,
        inactiveStamp: null,
      });

      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/programs/${programId}`, {
        cache: "no-store",
      });

      const payload = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload.message ?? "No fue posible cargar el programa.",
        );
      }

      const data: ProgramInformation = payload.data;

      setProgram(data);

      setForm({
        name: data.name,
        description: data.description ?? "",

        targetValue: Number(data.targetValue),

        isRecurring: data.isRecurring,

        cardBackgroundColor: data.cardBackgroundColor ?? "#1b6726",

        cardForegroundColor: data.cardForegroundColor ?? "#ffffff",

        cardLabelColor: data.cardLabelColor ?? "#f5f1e8",

        showPoweredByFidara: data.showPoweredByFidara,

        rewardName: data.reward?.name ?? "",

        rewardDescription: data.reward?.description ?? "",
      });

      setPreviews({
        logo: absoluteUrl(data.cardLogoUrl),

        activeStamp: absoluteUrl(data.activeStampImageUrl),

        inactiveStamp: absoluteUrl(data.inactiveStampImageUrl),
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible cargar el programa.",
      );
    } finally {
      setLoading(false);
    }
  }, [isNewProgram, programId, router]);

  useEffect(() => {
    void loadProgram();
  }, [loadProgram]);

  function updateField<Key extends keyof ProgramForm>(
    field: Key,
    value: ProgramForm[Key],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setSuccess("");
  }

  function selectImage(
    field: keyof ImageFiles,
    previewField: keyof ImagePreviews,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no puede superar los 5 MB.");

      event.target.value = "";
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Selecciona una imagen PNG, JPG o WebP.");

      event.target.value = "";
      return;
    }

    setFiles((current) => ({
      ...current,
      [field]: file,
    }));

    setPreviews((current) => {
      const previous = current[previewField];

      if (previous?.startsWith("blob:")) {
        URL.revokeObjectURL(previous);
      }

      return {
        ...current,
        [previewField]: URL.createObjectURL(file),
      };
    });

    setError("");
    setSuccess("");
  }

  async function copyJoinUrl() {
    if (!joinUrl) {
      return;
    }

    await navigator.clipboard.writeText(joinUrl);

    setLinkCopied(true);

    window.setTimeout(() => {
      setLinkCopied(false);
    }, 1800);
  }

  async function saveProgram(event: FormEvent) {
    event.preventDefault();

    if (!program || saving) {
      return;
    }

    if (!form.name.trim()) {
      setError("El nombre del programa es obligatorio.");

      return;
    }

    if (!form.rewardName.trim()) {
      setError("El nombre de la recompensa es obligatorio.");

      return;
    }

    if (
      !Number.isInteger(form.targetValue) ||
      form.targetValue < 1 ||
      form.targetValue > 20
    ) {
      setError("La meta debe ser un número entero entre 1 y 20.");

      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();

      formData.append("Name", form.name.trim());

      formData.append("Description", form.description.trim());

      formData.append("ProgramType", String(program.programType || 1));

      formData.append("TargetValue", String(form.targetValue));

      formData.append("IsRecurring", String(form.isRecurring));

      formData.append("CardBackgroundColor", form.cardBackgroundColor);

      formData.append("CardForegroundColor", form.cardForegroundColor);

      formData.append("CardLabelColor", form.cardLabelColor);

      formData.append("ShowPoweredByFidara", String(form.showPoweredByFidara));

      formData.append("RewardName", form.rewardName.trim());

      formData.append("RewardDescription", form.rewardDescription.trim());

      if (files.logo) {
        formData.append("Logo", files.logo);
      }

      if (files.activeStamp) {
        formData.append("ActiveStamp", files.activeStamp);
      }

      if (files.inactiveStamp) {
        formData.append("InactiveStamp", files.inactiveStamp);
      }

      const endpoint = isNewProgram
        ? "/api/programs"
        : `/api/programs/${program.id}`;

      const response = await fetch(endpoint, {
        method: isNewProgram ? "POST" : "PUT",

        body: formData,
      });

      const payload = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload.message ?? "No fue posible guardar el programa.",
        );
      }

      if (isNewProgram) {
        const createdProgramId = payload.data?.id ?? payload.programId;

        if (!createdProgramId) {
          throw new Error(
            "La API creó la tarjeta, pero no devolvió su identificador.",
          );
        }

        router.replace(`/dashboard/tarjeta/${createdProgramId}`);

        router.refresh();
        return;
      }

      const updated: ProgramInformation = payload.data;

      setProgram(updated);

      setPreviews({
        logo: absoluteUrl(updated.cardLogoUrl),

        activeStamp: absoluteUrl(updated.activeStampImageUrl),

        inactiveStamp: absoluteUrl(updated.inactiveStampImageUrl),
      });

      setFiles({
        logo: null,
        activeStamp: null,
        inactiveStamp: null,
      });

      setSuccess(payload.message ?? "Programa actualizado correctamente.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible guardar el programa.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card-editor-loading">
        <LoaderCircle className="scanner-spinner" size={28} />
        Cargando programa...
      </div>
    );
  }

  return (
    <div className="card-editor-page">
      <section className="card-editor-heading">
        <div>
          <span className="page-eyebrow">Programa de lealtad</span>

          <h1>{isNewProgram ? "Crear tarjeta" : "Editar tarjeta"}</h1>

          <p>
            Personaliza la experiencia que tus clientes guardan en su Wallet.
          </p>
        </div>

        <button
          type="submit"
          form="program-form"
          className="card-save-button"
          disabled={saving}
        >
          {saving ? (
            <>
              <LoaderCircle className="scanner-spinner" size={18} />

              {isNewProgram ? "Creando..." : "Guardando..."}
            </>
          ) : (
            <>
              <Save size={18} />

              {isNewProgram ? "Crear tarjeta" : "Guardar cambios"}
            </>
          )}
        </button>
      </section>

      {error && <div className="card-editor-alert error-box">{error}</div>}

      {success && (
        <div className="card-editor-alert success-box">
          <Check size={18} />
          {success}
        </div>
      )}

      <div className="card-editor-layout">
        <form
          id="program-form"
          className="card-settings"
          onSubmit={saveProgram}
        >
          <section className="settings-card">
            <div className="settings-card-heading">
              <span>
                <Stamp size={19} />
              </span>

              <div>
                <h2>Programa</h2>
                <p>Información principal de tu tarjeta.</p>
              </div>
            </div>

            <div className="settings-fields">
              <label>
                <span>Nombre del programa</span>

                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  maxLength={100}
                  required
                />
              </label>

              <label>
                <span>Descripción</span>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  rows={3}
                  maxLength={300}
                />
              </label>
            </div>
          </section>

          <section className="settings-card">
            <div className="settings-card-heading">
              <span>
                <Gift size={19} />
              </span>

              <div>
                <h2>Recompensa</h2>
                <p>Define qué recibe el cliente.</p>
              </div>
            </div>

            <div className="settings-fields reward-fields">
              <label>
                <span>Sellos requeridos</span>

                <input
                  type="number"
                  min={1}
                  max={20}
                  step={1}
                  value={form.targetValue}
                  onChange={(event) =>
                    updateField("targetValue", Number(event.target.value))
                  }
                  required
                />
              </label>

              <label>
                <span>Nombre de la recompensa</span>

                <input
                  value={form.rewardName}
                  onChange={(event) =>
                    updateField("rewardName", event.target.value)
                  }
                  placeholder="Ej. Café gratis"
                  maxLength={100}
                  required
                />
              </label>

              <label className="full-field">
                <span>Descripción de la recompensa</span>

                <textarea
                  value={form.rewardDescription}
                  onChange={(event) =>
                    updateField("rewardDescription", event.target.value)
                  }
                  rows={2}
                  maxLength={250}
                />
              </label>

              <label className="settings-toggle full-field">
                <input
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={(event) =>
                    updateField("isRecurring", event.target.checked)
                  }
                />

                <span className="toggle-control" />

                <span>
                  <strong>Reiniciar después del canje</strong>

                  <br />
                  <small>
                    El cliente podrá comenzar otra tarjeta al recibir su premio.
                  </small>
                </span>
                {/* 
                <Repeat2 size={18} /> */}
              </label>
            </div>
          </section>

          <section className="settings-card">
            <div className="settings-card-heading">
              <span>
                <Palette size={19} />
              </span>

              <div>
                <h2>Colores</h2>

                <p>Ajusta la identidad visual.</p>
              </div>
            </div>

            <div className="color-fields">
              <label>
                <span>Fondo</span>

                <div className="color-input">
                  <input
                    type="color"
                    value={form.cardBackgroundColor}
                    onChange={(event) =>
                      updateField("cardBackgroundColor", event.target.value)
                    }
                  />

                  <strong>{form.cardBackgroundColor}</strong>
                </div>
              </label>

              <label>
                <span>Texto</span>

                <div className="color-input">
                  <input
                    type="color"
                    value={form.cardForegroundColor}
                    onChange={(event) =>
                      updateField("cardForegroundColor", event.target.value)
                    }
                  />

                  <strong>{form.cardForegroundColor}</strong>
                </div>
              </label>

              <label>
                <span>Etiquetas</span>

                <div className="color-input">
                  <input
                    type="color"
                    value={form.cardLabelColor}
                    onChange={(event) =>
                      updateField("cardLabelColor", event.target.value)
                    }
                  />

                  <strong>{form.cardLabelColor}</strong>
                </div>
              </label>
            </div>
          </section>

          <section className="settings-card">
            <div className="settings-card-heading">
              <span>
                <ImageIcon size={19} />
              </span>

              <div>
                <h2>Imágenes</h2>

                <p>PNG, JPG o WebP de máximo 5 MB.</p>
              </div>
            </div>

            <div className="image-upload-grid">
              <label className="image-upload">
                <span>Logo de la tarjeta</span>

                <div>
                  {previews.logo ? (
                    <img src={previews.logo} alt="Logo actual" />
                  ) : (
                    <ImageIcon size={24} />
                  )}

                  <strong>
                    <Upload size={15} />
                    Cambiar
                  </strong>
                </div>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => selectImage("logo", "logo", event)}
                />
              </label>

              <label className="image-upload">
                <span>Sello activo</span>

                <div>
                  {previews.activeStamp ? (
                    <img src={previews.activeStamp} alt="Sello activo" />
                  ) : (
                    <Stamp size={24} />
                  )}

                  <strong>
                    <Upload size={15} />
                    Cambiar
                  </strong>
                </div>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) =>
                    selectImage("activeStamp", "activeStamp", event)
                  }
                />
              </label>

              <label className="image-upload">
                <span>Sello inactivo</span>

                <div>
                  {previews.inactiveStamp ? (
                    <img src={previews.inactiveStamp} alt="Sello inactivo" />
                  ) : (
                    <Stamp size={24} />
                  )}

                  <strong>
                    <Upload size={15} />
                    Cambiar
                  </strong>
                </div>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) =>
                    selectImage("inactiveStamp", "inactiveStamp", event)
                  }
                />
              </label>
            </div>

            {/* <label className="settings-toggle powered-toggle">
              <input
                type="checkbox"
                checked={form.showPoweredByFidara}
                onChange={(event) =>
                  updateField("showPoweredByFidara", event.target.checked)
                }
              />

              <span className="toggle-control" />

              <span>
                <strong>Mostrar Powered by Fidara</strong>

                <small>Aparecerá junto al código QR.</small>
              </span>
            </label> */}
          </section>
        </form>

        <aside className="wallet-preview-column">
          <div className="wallet-preview-sticky">
            <span className="page-eyebrow">Vista previa</span>

            <h2>Apple Wallet</h2>

            <WalletCardPreview
              name={form.name}
              logoUrl={previews.logo}
              activeStampUrl={previews.activeStamp}
              inactiveStampUrl={previews.inactiveStamp}
              backgroundColor={form.cardBackgroundColor}
              foregroundColor={form.cardForegroundColor}
              labelColor={form.cardLabelColor}
              targetValue={form.targetValue}
              balance={4}
              rewardsAvailable={0}
              showPoweredByFidara={form.showPoweredByFidara}
            />

            <p className="preview-note">
              Esta vista es aproximada. Apple Wallet ajusta algunos tamaños
              según el dispositivo.
            </p>
          </div>
          {joinUrl && program && (
            <section className="join-share-panel">
              <div className="join-share-heading">
                <span className="page-eyebrow">Comparte tu tarjeta</span>

                <h2>Enlace de inscripción</h2>

                <p>
                  Tus clientes pueden escanear este código para obtener la
                  tarjeta.
                </p>
              </div>

              <div className="join-share-qr">
                <QRCodeSVG
                  value={joinUrl}
                  size={210}
                  level="H"
                  marginSize={2}
                  bgColor="#ffffff"
                  fgColor="#111111"
                  title={`Unirse a ${program.name}`}
                />
              </div>

              <div className="join-url-field">
                <span>{joinUrl}</span>

                <button
                  type="button"
                  onClick={() => void copyJoinUrl()}
                  aria-label="Copiar enlace"
                >
                  {linkCopied ? <Check size={17} /> : <Copy size={17} />}
                </button>
              </div>

              <div className="join-share-actions">
                <a
                  href={joinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="open-join-button"
                >
                  <ExternalLink size={17} />
                  Abrir enlace
                </a>

                <a
                  href={`/material/${program.id}?print=1`}
                  target="_blank"
                  rel="noreferrer"
                  className="pdf-material-button"
                >
                  <FileDown size={17} />
                  Descargar PDF
                </a>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
