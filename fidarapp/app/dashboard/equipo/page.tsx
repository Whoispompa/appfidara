"use client";

import {
  Building2,
  Check,
  Clock3,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  Power,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import styles from "./team.module.css";

type LocationOption = {
  id: string;
  name: string;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
};

type TeamMember = {
  organizationUserId: string;
  userId: string;
  firstName: string;
  lastName?: string | null;
  fullName: string;
  email: string;
  phone?: string | null;
  role: number;
  roleName: string;
  isActive: boolean;
  joinedAt: string;
  lastLoginAt?: string | null;
  transactionsCount: number;
  locations: LocationOption[];
};

type TeamForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: number;
  locationIds: string[];
};

const emptyForm: TeamForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  role: 4,
  locationIds: [],
};

const roleLabels: Record<number, string> = {
  1: "Propietario",
  2: "Administrador",
  3: "Encargado",
  4: "Empleado",
};

const roleDescriptions: Record<number, string> = {
  2: "Administra el equipo, las sucursales y la operación.",
  3: "Supervisa la operación en sus sucursales asignadas.",
  4: "Escanea tarjetas y atiende clientes en sus sucursales.",
};

function formatDate(value?: string | null) {
  if (!value) {
    return "Sin actividad";
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getInitials(member: TeamMember) {
  return [member.firstName, member.lastName]
    .filter(Boolean)
    .map((value) => value![0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStatusId, setChangingStatusId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState<TeamForm>(emptyForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [teamResponse, locationsResponse] = await Promise.all([
        fetch("/api/team", { cache: "no-store" }),
        fetch("/api/locations?activeOnly=true", { cache: "no-store" }),
      ]);

      if (teamResponse.status === 401 || locationsResponse.status === 401) {
        window.location.assign("/login");
        return;
      }

      const [teamPayload, locationsPayload] = await Promise.all([
        teamResponse.json(),
        locationsResponse.json(),
      ]);

      if (!teamResponse.ok) {
        throw new Error(
          teamPayload.message ?? "No fue posible cargar el equipo.",
        );
      }

      if (!locationsResponse.ok) {
        throw new Error(
          locationsPayload.message ?? "No fue posible cargar las ubicaciones.",
        );
      }

      setMembers(teamPayload.data ?? []);
      setLocations(locationsPayload.data ?? []);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible cargar el equipo.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredMembers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return members.filter((member) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && member.isActive) ||
        (statusFilter === "inactive" && !member.isActive);

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        member.fullName,
        member.email,
        member.phone,
        roleLabels[member.role],
        ...member.locations.map((location) => location.name),
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedSearch));
    });
  }, [members, search, statusFilter]);

  const activeCount = members.filter((member) => member.isActive).length;
  const operatorsCount = members.filter(
    (member) => member.role === 3 || member.role === 4,
  ).length;

  function openCreateForm() {
    setEditing(null);
    setForm({
      ...emptyForm,
      locationIds: locations.length === 1 ? [locations[0].id] : [],
    });
    setError("");
    setSuccess("");
    setFormOpen(true);
  }

  function openEditForm(member: TeamMember) {
    setEditing(member);
    setForm({
      firstName: member.firstName,
      lastName: member.lastName ?? "",
      email: member.email,
      phone: member.phone ?? "",
      password: "",
      role: member.role,
      locationIds: member.locations.map((location) => location.id),
    });
    setError("");
    setSuccess("");
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setError("");
  }

  function updateField<K extends keyof TeamForm>(field: K, value: TeamForm[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function toggleLocation(locationId: string) {
    setForm((current) => ({
      ...current,
      locationIds: current.locationIds.includes(locationId)
        ? current.locationIds.filter((id) => id !== locationId)
        : [...current.locationIds, locationId],
    }));
  }

  async function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.firstName.trim()) {
      setError("Escribe el nombre del integrante.");
      return;
    }

    if (!editing && form.password.length < 8) {
      setError("La contraseña debe contener al menos 8 caracteres.");
      return;
    }

    if (form.locationIds.length === 0) {
      setError("Selecciona al menos una ubicación.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        editing ? `/api/team/${editing.organizationUserId}` : "/api/team",
        {
          method: editing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            editing
              ? {
                  firstName: form.firstName.trim(),
                  lastName: form.lastName.trim() || null,
                  phone: form.phone.trim() || null,
                  role: form.role,
                  locationIds: form.locationIds,
                }
              : {
                  firstName: form.firstName.trim(),
                  lastName: form.lastName.trim() || null,
                  email: form.email.trim(),
                  phone: form.phone.trim() || null,
                  password: form.password,
                  role: form.role,
                  locationIds: form.locationIds,
                },
          ),
          cache: "no-store",
        },
      );

      const payload = await response.json();

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload.message ?? "No fue posible guardar al integrante.",
        );
      }

      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setSuccess(
        payload.message ??
          (editing
            ? "Integrante actualizado correctamente."
            : "Integrante agregado correctamente."),
      );
      await loadData();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible guardar al integrante.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(member: TeamMember) {
    const nextStatus = !member.isActive;
    const action = nextStatus ? "activar" : "desactivar";

    if (!window.confirm(`¿Quieres ${action} el acceso de ${member.fullName}?`)) {
      return;
    }

    setChangingStatusId(member.organizationUserId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/team/${member.organizationUserId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: nextStatus,
          }),
          cache: "no-store",
        },
      );

      const payload = await response.json();

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(payload.message ?? "No fue posible cambiar el acceso.");
      }

      setMembers((current) =>
        current.map((item) =>
          item.organizationUserId === member.organizationUserId
            ? { ...item, isActive: nextStatus }
            : item,
        ),
      );
      setSuccess(payload.message ?? "Acceso actualizado correctamente.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible cambiar el acceso.",
      );
    } finally {
      setChangingStatusId(null);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>ADMINISTRACIÓN</span>
          <h1>Equipo</h1>
          <p>Administra quién puede operar Fidara y en qué sucursales.</p>
        </div>

        <button
          type="button"
          className={styles.primaryButton}
          onClick={openCreateForm}
          disabled={locations.length === 0}
        >
          <Plus size={19} />
          Agregar integrante
        </button>
      </section>

      <section className={styles.metrics}>
        <article>
          <span className={`${styles.metricIcon} ${styles.pink}`}>
            <UsersRound size={21} />
          </span>
          <div>
            <small>Integrantes</small>
            <strong>{members.length}</strong>
          </div>
        </article>

        <article>
          <span className={`${styles.metricIcon} ${styles.green}`}>
            <Check size={21} />
          </span>
          <div>
            <small>Accesos activos</small>
            <strong>{activeCount}</strong>
          </div>
        </article>

        <article>
          <span className={`${styles.metricIcon} ${styles.yellow}`}>
            <UserRound size={21} />
          </span>
          <div>
            <small>Personal operativo</small>
            <strong>{operatorsCount}</strong>
          </div>
        </article>

        <article>
          <span className={`${styles.metricIcon} ${styles.lilac}`}>
            <Building2 size={21} />
          </span>
          <div>
            <small>Sucursales disponibles</small>
            <strong>{locations.length}</strong>
          </div>
        </article>
      </section>

      {error && !formOpen && (
        <div className={styles.errorBox}>
          <span>{error}</span>
          <button type="button" onClick={() => void loadData()}>
            Reintentar
          </button>
        </div>
      )}

      {success && !formOpen && (
        <div className={styles.successBox}>
          <Check size={18} />
          {success}
        </div>
      )}

      {locations.length === 0 && !loading && (
        <div className={styles.noticeBox}>
          <MapPin size={19} />
          <span>Necesitas una ubicación activa antes de agregar integrantes.</span>
          <a href="/dashboard/ubicaciones">Administrar ubicaciones</a>
        </div>
      )}

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <label className={styles.searchBox}>
            <Search size={18} />
            <input
              type="search"
              value={search}
              placeholder="Buscar por nombre, correo, rol o sucursal"
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
                  ? "Todos"
                  : filter === "active"
                    ? "Activos"
                    : "Inactivos"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className={styles.loadingState}>
            <LoaderCircle className={styles.spinner} size={28} />
            <span>Cargando equipo…</span>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className={styles.emptyState}>
            <span>
              <UsersRound size={29} />
            </span>
            <h2>
              {members.length === 0
                ? "Agrega a tu primer integrante"
                : "No encontramos resultados"}
            </h2>
            <p>
              {members.length === 0
                ? "Asigna roles y sucursales para que tu equipo pueda operar Fidara."
                : "Prueba con otra búsqueda o cambia el filtro."}
            </p>
          </div>
        ) : (
          <div className={styles.memberGrid}>
            {filteredMembers.map((member) => {
              const isOwner = member.role === 1;

              return (
                <article className={styles.memberCard} key={member.organizationUserId}>
                  <div className={styles.memberHeader}>
                    <span className={styles.avatar}>{getInitials(member)}</span>
                    <div className={styles.memberIdentity}>
                      <h2>{member.fullName}</h2>
                      <span>{member.email}</span>
                    </div>
                    <span
                      className={
                        member.isActive ? styles.activeBadge : styles.inactiveBadge
                      }
                    >
                      <i />
                      {member.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>

                  <div className={styles.roleRow}>
                    <span className={styles.roleIcon}>
                      <ShieldCheck size={17} />
                    </span>
                    <div>
                      <small>Rol</small>
                      <strong>{roleLabels[member.role] ?? member.roleName}</strong>
                    </div>
                  </div>

                  <div className={styles.locationsBlock}>
                    <small>Sucursales asignadas</small>
                    <div>
                      {isOwner ? (
                        <span className={styles.locationPill}>Todas las ubicaciones</span>
                      ) : member.locations.length > 0 ? (
                        member.locations.map((location) => (
                          <span className={styles.locationPill} key={location.id}>
                            <MapPin size={12} />
                            {location.name}
                          </span>
                        ))
                      ) : (
                        <span className={styles.noLocation}>Sin ubicación</span>
                      )}
                    </div>
                  </div>

                  <div className={styles.memberStats}>
                    <div>
                      <Clock3 size={15} />
                      <span>
                        <small>Último acceso</small>
                        <strong>{formatDate(member.lastLoginAt)}</strong>
                      </span>
                    </div>
                    <div>
                      <Check size={15} />
                      <span>
                        <small>Operaciones</small>
                        <strong>{member.transactionsCount}</strong>
                      </span>
                    </div>
                  </div>

                  {!isOwner && (
                    <div className={styles.cardActions}>
                      <button type="button" onClick={() => openEditForm(member)}>
                        <Pencil size={16} />
                        Editar
                      </button>
                      <button
                        type="button"
                        className={
                          member.isActive
                            ? styles.deactivateButton
                            : styles.activateButton
                        }
                        disabled={changingStatusId === member.organizationUserId}
                        onClick={() => void changeStatus(member)}
                      >
                        {changingStatusId === member.organizationUserId ? (
                          <LoaderCircle className={styles.spinner} size={16} />
                        ) : (
                          <Power size={16} />
                        )}
                        {member.isActive ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {formOpen && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={closeForm}>
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-form-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.eyebrow}>
                  {editing ? "EDITAR ACCESO" : "NUEVO INTEGRANTE"}
                </span>
                <h2 id="team-form-title">
                  {editing ? "Editar integrante" : "Agregar al equipo"}
                </h2>
              </div>
              <button type="button" aria-label="Cerrar" onClick={closeForm}>
                <X size={21} />
              </button>
            </div>

            <form onSubmit={saveMember}>
              {error && <div className={styles.formError}>{error}</div>}

              <div className={styles.formGrid}>
                <label>
                  <span>Nombre *</span>
                  <input
                    required
                    autoFocus
                    value={form.firstName}
                    onChange={(event) => updateField("firstName", event.target.value)}
                  />
                </label>

                <label>
                  <span>Apellido</span>
                  <input
                    value={form.lastName}
                    onChange={(event) => updateField("lastName", event.target.value)}
                  />
                </label>

                <label className={styles.fullField}>
                  <span>Correo electrónico *</span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    disabled={Boolean(editing)}
                    onChange={(event) => updateField("email", event.target.value)}
                  />
                </label>

                <label>
                  <span>Teléfono</span>
                  <input
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                  />
                </label>

                <label>
                  <span>Rol *</span>
                  <select
                    value={form.role}
                    onChange={(event) => updateField("role", Number(event.target.value))}
                  >
                    <option value={4}>Empleado</option>
                    <option value={3}>Encargado</option>
                    <option value={2}>Administrador</option>
                  </select>
                </label>

                {!editing && (
                  <label className={styles.fullField}>
                    <span>Contraseña temporal *</span>
                    <input
                      required
                      type="password"
                      minLength={8}
                      value={form.password}
                      placeholder="Mínimo 8 caracteres"
                      onChange={(event) => updateField("password", event.target.value)}
                    />
                  </label>
                )}
              </div>

              <div className={styles.roleDescription}>
                <ShieldCheck size={18} />
                <span>{roleDescriptions[form.role]}</span>
              </div>

              <fieldset className={styles.locationSelector}>
                <legend>Sucursales permitidas *</legend>
                <p>Selecciona dónde podrá trabajar este integrante.</p>
                <div>
                  {locations.map((location) => {
                    const selected = form.locationIds.includes(location.id);

                    return (
                      <label
                        key={location.id}
                        className={selected ? styles.selectedLocation : ""}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleLocation(location.id)}
                        />
                        <span className={styles.checkboxVisual}>
                          {selected && <Check size={14} />}
                        </span>
                        <span>
                          <strong>{location.name}</strong>
                          <small>
                            {[location.addressLine1, location.city, location.state]
                              .filter(Boolean)
                              .join(", ") || "Ubicación activa"}
                          </small>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelButton} onClick={closeForm}>
                  Cancelar
                </button>
                <button type="submit" className={styles.saveButton} disabled={saving}>
                  {saving && <LoaderCircle className={styles.spinner} size={17} />}
                  {editing ? "Guardar cambios" : "Agregar integrante"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
