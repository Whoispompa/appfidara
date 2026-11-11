"use client";

import {
  AlertTriangle,
  Building2,
  ChevronDown,
  Check,
  CheckCircle2,
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

type StatusConfirmation = {
  member: TeamMember;
  nextStatus: boolean;
} | null;

type ToastMessage = {
  type: "success" | "error";
  title: string;
  message: string;
} | null;

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
  if (!value) return "Sin actividad";

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
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStatusId, setChangingStatusId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState<TeamForm>(emptyForm);
  const [statusConfirmation, setStatusConfirmation] =
    useState<StatusConfirmation>(null);
  const [toast, setToast] = useState<ToastMessage>(null);

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
          locationsPayload.message ?? "No fue posible cargar las sucursales.",
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

  useEffect(() => {
    if (!toast) return;

    const timeout = window.setTimeout(() => setToast(null), 3200);
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

  const filteredMembers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return members.filter((member) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && member.isActive) ||
        (statusFilter === "inactive" && !member.isActive);

      if (!matchesStatus) return false;
      if (!normalizedSearch) return true;

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
    setToast(null);
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
    setToast(null);
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;

    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setError("");
  }

  function updateField<K extends keyof TeamForm>(field: K, value: TeamForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
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
      setError("Selecciona al menos una sucursal.");
      return;
    }

    const wasEditing = Boolean(editing);
    const memberName = form.firstName.trim();

    setSaving(true);
    setError("");
    setToast(null);

    try {
      const response = await fetch(
        editing ? `/api/team/${editing.organizationUserId}` : "/api/team",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editing
              ? {
                  firstName: memberName,
                  lastName: form.lastName.trim() || null,
                  phone: form.phone.trim() || null,
                  role: form.role,
                  locationIds: form.locationIds,
                }
              : {
                  firstName: memberName,
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
      setToast({
        type: "success",
        title: wasEditing ? "Cambios guardados" : "Integrante agregado",
        message:
          payload.message ??
          (wasEditing
            ? `${memberName} fue actualizado correctamente.`
            : `${memberName} ya forma parte de tu equipo.`),
      });

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

    setChangingStatusId(member.organizationUserId);
    setStatusConfirmation(null);
    setError("");

    try {
      const response = await fetch(
        `/api/team/${member.organizationUserId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: nextStatus }),
          cache: "no-store",
        },
      );

      const payload = await response.json().catch(() => ({}));

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

      setToast({
        type: "success",
        title: nextStatus ? "Acceso reactivado" : "Acceso desactivado",
        message: nextStatus
          ? `${member.fullName} ya puede volver a operar Fidara.`
          : `${member.fullName} ya no tiene acceso al panel.`,
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
          <span className={styles.eyebrow}>ADMINISTRACIÓN</span>
          <h1>Equipo</h1>
          <p>Administra quién puede operar  y en qué sucursales.</p>
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

      {/* <section className={styles.metrics}>
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
      </section> */}

      {error && !formOpen && (
        <div className={styles.errorBox}>
          <span>{error}</span>
          <button type="button" onClick={() => void loadData()}>
            Reintentar
          </button>
        </div>
      )}

      {locations.length === 0 && !loading && (
        <div className={styles.noticeBox}>
          <MapPin size={19} />
          <span>
            Necesitas una sucursal activa antes de agregar integrantes.
          </span>
          <a href="/dashboard/ubicaciones">Administrar sucursales</a>
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
                ? "Asigna roles y sucursales para que tu equipo pueda operar."
                : "Prueba con otra búsqueda o cambia el filtro."}
            </p>
          </div>
        ) : (
          <div className={styles.memberList}>
            {filteredMembers.map((member) => {
              const isOwner = member.role === 1;
              const changing = changingStatusId === member.organizationUserId;

              return (
                <article
                  className={styles.memberRow}
                  key={member.organizationUserId}
                >
                  <div className={styles.memberPrimary}>
                    <span className={styles.avatar}>{getInitials(member)}</span>
                    <div className={styles.memberIdentity}>
                      <div>
                        <h2>{member.fullName}</h2>
                        <span
                          className={
                            member.isActive
                              ? styles.activeBadge
                              : styles.inactiveBadge
                          }
                        >
                          <i />
                          {member.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      <p>{member.email}</p>
                      {member.phone && <small>{member.phone}</small>}
                    </div>
                  </div>

                  <div className={styles.memberRole}>
                    <small>Rol</small>
                    <div>
                      <span className={styles.roleIcon}>
                        <ShieldCheck size={16} />
                      </span>
                      <strong>
                        {roleLabels[member.role] ?? member.roleName}
                      </strong>
                    </div>
                  </div>

                  <div className={styles.memberLocations}>
                    <small>Sucursales asignadas</small>
                    <div>
                      {isOwner ? (
                        <span className={styles.locationPill}>
                          <Building2 size={13} />
                          Todas las sucursales
                        </span>
                      ) : member.locations.length > 0 ? (
                        <>
                          {member.locations.slice(0, 2).map((location) => (
                            <span
                              className={styles.locationPill}
                              key={location.id}
                            >
                              <MapPin size={12} />
                              {location.name}
                            </span>
                          ))}
                          {member.locations.length > 2 && (
                            <span className={styles.moreLocations}>
                              +{member.locations.length - 2}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className={styles.noLocation}>Sin sucursal</span>
                      )}
                    </div>
                  </div>

                  <div className={styles.memberActivity}>
                    <div>
                      <Clock3 size={15} />
                      <span>
                        <small>Último acceso</small>
                        <strong>{formatDate(member.lastLoginAt)}</strong>
                      </span>
                    </div>
                  </div>

                  <div className={styles.rowActions}>
                    {isOwner ? (
                      <span className={styles.ownerNotice}>
                        Propietario principal
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={styles.editButton}
                          onClick={() => openEditForm(member)}
                        >
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
                          disabled={changing}
                          onClick={() =>
                            setStatusConfirmation({
                              member,
                              nextStatus: !member.isActive,
                            })
                          }
                        >
                          {changing ? (
                            <LoaderCircle
                              className={styles.spinner}
                              size={16}
                            />
                          ) : (
                            <Power size={16} />
                          )}
                          {member.isActive ? "Desactivar" : "Activar"}
                        </button>
                      </>
                    )}
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
                    onChange={(event) =>
                      updateField("firstName", event.target.value)
                    }
                  />
                </label>

                <label>
                  <span>Apellido</span>
                  <input
                    value={form.lastName}
                    onChange={(event) =>
                      updateField("lastName", event.target.value)
                    }
                  />
                </label>

                <label className={styles.fullField}>
                  <span>Correo electrónico *</span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    disabled={Boolean(editing)}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                  />
                </label>

                <label>
                  <span>Teléfono</span>
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      updateField("phone", event.target.value)
                    }
                  />
                </label>


<div className={styles.roleField}>
  <span className={styles.fieldLabel}>Rol *</span>

  <div
    className={styles.customSelect}
    onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node)) {
        setRoleMenuOpen(false);
      }
    }}
  >
    <button
      type="button"
      className={`${styles.selectTrigger} ${
        roleMenuOpen ? styles.selectTriggerOpen : ""
      }`}
      aria-haspopup="listbox"
      aria-expanded={roleMenuOpen}
      onClick={() => setRoleMenuOpen((current) => !current)}
    >
      <span>{roleLabels[form.role]}</span>

      <ChevronDown
        size={17}
        className={roleMenuOpen ? styles.chevronOpen : ""}
      />
    </button>

    {roleMenuOpen && (
      <div
        className={styles.selectMenu}
        role="listbox"
        aria-label="Seleccionar rol"
      >
        {[
          { value: 4, label: "Empleado" },
          { value: 3, label: "Encargado" },
          { value: 2, label: "Administrador" },
        ].map((role) => {
          const selected = form.role === role.value;

          return (
            <button
              key={role.value}
              type="button"
              role="option"
              aria-selected={selected}
              className={`${styles.selectOption} ${
                selected ? styles.selectedOption : ""
              }`}
              onClick={() => {
                updateField("role", role.value);
                setRoleMenuOpen(false);
              }}
            >
              <span>{role.label}</span>

              {selected && <Check size={16} />}
            </button>
          );
        })}
      </div>
    )}
  </div>
</div>

                {!editing && (
                  <label className={styles.fullField}>
                    <span>Contraseña temporal *</span>
                    <input
                      required
                      type="password"
                      minLength={8}
                      value={form.password}
                      placeholder="Mínimo 8 caracteres"
                      onChange={(event) =>
                        updateField("password", event.target.value)
                      }
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
                            {[
                              location.addressLine1,
                              location.city,
                              location.state,
                            ]
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
                  disabled={saving}
                >
                  {saving && (
                    <LoaderCircle className={styles.spinner} size={17} />
                  )}
                  {editing ? "Guardar cambios" : "Agregar integrante"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {statusConfirmation && (
        <div
          className={styles.confirmBackdrop}
          role="presentation"
          onMouseDown={() => setStatusConfirmation(null)}
        >
          <section
            className={styles.confirmDialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="team-status-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.confirmHeading}>
              <span
                className={
                  statusConfirmation.nextStatus
                    ? styles.confirmIconSuccess
                    : styles.confirmIconDanger
                }
              >
                {statusConfirmation.nextStatus ? (
                  <Power size={22} />
                ) : (
                  <AlertTriangle size={22} />
                )}
              </span>
              <h2 id="team-status-dialog-title">
                {statusConfirmation.nextStatus
                  ? "¿Reactivar integrante?"
                  : "¿Desactivar integrante?"}
              </h2>
              <button
                type="button"
                className={styles.confirmClose}
                onClick={() => setStatusConfirmation(null)}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <p>
              {statusConfirmation.nextStatus
                ? `${statusConfirmation.member.fullName} volverá a tener acceso al panel y a sus sucursales asignadas.`
                : `${statusConfirmation.member.fullName} perderá el acceso al panel, pero conservará su historial.`}
            </p>

            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setStatusConfirmation(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={
                  statusConfirmation.nextStatus
                    ? styles.confirmSuccessButton
                    : styles.confirmDangerButton
                }
                onClick={() => void changeStatus(statusConfirmation.member)}
              >
                <Power size={17} />
                {statusConfirmation.nextStatus
                  ? "Sí, reactivar"
                  : "Sí, desactivar"}
              </button>
            </div>
          </section>
        </div>
      )}

      {toast && (
        <div
          className={`${styles.toast} ${
            toast.type === "success" ? styles.toastSuccess : styles.toastError
          }`}
          role="status"
          aria-live="polite"
        >
          <span className={styles.toastIcon}>
            {toast.type === "success" ? (
              <CheckCircle2 size={19} />
            ) : (
              <AlertTriangle size={19} />
            )}
          </span>
          <div>
            <strong>{toast.title}</strong>
            <p>{toast.message}</p>
          </div>
          <button
            type="button"
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
