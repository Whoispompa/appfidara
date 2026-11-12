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
  BadgePercent,
  Banknote,
  Check,
  Coins,
  CreditCard,
  Crown,
  Gift,
  ImageIcon,
  LoaderCircle,
  Palette,
  Save,
  Stamp,
  Ticket,
  Upload,
  Users,
  X,
} from "lucide-react";

import { Copy, ExternalLink, FileDown } from "lucide-react";

import { QRCodeSVG } from "qrcode.react";

import { WalletCardPreview } from "@/components/dashboard/wallet-card-preview";

type RewardInformation = {
  id: string;
  name: string;
  description?: string | null;
  requiredValue: number;
  rewardType: number;
  rewardValue?: number | null;
};

type ProgramInformation = {
  id: string;
  organizationName?: string;
  organizationSlug?: string;
  name: string;
  description?: string | null;
  programType: number;
  targetValue: number;
  pointsEarned?: number | null;
  amountRequired?: number | null;
  pointsEarningMethod?: number | null;
  limitOneVisitPerDay?: boolean;
  isRecurring: boolean;
  cardLogoUrl?: string | null;
  activeStampImageUrl?: string | null;
  inactiveStampImageUrl?: string | null;
  cardBackgroundColor?: string | null;
  cardForegroundColor?: string | null;
  cardLabelColor?: string | null;
  cardStripImageUrl?: string | null;
  cardStripColor?: string | null;
  showPoweredByFidara: boolean;
  reward: RewardInformation;
};

type ProgramForm = {
  programType: number;
  name: string;
  description: string;
  targetValue: number;
  pointsEarned: number;
  amountRequired: number;
  pointsEarningMethod: number;
  limitOneVisitPerDay: boolean;
  isRecurring: boolean;
  cardBackgroundColor: string;
  cardForegroundColor: string;
  cardLabelColor: string;
  cardStripColor: string;
  stripDesignMode: "image" | "color";
  showPoweredByFidara: boolean;
  rewardName: string;
  rewardDescription: string;
  rewardType: number;
  rewardValue: number;
};

type ImageFiles = {
  logo: File | null;
  activeStamp: File | null;
  inactiveStamp: File | null;
  stripImage: File | null;
};

type ImagePreviews = {
  logo: string | null;
  activeStamp: string | null;
  inactiveStamp: string | null;
  stripImage: string | null;
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
  programType: 1,
  name: "",
  description: "",
  targetValue: 10,
  pointsEarned: 1,
  amountRequired: 10,
  pointsEarningMethod: 1,
  limitOneVisitPerDay: false,
  isRecurring: true,
  cardBackgroundColor: "#1b6726",
  cardForegroundColor: "#ffffff",
  cardLabelColor: "#f5f1e8",
  cardStripColor: "#14532d",
  stripDesignMode: "color",
  showPoweredByFidara: true,
  rewardName: "",
  rewardDescription: "",
  rewardType: 1,
  rewardValue: 0,
};

