export const SESSION_STORAGE_KEY = "fidara_session";
export const SESSION_UPDATED_EVENT = "fidara-session-updated";

export type SessionLocation = {
  id: string;
  name: string;
  isActive?: boolean;
};

export type LocationSession = {
  roleId?: number;
  role?: string | number;
  activeLocationId?: string;
  activeLocationName?: string;
  defaultLocationId?: string;
  locations?: SessionLocation[];
  [key: string]: unknown;
};

export function isOperationalSession(session: LocationSession) {
  return (
    session.roleId === 3 ||
    session.roleId === 4 ||
    session.role === 3 ||
    session.role === 4 ||
    session.role === "Manager" ||
    session.role === "Employee"
  );
}

export function readLocationSession(): LocationSession {
  if (typeof window === "undefined") return {};
  const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as LocationSession) : {};
}

export function resolveCachedActiveLocation(session: LocationSession) {
  const locations = Array.isArray(session.locations) ? session.locations : [];
  const locationId = session.activeLocationId ?? session.defaultLocationId;
  return locations.find(
    (location) => location.id === locationId && location.isActive !== false,
  );
}

export function storeValidatedLocation(
  session: LocationSession,
  location: SessionLocation,
  locations = session.locations,
) {
  const updated: LocationSession = {
    ...session,
    locations,
    activeLocationId: location.id,
    activeLocationName: location.name,
  };

  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
  return updated;
}

export function clearCachedActiveLocation() {
  try {
    const session = readLocationSession();
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        ...session,
        activeLocationId: undefined,
        activeLocationName: undefined,
        defaultLocationId: undefined,
      }),
    );
    window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
  } catch {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

export function operationalErrorMessage(
  payload: { code?: unknown; message?: unknown },
  fallback: string,
) {
  if (
    payload.code === "PROGRAM_LOCATION_NOT_ENABLED" ||
    payload.code === "PROGRAM_LOCATION_NOT_ALLOWED"
  ) {
    return "Este programa no está habilitado en la sucursal seleccionada.";
  }

  if (payload.code === "LOCATION_ACCESS_DENIED") {
    const session = readLocationSession();
    clearCachedActiveLocation();

    if (isOperationalSession(session)) {
      return "Ya no tienes acceso a tu sucursal operativa. Contacta a un administrador para corregir tu asignación desde Equipo.";
    }

    window.setTimeout(() => {
      window.location.replace("/seleccionar-sucursal?reason=location-access");
    }, 900);
  }

  return typeof payload.message === "string" && payload.message.trim()
    ? payload.message
    : fallback;
}
