"use client";

import dynamic from "next/dynamic";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  Power,
  Search,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import styles from "./locations.module.css";

const GooglePlacePicker = dynamic(
  () => import("@/components/locations/google-place-picker"),
  { ssr: false },
);

type Location = {
  id: string;
  name: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  transactionsCount: number;
};

type LocationForm = {
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude: string;
  longitude: string;
};

type StatusFilter = "all" | "active" | "inactive";

type StatusConfirmation = {
  location: Location;
  nextStatus: boolean;
} | null;

type ToastMessage = {
  type: "success" | "error";
  title: string;
  message: string;
} | null;

const emptyForm: LocationForm = {
  name: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  country: "México",
  postalCode: "",
  latitude: "",
  longitude: "",
};

function getAddress(location: Location) {
  const firstLine = [location.addressLine1, location.addressLine2]
    .filter(Boolean)
    .join(", ");

  const secondLine = [
    location.city,
    location.state,
    location.postalCode,
    location.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    [firstLine, secondLine].filter(Boolean).join(" · ") ||
    "Sin dirección registrada"
  );
}

function toForm(location: Location): LocationForm {
  return {
    name: location.name,
    addressLine1: location.addressLine1 ?? "",
    addressLine2: location.addressLine2 ?? "",
    city: location.city ?? "",
    state: location.state ?? "",
    country: location.country ?? "México",
    postalCode: location.postalCode ?? "",
    latitude: location.latitude?.toString() ?? "",
    longitude: location.longitude?.toString() ?? "",
  };
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStatusId, setChangingStatusId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState<LocationForm>(emptyForm);
  const [statusConfirmation, setStatusConfirmation] =
    useState<StatusConfirmation>(null);
  const [toast, setToast] = useState<ToastMessage>(null);

  const loadLocations = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/locations", {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload.message ?? "No fue posible cargar las sucursales.",
        );
      }

      setLocations(payload.data ?? []);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible cargar las sucursales.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    if (!toast) return;

    const timeout = window.setTimeout(() => {
      setToast(null);
    }, 3200);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!formOpen && !statusConfirmation) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [formOpen, statusConfirmation]);

  const filteredLocations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return locations.filter((location) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && location.isActive) ||
        (statusFilter === "inactive" && !location.isActive);

      if (!matchesStatus) return false;
      if (!normalizedSearch) return true;

      return [
        location.name,
        location.addressLine1,
        location.addressLine2,
        location.city,
        location.state,
        location.country,
        location.postalCode,
      ]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [locations, search, statusFilter]);

  const activeCount = locations.filter((location) => location.isActive).length;

  const hasSelectedLocation =
    form.addressLine1.trim() !== "" &&
    form.latitude.trim() !== "" &&
    form.longitude.trim() !== "";

  const canSave = form.name.trim() !== "" && hasSelectedLocation;

  function openCreateForm() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setFormOpen(true);
  }

  function openEditForm(location: Location) {
    setEditing(location);
    setForm(toForm(location));
    setError("");
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;

    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setError("");
  }

  function updateField(field: keyof LocationForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    const addressLine1 = form.addressLine1.trim();
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    const wasEditing = editing !== null;

    if (!name) {
      setError("Escribe el nombre de la sucursal.");
      return;
    }

    if (
      !addressLine1 ||
      !form.latitude.trim() ||
      !form.longitude.trim() ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      setError("Selecciona una ubicación válida desde Google Maps.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const endpoint = editing
        ? `/api/locations/${editing.id}`
        : "/api/locations";

      const response = await fetch(endpoint, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          addressLine1,
          addressLine2: form.addressLine2.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          country: form.country.trim() || null,
          postalCode: form.postalCode.trim() || null,
          latitude,
          longitude,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload.message ?? "No fue posible guardar la ubicación.",
        );
      }

      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await loadLocations();

      setToast({
        type: "success",
        title: wasEditing ? "Cambios guardados" : "Sucursal creada",
        message: wasEditing
          ? `${name} se actualizó correctamente.`
          : `${name} ya está disponible para tu equipo.`,
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible guardar la ubicación.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(location: Location) {
    const nextStatus = !location.isActive;

    setChangingStatusId(location.id);
    setStatusConfirmation(null);
    setError("");

    try {
      const response = await fetch(`/api/locations/${location.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextStatus }),
      });

      const payload = await response.json().catch(() => ({}));

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload.message ?? "No fue posible cambiar el estado de la sucursal.",
        );
      }

      setLocations((current) =>
        current.map((item) =>
          item.id === location.id
            ? {
                ...item,
                isActive: nextStatus,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );

      setToast({
        type: "success",
        title: nextStatus ? "Sucursal reactivada" : "Sucursal archivada",
        message: nextStatus
          ? `${location.name} vuelve a estar disponible.`
          : `Se conservó el historial de ${location.name}.`,
      });
    } catch (caught) {
      setToast({
        type: "error",
        title: "No pudimos completar la operación",
        message:
          caught instanceof Error
            ? caught.message
            : "Ocurrió un error inesperado.",
      });
    } finally {
      setChangingStatusId(null);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>UBICACIÓN</span>
          <h1>Sucursales</h1>
        </div>

        <button
          className={styles.primaryButton}
          type="button"
          onClick={openCreateForm}
        >
          <Plus size={19} />
          Nueva sucursal
        </button>
      </section>

     

      {error && !formOpen && (
        <div className={styles.errorBox}>
          <span>{error}</span>
          <button type="button" onClick={() => void loadLocations()}>
            Reintentar
          </button>
        </div>
      )}

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <label className={styles.searchBox}>
            <Search size={18} />
            <input
              type="search"
              placeholder="Buscar ubicación o dirección"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <div className={styles.filters}>
            {(["all", "active", "inactive"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                className={statusFilter === filter ? styles.selectedFilter : ""}
                onClick={() => setStatusFilter(filter)}
              >
                {filter === "all"
                  ? "Todas"
                  : filter === "active"
                    ? "Activas"
                    : "Archivadas"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className={styles.loadingState}>
            <LoaderCircle className={styles.spinner} size={28} />
            <span>Cargando sucursales…</span>
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className={styles.emptyState}>
            <span>
              <MapPin size={28} />
            </span>
            <h2>
              {locations.length === 0
                ? "Agrega tu primera ubicación"
                : "No encontramos resultados"}
            </h2>
            <p>
              {locations.length === 0
                ? "Registra la sucursal desde la que comenzarás a entregar sellos y recompensas."
                : "Prueba con otra búsqueda o cambia los filtros."}
            </p>
            {locations.length === 0 && (
              <button type="button" onClick={openCreateForm}>
                <Plus size={17} />
                Crear ubicación
              </button>
            )}
          </div>
        ) : (
          <div className={styles.locationList}>
            <div className={styles.listHeader} aria-hidden="true">
              <span>Sucursal</span>
              <span>Estado</span>
              <span>Movimientos</span>
              <span>Ubicación</span>
              <span className={styles.actionsHeader}>Acciones</span>
            </div>

            {filteredLocations.map((location) => {
              const verified =
                location.latitude !== null && location.longitude !== null;

              return (
                <article className={styles.locationRow} key={location.id}>
                  <div className={styles.locationMain}>
                    <span className={styles.locationIcon}>
                      <Building2 size={21} />
                    </span>

                    <div className={styles.locationCopy}>
                      <h2>{location.name}</h2>
                      <p className={styles.locationAddress}>
                        <MapPin size={14} />
                        <span>{getAddress(location)}</span>
                      </p>
                    </div>
                  </div>

                  <div className={styles.statusCell}>
                    <small className={styles.cellLabel}>Estado</small>
                    <span
                      className={
                        location.isActive
                          ? styles.activeBadge
                          : styles.inactiveBadge
                      }
                    >
                      <i />
                      {location.isActive ? "Activa" : "Archivada"}
                    </span>
                  </div>

                  <div className={styles.dataCell}>
                    <small className={styles.cellLabel}>Movimientos</small>
                    <strong>{location.transactionsCount}</strong>
                  </div>

                  <div className={styles.dataCell}>
                    <small className={styles.cellLabel}>Ubicación</small>
                    <span
                      className={
                        verified
                          ? styles.verifiedLocation
                          : styles.pendingLocation
                      }
                    >
                      <MapPin size={14} />
                      {verified ? "Verificada" : "Pendiente"}
                    </span>
                  </div>

                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.editAction}
                      onClick={() => openEditForm(location)}
                    >
                      <Pencil size={15} />
                      Editar
                    </button>

                    <button
                      type="button"
                      className={
                        location.isActive
                          ? styles.deactivateAction
                          : styles.activateAction
                      }
                      disabled={changingStatusId === location.id}
                      onClick={() =>
                        setStatusConfirmation({
                          location,
                          nextStatus: !location.isActive,
                        })
                      }
                    >
                      {changingStatusId === location.id ? (
                        <LoaderCircle className={styles.spinner} size={15} />
                      ) : (
                        <Power size={15} />
                      )}
                      {location.isActive ? "Archivar" : "Reactivar"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {formOpen && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={closeForm}
        >
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-form-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.eyebrow}>
                  {editing ? "EDITAR SUCURSAL" : "NUEVA SUCURSAL"}
                </span>
                <h2 id="location-form-title">
                  {editing ? "Editar ubicación" : "Crear ubicación"}
                </h2>
              </div>

              <button type="button" aria-label="Cerrar" onClick={closeForm}>
                <X size={21} />
              </button>
            </div>

            <form onSubmit={saveLocation}>
              {error && <div className={styles.formError}>{error}</div>}

              <label className={styles.fullField}>
                <span>Nombre de la sucursal *</span>
                <input
                  required
                  autoFocus
                  maxLength={120}
                  value={form.name}
                  placeholder="Ej. Banqueta Café Península"
                  onChange={(event) => updateField("name", event.target.value)}
                />
              </label>

              <GooglePlacePicker
                key={editing?.id ?? "new"}
                onPlaceSelected={(place) => {
                  setForm((current) => ({
                    ...current,
                    name: current.name.trim() || place.name || "",
                    addressLine1: place.addressLine1,
                    addressLine2: "",
                    city: place.city,
                    state: place.state,
                    country: place.country,
                    postalCode: place.postalCode,
                    latitude: String(place.latitude),
                    longitude: String(place.longitude),
                  }));
                  setError("");
                }}
              />

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={closeForm}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={saving || !canSave}
                >
                  {saving && (
                    <LoaderCircle className={styles.spinner} size={17} />
                  )}
                  {saving
                    ? "Guardando…"
                    : editing
                      ? "Guardar cambios"
                      : "Crear sucursal"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {statusConfirmation && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-[#111827]/60 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={() => setStatusConfirmation(null)}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="status-dialog-title"
            className="w-full max-w-md rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-[0_30px_90px_rgba(17,24,39,0.30)] sm:p-7"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-5">
              <span
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
                  statusConfirmation.nextStatus
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-[#E11D48]"
                }`}
              >
                {statusConfirmation.nextStatus ? (
                  <Power size={22} />
                ) : (
                  <AlertTriangle size={22} />
                )}
              </span>

              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-xl bg-[#F3F4F6] text-[#6B7280] transition hover:text-[#111827]"
                onClick={() => setStatusConfirmation(null)}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <h2
              id="status-dialog-title"
              className="mt-5 text-xl font-extrabold tracking-[-0.025em] text-[#111827]"
            >
              {statusConfirmation.nextStatus
                ? "¿Reactivar sucursal?"
                : "¿Archivar sucursal?"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#6B7280]">
              {statusConfirmation.nextStatus
                ? `${statusConfirmation.location.name} volverá a estar disponible para tu equipo.`
                : `${statusConfirmation.location.name} dejará de estar disponible para nuevas operaciones, pero conservará todo su historial.`}
            </p>

            <div className="mt-7 grid grid-cols-1 gap-3 sm:flex sm:justify-end">
              <button
                type="button"
                className="min-h-11 rounded-xl border border-[#E5E7EB] bg-white px-5 text-sm font-extrabold text-[#111827] transition hover:bg-[#F3F4F6]"
                onClick={() => setStatusConfirmation(null)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold text-white transition hover:-translate-y-0.5 ${
                  statusConfirmation.nextStatus
                    ? "bg-emerald-700 shadow-lg shadow-emerald-700/20 hover:bg-emerald-800"
                    : "bg-[#E11D48] shadow-lg shadow-[#E11D48]/20 hover:bg-[#BE123C]"
                }`}
                onClick={() => void changeStatus(statusConfirmation.location)}
              >
                <Power size={17} />
                {statusConfirmation.nextStatus
                  ? "Sí, reactivar"
                  : "Sí, archivar"}
              </button>
            </div>
          </section>
        </div>
      )}

      {toast && (
        <div
          className={`fixed right-4 top-4 z-[200] flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-2xl border bg-white px-4 py-4 shadow-[0_20px_60px_rgba(17,24,39,0.18)] ${
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
              <CheckCircle2 size={19} />
            ) : (
              <AlertTriangle size={19} />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <strong className="block text-sm font-extrabold text-[#111827]">
              {toast.title}
            </strong>
            <p className="mt-1 text-xs leading-5 text-[#6B7280]">
              {toast.message}
            </p>
          </div>

          <button
            type="button"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827]"
            onClick={() => setToast(null)}
            aria-label="Cerrar notificación"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </main>
  );
}
