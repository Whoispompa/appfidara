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

import styles from
  "./location-selection.module.css";

type Location = {
  id: string;
  name: string;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
};

type FidaraSession = {
  userName?: string;
  organizationName?: string;
  organizationLogoUrl?: string | null;
  locations?: Location[];
  activeLocationId?: string;
  activeLocationName?: string;
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

  useEffect(() => {
    const rawSession =
      sessionStorage.getItem(
        "fidara_session",
      );

    if (!rawSession) {
      window.location.replace("/login");
      return;
    }

    try {
      const parsed =
        JSON.parse(rawSession) as FidaraSession;

      const locations =
        Array.isArray(parsed.locations)
          ? parsed.locations
          : [];

      if (locations.length === 0) {
        window.location.replace(
          "/dashboard",
        );

        return;
      }

      if (locations.length === 1) {
        window.location.replace(
          "/dashboard",
        );

        return;
      }

      setSession({
        ...parsed,
        locations,
      });
    } catch {
      sessionStorage.removeItem(
        "fidara_session",
      );

      window.location.replace("/login");
    }
  }, []);

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
      const response = await fetch(
        "/api/session/location",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            locationId: selectedId,
          }),
        },
      );

      const payload = await response
        .json()
        .catch(() => ({}));

      if (response.status === 401) {
        sessionStorage.removeItem(
          "fidara_session",
        );

        window.location.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload.message ??
            "No fue posible seleccionar la sucursal.",
        );
      }

      const selectedLocation =
        session?.locations?.find(
          location =>
            location.id === selectedId,
        );

      const updatedSession = {
        ...session,

        activeLocationId:
          selectedLocation?.id,

        activeLocationName:
          selectedLocation?.name,
      };

      sessionStorage.setItem(
        "fidara_session",
        JSON.stringify(updatedSession),
      );

      window.location.assign(
        "/dashboard",
      );
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

        <h1>Selecciona tu sucursal</h1>

        <p className={styles.introduction}>
          Hola {session.userName}. Elige dónde
          trabajarás durante esta sesión.
        </p>

        {error && (
          <div
            className={styles.error}
            role="alert"
          >
            {error}
          </div>
        )}

        <div className={styles.locations}>
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
        </div>

        <button
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
        </button>

        <p className={styles.organization}>
          {session.organizationName}
        </p>
      </section>
    </main>
  );
}