const emptyProgram: ProgramInformation = {
  id: "",
  organizationName: "",

  organizationSlug: "",
  name: "",
  description: "",
  programType: 1,
  targetValue: 10,
  pointsEarned: null,
  amountRequired: null,
  pointsEarningMethod: 1,
  limitOneVisitPerDay: false,
  isRecurring: true,
  cardLogoUrl: null,
  activeStampImageUrl: null,
  inactiveStampImageUrl: null,
  cardBackgroundColor: "#1b6726",
  cardForegroundColor: "#ffffff",
  cardLabelColor: "#f5f1e8",
  cardStripImageUrl: null,
  cardStripColor: "#14532d",
  showPoweredByFidara: true,

  reward: {
    id: "",
    name: "",
    description: "",
    requiredValue: 10,
    rewardType: 1,
    rewardValue: null,
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

  const [programTypeSelected, setProgramTypeSelected] = useState(!isNewProgram);

  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const [program, setProgram] = useState<ProgramInformation | null>(null);

  const [form, setForm] = useState<ProgramForm>(initialForm);

  const [files, setFiles] = useState<ImageFiles>({
    logo: null,
    activeStamp: null,
    inactiveStamp: null,
    stripImage: null,
  });

  const [previews, setPreviews] = useState<ImagePreviews>({
    logo: null,
    activeStamp: null,
    inactiveStamp: null,
    stripImage: null,
  });

  const joinUrl =
    program?.id && program.organizationSlug
      ? `https://get.fidara.mx/join/${program.organizationSlug}?programId=${program.id}`
      : "";

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const isStampProgram = form.programType === 1;
  const isPointsProgram = form.programType === 2;

  const loadProgram = useCallback(async () => {
    setLoading(true);
    setError("");

    if (isNewProgram) {
      setProgram(emptyProgram);

      setForm(initialForm);

      setProgramTypeSelected(false);

      setShowTypeSelector(true);

      setFiles({
        logo: null,
        activeStamp: null,
        inactiveStamp: null,
        stripImage: null,
      });

      setPreviews({
        logo: null,
        activeStamp: null,
        inactiveStamp: null,
        stripImage: null,
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

      setProgramTypeSelected(true);

      setShowTypeSelector(false);

      setForm({
        programType: Number(data.programType) || 1,
        name: data.name,
        description: data.description ?? "",

        targetValue: Number(data.targetValue),

        pointsEarned: Number(data.pointsEarned ?? 1),

        amountRequired: Number(data.amountRequired ?? 10),

        pointsEarningMethod: Number(data.pointsEarningMethod ?? 1),

        limitOneVisitPerDay: Boolean(data.limitOneVisitPerDay),

        isRecurring: data.isRecurring,

        cardBackgroundColor: data.cardBackgroundColor ?? "#1b6726",

        cardForegroundColor: data.cardForegroundColor ?? "#ffffff",

        cardLabelColor: data.cardLabelColor ?? "#f5f1e8",

        cardStripColor: data.cardStripColor ?? "#14532d",

        stripDesignMode: data.cardStripImageUrl ? "image" : "color",

        showPoweredByFidara: data.showPoweredByFidara,

        rewardName: data.reward?.name ?? "",

        rewardDescription: data.reward?.description ?? "",

        rewardType: Number(data.reward?.rewardType ?? 1),

        rewardValue: Number(data.reward?.rewardValue ?? 0),
      });

      setPreviews({
        logo: absoluteUrl(data.cardLogoUrl),

        activeStamp: absoluteUrl(data.activeStampImageUrl),

        inactiveStamp: absoluteUrl(data.inactiveStampImageUrl),

        stripImage: absoluteUrl(data.cardStripImageUrl),
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

  function selectProgramType(programType: 1 | 2) {
    setForm((current) => ({
      ...current,
      programType,
      targetValue: programType === 1 ? 10 : 100,
      pointsEarned: programType === 1 ? 1 : current.pointsEarned || 1,
      amountRequired: programType === 1 ? 10 : current.amountRequired || 10,
      pointsEarningMethod:
        programType === 1 ? 1 : current.pointsEarningMethod || 1,
      limitOneVisitPerDay:
        programType === 1 ? false : current.limitOneVisitPerDay,
    }));

    setProgramTypeSelected(true);
    setShowTypeSelector(false);
    setError("");
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

  async function selectStripImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.type !== "image/png") {
      setError("La imagen central debe estar en formato PNG.");
      event.target.value = "";
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setError("La imagen central no puede pesar más de 3 MB.");
      event.target.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    try {
      const dimensions = await new Promise<{
        width: number;
        height: number;
      }>((resolve, reject) => {
        const image = new Image();

        image.onload = () =>
          resolve({
            width: image.naturalWidth,
            height: image.naturalHeight,
          });

        image.onerror = () =>
          reject(new Error("No fue posible leer la imagen central."));

        image.src = objectUrl;
      });

      if (dimensions.width < 1125 || dimensions.height < 432) {
        URL.revokeObjectURL(objectUrl);
        setError("La imagen central debe medir al menos 1125 × 432 px.");
        event.target.value = "";
        return;
      }

      setFiles((current) => ({
        ...current,
        stripImage: file,
      }));

      setPreviews((current) => {
        if (current.stripImage?.startsWith("blob:")) {
          URL.revokeObjectURL(current.stripImage);
        }

        return {
          ...current,
          stripImage: objectUrl,
        };
      });

      updateField("stripDesignMode", "image");
      setError("");
      setSuccess("");
    } catch (caught) {
      URL.revokeObjectURL(objectUrl);
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible leer la imagen central.",
      );
      event.target.value = "";
    }
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

    if (isStampProgram) {
      if (
        !Number.isInteger(form.targetValue) ||
        form.targetValue < 1 ||
        form.targetValue > 20
      ) {
        setError("La meta debe ser un número entero entre 1 y 20 sellos.");
        return;
      }
    }

    if (isPointsProgram) {
      if (form.targetValue <= 0) {
        setError(
          "Los puntos necesarios para la recompensa deben ser mayores a cero.",
        );
        return;
      }

      if (form.pointsEarned <= 0) {
        setError("Los puntos otorgados deben ser mayores a cero.");
        return;
      }

      if (form.pointsEarningMethod === 1 && form.amountRequired <= 0) {
        setError(
          "El importe necesario para generar puntos debe ser mayor a cero.",
        );
        return;
      }
    }

    if (
      form.rewardType === 3 &&
      (form.rewardValue <= 0 || form.rewardValue > 100)
    ) {
      setError("El porcentaje de descuento debe estar entre 1 y 100.");
      return;
    }

    if (form.rewardType === 2 && form.rewardValue <= 0) {
      setError("El valor del descuento debe ser mayor a cero.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();

      formData.append("Name", form.name.trim());

      formData.append("Description", form.description.trim());

      formData.append("ProgramType", String(form.programType));

      formData.append("TargetValue", String(form.targetValue));

      if (isPointsProgram) {
        formData.append("PointsEarned", String(form.pointsEarned));
        formData.append(
          "PointsEarningMethod",
          String(form.pointsEarningMethod),
        );
        formData.append(
          "LimitOneVisitPerDay",
          String(form.pointsEarningMethod === 2 && form.limitOneVisitPerDay),
        );
        formData.append("CardStripColor", form.cardStripColor);

        if (form.pointsEarningMethod === 1) {
          formData.append("AmountRequired", String(form.amountRequired));
        }

        if (form.stripDesignMode === "image" && files.stripImage) {
          formData.append("StripImage", files.stripImage);
        }
      }

      formData.append("IsRecurring", String(form.isRecurring));

      formData.append("CardBackgroundColor", form.cardBackgroundColor);

      formData.append("CardForegroundColor", form.cardForegroundColor);

      formData.append("CardLabelColor", form.cardLabelColor);

      formData.append("ShowPoweredByFidara", String(form.showPoweredByFidara));

      formData.append("RewardName", form.rewardName.trim());

      formData.append("RewardDescription", form.rewardDescription.trim());

      formData.append("RewardType", String(form.rewardType));

      if (form.rewardType === 2 || form.rewardType === 3) {
        formData.append("RewardValue", String(form.rewardValue));
      }

      if (files.logo) {
        formData.append("Logo", files.logo);
      }

      if (isStampProgram && files.activeStamp) {
        formData.append("ActiveStamp", files.activeStamp);
      }

      if (isStampProgram && files.inactiveStamp) {
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

        stripImage: absoluteUrl(updated.cardStripImageUrl),
      });

      setFiles({
        logo: null,
        activeStamp: null,
        inactiveStamp: null,
        stripImage: null,
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
      {showTypeSelector && isNewProgram && (
        <div
          className="card-type-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="card-type-modal-title"
        >
          <section className="card-type-modal">
            <div className="card-type-modal-heading">
              <div>
                <span className="page-eyebrow">Programa de lealtad</span>
                <h2 id="card-type-modal-title">Elige el tipo de tarjeta</h2>
                <p>
                  Selecciona cómo quieres recompensar a tus clientes. Podrás
                  personalizar el diseño en el siguiente paso.
                </p>
              </div>

              <button
                type="button"
                className="card-type-modal-close"
                aria-label="Cerrar selector"
                onClick={() => {
                  if (programTypeSelected) {
                    setShowTypeSelector(false);
                  } else {
                    router.back();
                  }
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="card-type-catalog">
              <button
                type="button"
                className="card-type-option available"
                onClick={() => selectProgramType(1)}
              >
                <span className="card-type-icon">
                  <Stamp size={25} />
                </span>
                <span className="card-type-copy">
                  <strong>Sellos</strong>
                  <small>
                    Premia compras o visitas con una tarjeta visual.
                  </small>
                </span>
                <span className="card-type-status available">Disponible</span>
              </button>

              <button
                type="button"
                className="card-type-option available"
                onClick={() => selectProgramType(2)}
              >
                <span className="card-type-icon">
                  <Coins size={25} />
                </span>
                <span className="card-type-copy">
                  <strong>Puntos</strong>
                  <small>Acumula puntos por gasto o por cada visita.</small>
                </span>
                <span className="card-type-status available">Disponible</span>
              </button>

              <button
                type="button"
                className="card-type-option upcoming"
                disabled
              >
                <span className="card-type-icon">
                  <Gift size={25} />
                </span>
                <span className="card-type-copy">
                  <strong>Premios</strong>
                  <small>Entrega productos o beneficios sin acumulación.</small>
                </span>
                <span className="card-type-status">Próximamente</span>
              </button>

              <button
                type="button"
                className="card-type-option upcoming"
                disabled
              >
                <span className="card-type-icon">
                  <Users size={25} />
                </span>
                <span className="card-type-copy">
                  <strong>Afiliación</strong>
                  <small>Beneficios exclusivos para clientes afiliados.</small>
                </span>
                <span className="card-type-status">Próximamente</span>
              </button>

              <button
                type="button"
                className="card-type-option upcoming"
                disabled
              >
                <span className="card-type-icon">
                  <BadgePercent size={25} />
                </span>
                <span className="card-type-copy">
                  <strong>Descuentos</strong>
                  <small>Ofertas especiales y descuentos recurrentes.</small>
                </span>
                <span className="card-type-status">Próximamente</span>
              </button>

              <button
                type="button"
                className="card-type-option upcoming"
                disabled
              >
                <span className="card-type-icon">
                  <Banknote size={25} />
                </span>
                <span className="card-type-copy">
                  <strong>Cashback</strong>
                  <small>Devuelve una parte de cada compra como saldo.</small>
                </span>
                <span className="card-type-status">Próximamente</span>
              </button>

              <button
                type="button"
                className="card-type-option upcoming"
                disabled
              >
                <span className="card-type-icon">
                  <Ticket size={25} />
                </span>
                <span className="card-type-copy">
                  <strong>Cupones</strong>
                  <small>Cupones digitales para campañas y promociones.</small>
                </span>
                <span className="card-type-status">Próximamente</span>
              </button>

              <button
                type="button"
                className="card-type-option upcoming"
                disabled
              >
                <span className="card-type-icon">
                  <Crown size={25} />
                </span>
                <span className="card-type-copy">
                  <strong>Suscripción</strong>
                  <small>Planes periódicos con beneficios incluidos.</small>
                </span>
                <span className="card-type-status">Próximamente</span>
              </button>

              <button
                type="button"
                className="card-type-option upcoming"
                disabled
              >
                <span className="card-type-icon">
                  <CreditCard size={25} />
                </span>
                <span className="card-type-copy">
                  <strong>Tarjeta de regalo</strong>
                  <small>Saldo digital para regalar y utilizar después.</small>
                </span>
                <span className="card-type-status">Próximamente</span>
              </button>
            </div>

            <p className="card-type-modal-note">
              Estamos preparando nuevos tipos de tarjeta para futuras versiones
              de Fidara.
            </p>
          </section>
        </div>
      )}

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

            <div className="selected-program-summary">
              <span className="selected-program-icon">
                {isStampProgram ? <Stamp size={22} /> : <Coins size={22} />}
              </span>

              <span>
                <small>Tipo de tarjeta</small>
                <strong>
                  {isStampProgram ? "Programa de sellos" : "Programa de puntos"}
                </strong>
              </span>

              {isNewProgram ? (
                <button type="button" onClick={() => setShowTypeSelector(true)}>
                  Cambiar tipo
                </button>
              ) : (
                <small className="selected-program-locked">
                  No se puede cambiar después de crearla
                </small>
              )}
            </div>

            {isPointsProgram && (
              <div className="points-earning-settings">
                <div className="settings-card-heading">
                  <div>
                    <h3>¿Cómo acumularán puntos los clientes?</h3>
                    <p>Selecciona la acción que generará los puntos.</p>
                  </div>
                </div>

                <div className="program-type-grid">
                  <button
                    type="button"
                    className={form.pointsEarningMethod === 1 ? "selected" : ""}
                    onClick={() => {
                      updateField("pointsEarningMethod", 1);
                      updateField("limitOneVisitPerDay", false);
                    }}
                  >
                    <span>
                      <Coins size={22} />
                    </span>
                    <strong>Por gasto</strong>
                    <small>Otorga puntos según el total de la compra.</small>
                  </button>

                  <button
                    type="button"
                    className={form.pointsEarningMethod === 2 ? "selected" : ""}
                    onClick={() => {
                      updateField("pointsEarningMethod", 2);

                      if (form.pointsEarned === 1) {
                        updateField("pointsEarned", 10);
                      }
                    }}
                  >
                    <span>
                      <Stamp size={22} />
                    </span>
                    <strong>Por visita</strong>
                    <small>
                      Otorga una cantidad fija de puntos en cada visita.
                    </small>
                  </button>
                </div>

                {form.pointsEarningMethod === 2 && (
                  <label className="settings-toggle full-field">
                    <input
                      type="checkbox"
                      checked={form.limitOneVisitPerDay}
                      onChange={(event) =>
                        updateField("limitOneVisitPerDay", event.target.checked)
                      }
                    />

                    <span className="toggle-control" />

                    <span>
                      <strong>Limitar a una visita con puntos por día</strong>
                      <br />
                      <small>
                        Evita que el cliente acumule puntos varias veces durante
                        el mismo día local de la sucursal.
                      </small>
                    </span>
                  </label>
                )}
              </div>
            )}

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
              {isStampProgram ? (
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
              ) : (
                <>
                  {form.pointsEarningMethod === 1 && (
                    <label>
                      <span>Por cada compra de</span>
                      <div className="money-field">
                        <b>$</b>
                        <input
                          type="number"
                          min={0.01}
                          step={0.01}
                          value={form.amountRequired}
                          onChange={(event) =>
                            updateField(
                              "amountRequired",
                              Number(event.target.value),
                            )
                          }
                          required
                        />
                        <small>MXN</small>
                      </div>
                    </label>
                  )}

                  <label>
                    <span>
                      {form.pointsEarningMethod === 2
                        ? "Puntos por visita"
                        : "Puntos otorgados"}
                    </span>
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={form.pointsEarned}
                      onChange={(event) =>
                        updateField("pointsEarned", Number(event.target.value))
                      }
                      required
                    />
                  </label>

                  <label className="full-field">
                    <span>Puntos necesarios para la recompensa</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={form.targetValue}
                      onChange={(event) =>
                        updateField("targetValue", Number(event.target.value))
                      }
                      required
                    />
                    <small className="field-help">
                      {form.pointsEarningMethod === 2
                        ? `Cada visita otorgará ${form.pointsEarned || 0} puntos.`
                        : `Por cada $${form.amountRequired || 0} MXN se otorgarán ${form.pointsEarned || 0} puntos.`}
                    </small>
                  </label>
                </>
              )}

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

              <label>
                <span>Tipo de recompensa</span>
                <select
                  value={form.rewardType}
                  onChange={(event) =>
                    updateField("rewardType", Number(event.target.value))
                  }
                >
                  <option value={1}>Producto o beneficio</option>
                  <option value={2}>Descuento en pesos</option>
                  <option value={3}>Descuento porcentual</option>
                </select>
              </label>

              {(form.rewardType === 2 || form.rewardType === 3) && (
                <label>
                  <span>
                    {form.rewardType === 2
                      ? "Valor del descuento"
                      : "Porcentaje de descuento"}
                  </span>
                  <div className="money-field">
                    {form.rewardType === 2 && <b>$</b>}
                    <input
                      type="number"
                      min={0.01}
                      max={form.rewardType === 3 ? 100 : undefined}
                      step={0.01}
                      value={form.rewardValue}
                      onChange={(event) =>
                        updateField("rewardValue", Number(event.target.value))
                      }
                      required
                    />
                    <small>{form.rewardType === 2 ? "MXN" : "%"}</small>
                  </div>
                </label>
              )}

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

              {isStampProgram && (
                <>
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
                        <img
                          src={previews.inactiveStamp}
                          alt="Sello inactivo"
                        />
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
                </>
              )}

              {isPointsProgram && (
                <div className="full-field">
                  <div className="settings-card-heading">
                    <div>
                      <h3>Diseño de la parte central</h3>
                      <p>
                        Usa una imagen para Wallet o conserva un bloque de
                        color.
                      </p>
                    </div>
                  </div>

                  <div className="program-type-grid">
                    <button
                      type="button"
                      className={
                        form.stripDesignMode === "image" ? "selected" : ""
                      }
                      onClick={() => updateField("stripDesignMode", "image")}
                    >
                      <span>
                        <ImageIcon size={22} />
                      </span>
                      <strong>Usar imagen</strong>
                      <small>PNG · mínimo 1125 × 432 px · máximo 3 MB.</small>
                    </button>

                    <button
                      type="button"
                      className={
                        form.stripDesignMode === "color" ? "selected" : ""
                      }
                      onClick={() => updateField("stripDesignMode", "color")}
                    >
                      <span>
                        <Palette size={22} />
                      </span>
                      <strong>Usar color</strong>
                      <small>Aplica un color sólido al área central.</small>
                    </button>
                  </div>

                  {form.stripDesignMode === "image" ? (
                    <label className="image-upload">
                      <span>Imagen central</span>

                      <div>
                        {previews.stripImage ? (
                          <img
                            src={previews.stripImage}
                            alt="Imagen central actual"
                          />
                        ) : (
                          <ImageIcon size={24} />
                        )}

                        <strong>
                          <Upload size={15} />
                          {previews.stripImage ? "Cambiar" : "Seleccionar PNG"}
                        </strong>
                      </div>

                      <input
                        type="file"
                        accept="image/png"
                        onChange={selectStripImage}
                      />
                    </label>
                  ) : (
                    <label>
                      <span>Color de la parte central</span>
                      <div className="color-input">
                        <input
                          type="color"
                          value={form.cardStripColor}
                          onChange={(event) =>
                            updateField("cardStripColor", event.target.value)
                          }
                        />
                        <strong>{form.cardStripColor}</strong>
                      </div>
                    </label>
                  )}
                </div>
              )}
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
              programType={form.programType}
              logoUrl={previews.logo}
              activeStampUrl={previews.activeStamp}
              inactiveStampUrl={previews.inactiveStamp}
              backgroundColor={form.cardBackgroundColor}
              foregroundColor={form.cardForegroundColor}
              labelColor={form.cardLabelColor}
              targetValue={form.targetValue}
              pointsEarned={form.pointsEarned}
              amountRequired={form.amountRequired}
              pointsEarningMethod={form.pointsEarningMethod}
              stripImageUrl={
                form.stripDesignMode === "image" ? previews.stripImage : null
              }
              stripColor={form.cardStripColor}
              balance={isPointsProgram ? Math.min(form.targetValue, 40) : 4}
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
