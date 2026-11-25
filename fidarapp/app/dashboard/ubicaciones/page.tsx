"use client";

import dynamic from "next/dynamic";
import { Poppins } from "next/font/google";
import {
  AlertTriangle,
  Building2,
  CircleCheck,
  Ellipsis as MoreHorizontal,
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
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FidaraConfirmDialog } from "@/components/ui/fidara-confirm-dialog";
import customerStyles from "../clientes/customers.module.css";
import styles from "./locations.module.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });

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
  const parts = [
    location.addressLine1,
    location.addressLine2,
    location.city,
    location.state,
    location.postalCode,
    location.country,
  ].flatMap((value) => value?.split(",").map((part) => part.trim()).filter(Boolean) ?? []);

  const unique = new Map<string, string>();
  for (const part of parts) {
    const key = part.normalize("NFC").toLocaleLowerCase("es-MX").replace(/\s+/g, " ");
    if (!unique.has(key)) unique.set(key, part);
  }
  return Array.from(unique.values()).join(", ") || "Sin dirección registrada";
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
  const [hasLoaded, setHasLoaded] = useState(false);
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
      setHasLoaded(true);
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
    const timeoutId = window.setTimeout(() => void loadLocations(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadLocations]);

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

      toast.success(wasEditing ? "Cambios guardados" : "Sucursal creada", {
        description: wasEditing
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

      setStatusConfirmation(null);

      toast.success(nextStatus ? "Sucursal reactivada" : "Sucursal archivada", {
        description: nextStatus
          ? `${location.name} vuelve a estar disponible.`
          : `Se conservó el historial de ${location.name}.`,
      });
    } catch (caught) {
      toast.error("No pudimos completar la operación", {
        description:
          caught instanceof Error
            ? caught.message
            : "Ocurrió un error inesperado.",
      });
    } finally {
      setChangingStatusId(null);
    }
  }

  if (loading && !hasLoaded) return <LocationsSkeleton />;

  return (
    <main className={customerStyles.page + " " + poppins.className}>
      <span className="sr-only" role="status">{loading ? "Actualizando sucursales…" : ""}</span>
      <section className={customerStyles.heading}>
        <div>
          <h1>Sucursales</h1>
        </div>

        <div className={customerStyles.headingActions}>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={openCreateForm}
          >
            <Plus size={18} aria-hidden="true" />
            Nueva sucursal
          </button>
        </div>
      </section>

      {error && !formOpen && (
        <div className={customerStyles.errorBox}>
          <span>{error}</span>
          <button type="button" onClick={() => void loadLocations()}>
            Reintentar
          </button>
        </div>
      )}

      <section className={customerStyles.panel + " " + styles.panel} aria-busy={loading}>
        <div className={customerStyles.toolbar + " " + styles.toolbar}>
          <label className={customerStyles.searchBox + " " + styles.searchBox}>
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              placeholder="Buscar ubicación o dirección"
              aria-label="Buscar ubicación o dirección"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <div className={customerStyles.filters + " " + styles.filters}>
            {(["all", "active", "inactive"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                className={statusFilter === filter ? customerStyles.selectedFilter : ""}
                aria-pressed={statusFilter === filter}
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

        {filteredLocations.length === 0 ? (
          <div className={customerStyles.emptyState}>
            <span>
              <MapPin size={28} aria-hidden="true" />
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
            <LocationsListHeader />

            {filteredLocations.map((location) => {
              const verified =
                location.latitude !== null && location.longitude !== null;
              const address = getAddress(location);

              return (
                <article className={styles.locationRow} key={location.id}>
                  <div className={styles.locationMain}>
                    <span className={styles.locationIcon}>
                      <MapPin size={21} aria-hidden="true" />
                    </span>

                    <div className={styles.locationCopy}>
                      <h2 title={location.name}>{location.name}</h2>
                      <p className={styles.locationAddress} title={address}>{address}</p>
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

                  <div className={styles.movementsCell}>
                    <small className={styles.cellLabel}>Movimientos</small>
                    <strong>{location.transactionsCount}</strong>
                  </div>

                  <div className={styles.verificationCell}>
                    <small className={styles.cellLabel}>Ubicación</small>
                    <span
                      className={
                        verified
                          ? styles.verifiedLocation
                          : styles.pendingLocation
                      }
                    >
                      {verified ? <CircleCheck size={15} aria-hidden="true" /> : <MapPin size={15} aria-hidden="true" />}
                      {verified ? "Verificada" : "Pendiente"}
                    </span>
                  </div>

                  <div className={styles.rowActions}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={"Acciones para " + location.name}
                        className={styles.actionsTrigger}
                      >
                        <MoreHorizontal size={20} aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className={poppins.className + " min-w-40 border border-[#E5E7EB] bg-white p-1.5 text-[#111827] shadow-lg ring-0"}
                      >
                        <DropdownMenuItem className={styles.actionItem} onClick={() => openEditForm(location)}>
                          <Pencil size={16} aria-hidden="true" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className={styles.actionItem + " " + (location.isActive ? styles.archiveItem : styles.reactivateItem)}
                          disabled={Boolean(changingStatusId)}
                          onClick={() => setStatusConfirmation({ location, nextStatus: !location.isActive })}
                        >
                          <Power size={16} aria-hidden="true" />
                          {location.isActive ? "Archivar" : "Reactivar"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                <span className={customerStyles.eyebrow}>
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

      <FidaraConfirmDialog
        open={Boolean(statusConfirmation)}
        onOpenChange={(open) => {
          if (!open) setStatusConfirmation(null);
        }}
        icon={
          statusConfirmation?.nextStatus ? (
            <Power size={22} />
          ) : (
            <AlertTriangle size={22} />
          )
        }
        iconClassName={
          statusConfirmation?.nextStatus
            ? "bg-emerald-50 text-emerald-700"
            : undefined
        }
        title={
          statusConfirmation?.nextStatus
            ? "¿Reactivar sucursal?"
            : "¿Archivar sucursal?"
        }
        description={
          statusConfirmation?.nextStatus
            ? `${statusConfirmation.location.name} volverá a estar disponible para tu equipo.`
            : `${statusConfirmation?.location.name ?? "La sucursal"} dejará de estar disponible para nuevas operaciones, pero conservará todo su historial.`
        }
        confirmLabel={
          statusConfirmation?.nextStatus ? "Sí, reactivar" : "Sí, archivar"
        }
        busyLabel="Guardando…"
        confirmIcon={<Power size={17} />}
        confirmClassName={
          statusConfirmation?.nextStatus
            ? "bg-emerald-700 shadow-emerald-700/20 hover:bg-emerald-800"
            : undefined
        }
        busy={
          Boolean(statusConfirmation) &&
          changingStatusId === statusConfirmation?.location.id
        }
        confirmDisabled={!statusConfirmation}
        onConfirm={() => {
          if (statusConfirmation) void changeStatus(statusConfirmation.location);
        }}
      />

    </main>
  );
}

function LocationsListHeader({ skeleton = false }: { skeleton?: boolean }) {
  return (
    <div className={styles.listHeader}>
      {["Sucursal", "Estado", "Movimientos", "Ubicación", "Acciones"].map((label) => (
        <span key={label} className={skeleton ? styles.skeletonLabel : undefined}>
          {skeleton ? null : label}
        </span>
      ))}
    </div>
  );
}

function LocationsSkeleton() {
  return (
    <main className={customerStyles.page + " " + poppins.className}>
      <span className="sr-only" role="status">Cargando sucursales…</span>
      <div
        aria-hidden="true"
        className={customerStyles.page + " " + customerStyles.skeleton + " motion-safe:animate-pulse motion-safe:[animation-duration:2.5s]"}
      >
        <section className={customerStyles.heading}>
          <span className={customerStyles.skeletonTitle + " " + styles.skeletonTitle} />
          <div className={customerStyles.headingActions}>
            <span className={customerStyles.skeletonExport + " " + styles.skeletonCreate} />
          </div>
        </section>

        <section className={customerStyles.panel + " " + styles.panel}>
          <div className={customerStyles.toolbar + " " + styles.toolbar}>
            <div className={customerStyles.searchBox + " " + styles.searchBox}>
              <span className={customerStyles.skeletonSearchIcon} />
              <span className={customerStyles.skeletonSearchText} />
            </div>
            <div className={customerStyles.filters + " " + styles.filters}>
              {["all", "active", "inactive"].map((filter) => (
                <span className={customerStyles.skeletonFilter + " " + styles.skeletonFilter} key={filter} />
              ))}
            </div>
          </div>

          <div className={styles.locationList}>
            <LocationsListHeader skeleton />
            {Array.from({ length: 6 }, (_, index) => (
              <div className={styles.locationRow} key={index}>
                <div className={styles.locationMain}>
                  <span className={styles.locationIcon + " " + styles.placeholder} />
                  <div className={styles.skeletonIdentity}>
                    <span className={styles.skeletonName} />
                    <span className={styles.skeletonAddress} />
                  </div>
                </div>
                {[styles.statusCell, styles.movementsCell, styles.verificationCell].map((cell) => (
                  <div key={cell} className={cell}>
                    <small className={styles.cellLabel}><span className={styles.skeletonLabel} /></small>
                    <span className={styles.skeletonValue} />
                  </div>
                ))}
                <div className={styles.rowActions}><span className={styles.skeletonAction} /></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
