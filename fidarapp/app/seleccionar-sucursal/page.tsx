"use client";

import {
  ArrowRight,
  Building2,
  LoaderCircle,
  MapPin,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  isOperationalSession,
  readLocationSession,
  resolveCachedActiveLocation,
  storeValidatedLocation,
  type LocationSession,
} from "@/lib/active-location-client";

import styles from
  "./location-selection.module.css";

type Location = {
  id: string;
  name: string;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  isActive?: boolean;
};

type FidaraSession = {
  userName?: string;
  organizationName?: string;
  organizationLogoUrl?: string | null;
  locations?: Location[];
  activeLocationId?: string;
  activeLocationName?: string;
  defaultLocationId?: string;
  roleId?: number;
  role?: string | number;
};

export default function SelectLocationPage() {
  const [session, setSession] =
    useState<FidaraSession | null>(null);

  const [selectedId, setSelectedId] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [operationalBlocked, setOperationalBlocked] =
    useState(false);

  useEffect(() => {
    void (async () => {
      let parsed: FidaraSession;
      try {
        parsed = readLocationSession() as FidaraSession;
        if (!sessionStorage.getItem("fidara_session")) {
          window.location.replace("/login");
          return;
        }
      } catch {
        sessionStorage.removeItem("fidara_session");
        window.location.replace("/login");
        return;
      }

      if (isOperationalSession(parsed as LocationSession)) {
        const activeLocation = resolveCachedActiveLocation(
          parsed as LocationSession,
        );
        if (activeLocation) {
          window.location.replace("/dashboard");
          return;
        }

        setSession({ ...parsed, locations: [] });
        setOperationalBlocked(true);
        setError(
          "No tienes una sucursal operativa válida. Contacta a un administrador para corregir tu asignación desde Equipo.",
        );
        return;
      }

      try {
        const response = await fetch("/api/team/me/locations", {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (response.status === 401) {
          sessionStorage.removeItem("fidara_session");
          window.location.replace("/login");
          return;
        }
        if (!response.ok) {
          throw new Error(
            payload.message ?? "No fue posible actualizar tus sucursales autorizadas.",
          );
        }

        const locations = (Array.isArray(payload.data) ? payload.data : [])
          .filter((location: Location) => location.isActive !== false);
        const refreshedSession = { ...parsed, locations };
        setSession(refreshedSession);

        if (locations.length === 0) {
          setError("No tienes sucursales habilitadas para operar.");
          return;
        }

        if (locations.length === 1) {
          await confirmLocation(locations[0], refreshedSession);
        }
      } catch (caught) {
        setSession({ ...parsed, locations: [] });
        setError(
          caught instanceof Error
            ? caught.message
            : "No fue posible actualizar tus sucursales autorizadas.",
        );
      }
    })();
  }, []);

  async function confirmLocation(
    selectedLocation: Location,
    currentSession: FidaraSession,
  ) {
    const response = await fetch("/api/session/location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId: selectedLocation.id }),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) {
      sessionStorage.removeItem("fidara_session");
      window.location.replace("/login");
      return;
    }
    if (!response.ok) {
      throw new Error(payload.message ?? "No fue posible seleccionar la sucursal.");
    }

    const confirmed = payload.data as Partial<Location> | undefined;
    if (!confirmed?.id || confirmed.id !== selectedLocation.id) {
      throw new Error("La API no confirmó la sucursal seleccionada.");
    }

    storeValidatedLocation(
      currentSession as LocationSession,
      {
        id: confirmed.id,
        name: confirmed.name?.trim() || selectedLocation.name,
      },
      currentSession.locations,
    );
    window.location.replace("/dashboard");
  }

  async function continueToDashboard() {
    if (!selectedId) {
      setError(
        "Selecciona la sucursal donde estás trabajando.",
      );

      return;
    }

    setError("");
    setLoading(true);

    try {
      const selectedLocation =
        session?.locations?.find(
          location =>
            location.id === selectedId,
        );

      if (!selectedLocation || !session) {
        throw new Error("La sucursal seleccionada ya no está disponible.");
      }

      await confirmLocation(selectedLocation, session);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Ocurrió un error inesperado.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!session) {
    return (
      <main className={styles.page}>
        <LoaderCircle
          className={styles.spinner}
          size={32}
        />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.brand}>
          <img
            src="/Fidara-logo-horizontal.png"
            alt="Fidara"
          />
        </div>

        <div className={styles.icon}>
          <Building2 size={25} />
        </div>

        <span className={styles.eyebrow}>
          Espacio de trabajo
        </span>

        <h1>
          {operationalBlocked
            ? "Sucursal no disponible"
            : "Selecciona tu sucursal"}
        </h1>

        <p className={styles.introduction}>
          {operationalBlocked
            ? `Hola ${session.userName}. Tu administrador debe actualizar tu asignación.`
            : `Hola ${session.userName}. Elige dónde trabajarás durante esta sesión.`}
        </p>

        {error && (
          <div
            className={styles.error}
            role="alert"
          >
            {error}
          </div>
        )}

        {!operationalBlocked && <div className={styles.locations}>
          {session.locations?.map(
            location => {
              const selected =
                location.id === selectedId;

              const address = [
                location.addressLine1,
                location.city,
                location.state,
              ]
                .filter(Boolean)
                .join(", ");

              return (
                <button
                  type="button"
                  key={location.id}
                  className={[
                    styles.location,
                    selected
                      ? styles.selected
                      : "",
                  ].join(" ")}
                  onClick={() => {
                    setSelectedId(
                      location.id,
                    );

                    setError("");
                  }}
                >
                  <span
                    className={
                      styles.locationIcon
                    }
                  >
                    <MapPin size={20} />
                  </span>

                  <span
                    className={
                      styles.locationCopy
                    }
                  >
                    <strong>
                      {location.name}
                    </strong>

                    <small>
                      {address ||
                        "Sucursal Fidara"}
                    </small>
                  </span>

                  <span
                    className={
                      styles.selection
                    }
                    aria-hidden="true"
                  />
                </button>
              );
            },
          )}
        </div>}

        {!operationalBlocked && <button
          type="button"
          className={styles.continueButton}
          disabled={
            !selectedId || loading
          }
          onClick={() =>
            void continueToDashboard()
          }
        >
          {loading ? (
            <>
              <LoaderCircle
                className={styles.spinner}
                size={19}
              />
              Preparando sucursal…
            </>
          ) : (
            <>
              Continuar
              <ArrowRight size={19} />
            </>
          )}
        </button>}

        <p className={styles.organization}>
          {session.organizationName}
        </p>
      </section>
    </main>
  );
}
