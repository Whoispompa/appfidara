"use client";

import {
  Building2,
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

  return [firstLine, secondLine].filter(Boolean).join(" · ") || "Sin dirección registrada";
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
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState<LocationForm>(emptyForm);

  const loadLocations = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/locations", {
        cache: "no-store",
      });

      const payload = await response.json();

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(payload.message ?? "No fue posible cargar las ubicaciones.");
      }

      setLocations(payload.data ?? []);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible cargar las ubicaciones.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  const filteredLocations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return locations.filter((location) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && location.isActive) ||
        (statusFilter === "inactive" && !location.isActive);

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        location.name,
        location.addressLine1,
        location.addressLine2,
        location.city,
        location.state,
        location.country,
        location.postalCode,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedSearch));
    });
  }, [locations, search, statusFilter]);

  const activeCount = locations.filter((location) => location.isActive).length;
  const transactionsCount = locations.reduce(
    (total, location) => total + location.transactionsCount,
    0,
  );

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
    if (saving) {
      return;
    }

    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  function updateField(field: keyof LocationForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Escribe el nombre de la ubicación.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        editing ? `/api/locations/${editing.id}` : "/api/locations",
        {
          method: editing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            addressLine1: form.addressLine1.trim() || null,
            addressLine2: form.addressLine2.trim() || null,
            city: form.city.trim() || null,
            state: form.state.trim() || null,
            country: form.country.trim() || null,
            postalCode: form.postalCode.trim() || null,
            latitude: form.latitude.trim() ? Number(form.latitude) : null,
            longitude: form.longitude.trim() ? Number(form.longitude) : null,
          }),
        },
      );

      const payload = await response.json();

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(payload.message ?? "No fue posible guardar la ubicación.");
      }

      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await loadLocations();
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
    const action = nextStatus ? "activar" : "desactivar";

    if (!window.confirm(`¿Quieres ${action} ${location.name}?`)) {
      return;
    }

    setChangingStatusId(location.id);
    setError("");

    try {
      const response = await fetch(`/api/locations/${location.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: nextStatus,
        }),
      });

      const payload = await response.json();

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(payload.message ?? "No fue posible cambiar el estado.");
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
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible cambiar el estado.",
      );
    } finally {
      setChangingStatusId(null);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>OPERACIÓN</span>
          <h1>Ubicaciones</h1>
          <p>Administra las sucursales donde tu equipo atiende a los clientes.</p>
        </div>

        <button className={styles.primaryButton} type="button" onClick={openCreateForm}>
          <Plus size={19} />
          Nueva ubicación
        </button>
      </section>

      <section className={styles.metrics}>
        <article>
          <span className={`${styles.metricIcon} ${styles.pink}`}>
            <Building2 size={20} />
          </span>
          <div>
            <small>Total de ubicaciones</small>
            <strong>{locations.length}</strong>
          </div>
        </article>

        <article>
          <span className={`${styles.metricIcon} ${styles.green}`}>
            <MapPin size={20} />
          </span>
          <div>
            <small>Ubicaciones activas</small>
            <strong>{activeCount}</strong>
          </div>
        </article>

        <article>
          <span className={`${styles.metricIcon} ${styles.yellow}`}>
            <Power size={20} />
          </span>
          <div>
            <small>Movimientos registrados</small>
            <strong>{transactionsCount}</strong>
          </div>
        </article>
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
                {filter === "all" ? "Todas" : filter === "active" ? "Activas" : "Inactivas"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className={styles.loadingState}>
            <LoaderCircle className={styles.spinner} size={28} />
            <span>Cargando ubicaciones…</span>
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className={styles.emptyState}>
            <span>
              <MapPin size={28} />
            </span>
            <h2>{locations.length === 0 ? "Agrega tu primera ubicación" : "No encontramos resultados"}</h2>
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
          <div className={styles.locationGrid}>
            {filteredLocations.map((location) => (
              <article className={styles.locationCard} key={location.id}>
                <div className={styles.cardTop}>
                  <span className={styles.locationIcon}>
                    <Building2 size={23} />
                  </span>
                  <span className={location.isActive ? styles.activeBadge : styles.inactiveBadge}>
                    <i />
                    {location.isActive ? "Activa" : "Inactiva"}
                  </span>
                </div>

                <h2>{location.name}</h2>

                <p className={styles.address}>
                  <MapPin size={16} />
                  <span>{getAddress(location)}</span>
                </p>

                <div className={styles.cardInformation}>
                  <div>
                    <small>Movimientos</small>
                    <strong>{location.transactionsCount}</strong>
                  </div>
                  <div>
                    <small>Coordenadas</small>
                    <strong>
                      {location.latitude !== null && location.longitude !== null
                        ? "Registradas"
                        : "Pendientes"}
                    </strong>
                  </div>
                </div>

                <div className={styles.cardActions}>
                  <button type="button" onClick={() => openEditForm(location)}>
                    <Pencil size={16} />
                    Editar
                  </button>
                  <button
                    type="button"
                    className={location.isActive ? styles.deactivateButton : styles.activateButton}
                    disabled={changingStatusId === location.id}
                    onClick={() => void changeStatus(location)}
                  >
                    {changingStatusId === location.id ? (
                      <LoaderCircle className={styles.spinner} size={16} />
                    ) : (
                      <Power size={16} />
                    )}
                    {location.isActive ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {formOpen && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={closeForm}>
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-form-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.eyebrow}>{editing ? "EDITAR" : "NUEVA SUCURSAL"}</span>
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
                <span>Nombre de la ubicación *</span>
                <input
                  required
                  autoFocus
                  value={form.name}
                  placeholder="Ej. Sucursal Centro"
                  onChange={(event) => updateField("name", event.target.value)}
                />
              </label>

              <div className={styles.formGrid}>
                <label className={styles.fullField}>
                  <span>Dirección</span>
                  <input
                    value={form.addressLine1}
                    placeholder="Calle y número"
                    onChange={(event) => updateField("addressLine1", event.target.value)}
                  />
                </label>

                <label className={styles.fullField}>
                  <span>Dirección adicional</span>
                  <input
                    value={form.addressLine2}
                    placeholder="Local, piso o referencia"
                    onChange={(event) => updateField("addressLine2", event.target.value)}
                  />
                </label>

                <label>
                  <span>Ciudad</span>
                  <input
                    value={form.city}
                    placeholder="Tijuana"
                    onChange={(event) => updateField("city", event.target.value)}
                  />
                </label>

                <label>
                  <span>Estado</span>
                  <input
                    value={form.state}
                    placeholder="Baja California"
                    onChange={(event) => updateField("state", event.target.value)}
                  />
                </label>

                <label>
                  <span>País</span>
                  <input
                    value={form.country}
                    placeholder="México"
                    onChange={(event) => updateField("country", event.target.value)}
                  />
                </label>

                <label>
                  <span>Código postal</span>
                  <input
                    value={form.postalCode}
                    placeholder="22000"
                    onChange={(event) => updateField("postalCode", event.target.value)}
                  />
                </label>

                <label>
                  <span>Latitud</span>
                  <input
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    value={form.latitude}
                    placeholder="32.5332"
                    onChange={(event) => updateField("latitude", event.target.value)}
                  />
                </label>

                <label>
                  <span>Longitud</span>
                  <input
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    value={form.longitude}
                    placeholder="-117.0192"
                    onChange={(event) => updateField("longitude", event.target.value)}
                  />
                </label>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelButton} onClick={closeForm}>
                  Cancelar
                </button>
                <button type="submit" className={styles.saveButton} disabled={saving}>
                  {saving && <LoaderCircle className={styles.spinner} size={17} />}
                  {editing ? "Guardar cambios" : "Crear ubicación"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
