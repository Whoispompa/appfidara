"use client";

import {
  BellRing,
  CheckCircle2,
  LoaderCircle,
  MapPin,
  Save,
  Smartphone,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";

type ProgramSummary = {
  id: string;
  name: string;
  isActive?: boolean;
};

type GeoLocation = {
  id: string;
  name: string;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  latitude: number;
  longitude: number;
};

type GeoPushConfiguration = {
  program: {
    id: string;
    name: string;
    geoPushEnabled: boolean;
    geoPushMessage?: string | null;
    selectedLocationIds: string[];
  };
  availableLocations: GeoLocation[];
  maximumLocations: number;
  maximumMessageLength: number;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

const DEFAULT_MESSAGE =
  "Tu tarjeta está lista para usar cerca de esta sucursal.";

export function GeoPushPanel() {
  const [programs, setPrograms] =
    useState<ProgramSummary[]>([]);

  const [programId, setProgramId] =
    useState("");

  const [configuration, setConfiguration] =
    useState<GeoPushConfiguration | null>(null);

  const [enabled, setEnabled] =
    useState(false);

  const [message, setMessage] =
    useState(DEFAULT_MESSAGE);

  const [selectedLocationIds, setSelectedLocationIds] =
    useState<string[]>([]);

  const [loadingPrograms, setLoadingPrograms] =
    useState(true);

  const [loadingConfiguration, setLoadingConfiguration] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadPrograms = useCallback(async () => {
    setLoadingPrograms(true);

    try {
      const response = await fetch("/api/programs", {
        cache: "no-store",
      });

      const payload =
        (await response.json().catch(() => ({}))) as
          ApiEnvelope<ProgramSummary[]>;

      if (response.status === 401) {
        window.location.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload.message ??
            "No fue posible cargar los programas.",
        );
      }

      const nextPrograms =
        Array.isArray(payload.data)
          ? payload.data.filter(
              (program) =>
                program.isActive !== false,
            )
          : [];

      setPrograms(nextPrograms);

      setProgramId((current) => {
        if (
          current &&
          nextPrograms.some(
            (program) => program.id === current,
          )
        ) {
          return current;
        }

        return nextPrograms[0]?.id ?? "";
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible cargar los programas.",
      );
    } finally {
      setLoadingPrograms(false);
    }
  }, []);

  const loadConfiguration =
    useCallback(async (selectedProgramId: string) => {
      if (!selectedProgramId) {
        setConfiguration(null);
        return;
      }

      setLoadingConfiguration(true);
      setError("");

      try {
        const response = await fetch(
          `/api/programs/${encodeURIComponent(selectedProgramId)}/geo-push`,
          {
            cache: "no-store",
          },
        );

        const payload =
          (await response.json().catch(() => ({}))) as
            ApiEnvelope<GeoPushConfiguration>;

        if (response.status === 401) {
          window.location.replace("/login");
          return;
        }

        if (!response.ok || !payload.data) {
          throw new Error(
            payload.message ??
              "No fue posible cargar GeoPush.",
          );
        }

        setConfiguration(payload.data);

        setEnabled(
          payload.data.program.geoPushEnabled,
        );

        setMessage(
          payload.data.program.geoPushMessage ||
            DEFAULT_MESSAGE,
        );

        setSelectedLocationIds(
          payload.data.program
            .selectedLocationIds ?? [],
        );
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "No fue posible cargar GeoPush.",
        );
      } finally {
        setLoadingConfiguration(false);
      }
    }, []);

  useEffect(() => {
    void loadPrograms();
  }, [loadPrograms]);

  useEffect(() => {
    if (!programId) return;

    void loadConfiguration(programId);
  }, [programId, loadConfiguration]);

  function toggleLocation(locationId: string) {
    setSelectedLocationIds((current) => {
      if (current.includes(locationId)) {
        return current.filter(
          (id) => id !== locationId,
        );
      }

      if (
        current.length >=
        (configuration?.maximumLocations ?? 10)
      ) {
        setError(
          "Apple Wallet permite un máximo de 10 sucursales.",
        );

        return current;
      }

      setError("");
      return [...current, locationId];
    });
  }

  async function saveConfiguration() {
    if (!programId || saving) return;

    if (enabled && !message.trim()) {
      setError("Escribe un mensaje para GeoPush.");
      return;
    }

    if (
      enabled &&
      selectedLocationIds.length === 0
    ) {
      setError(
        "Selecciona al menos una sucursal.",
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/programs/${encodeURIComponent(programId)}/geo-push`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            enabled,
            message: message.trim(),
            locationIds: selectedLocationIds,
          }),
        },
      );

      const payload =
        (await response.json().catch(() => ({}))) as
          ApiEnvelope<unknown>;

      if (response.status === 401) {
        window.location.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload.message ??
            "No fue posible guardar GeoPush.",
        );
      }

      toast.success(
        enabled ? "GeoPush activado" : "GeoPush desactivado",
        {
          description: enabled
            ? "Las tarjetas Apple fueron actualizadas."
            : "La configuración se guardó correctamente.",
        },
      );

      await loadConfiguration(programId);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible guardar GeoPush.",
      );
    } finally {
      setSaving(false);
    }
  }

  const maximumMessageLength =
    configuration?.maximumMessageLength ?? 160;

  const canSave =
    Boolean(programId) &&
    !saving &&
    (!enabled ||
      (message.trim().length > 0 &&
        selectedLocationIds.length > 0));

  return (
    <section className="mb-6 overflow-hidden rounded-[22px] border border-[#E5E7EB] bg-white shadow-[0_18px_45px_rgba(0,0,0,0.06)]">
      <div className="flex flex-col gap-4 border-b border-[#E5E7EB] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-50 text-[#E11D48]">
            <MapPin size={20} />
          </span>

          <div>
            <span className="text-[10px] font-black tracking-[0.16em] text-[#E11D48]">
              APPLE WALLET
            </span>

            <h2 className="mt-1 text-base font-black">
              Recordatorios por cercanía
            </h2>

            <p className="mt-1 text-xs leading-5 text-[#6B7280]">
              Muestra la tarjeta cuando el cliente
              se acerque a una sucursal.
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={
            loadingConfiguration ||
            !programId
          }
          onClick={() =>
            setEnabled((current) => !current)
          }
          className={[
            "relative h-7 w-12 rounded-full transition",
            enabled
              ? "bg-[#E11D48]"
              : "bg-[#E5E7EB]",
          ].join(" ")}
        >
          <span
            className={[
              "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition",
              enabled ? "left-6" : "left-1",
            ].join(" ")}
          />
        </button>
      </div>

      {loadingPrograms ? (
        <div className="grid min-h-48 place-items-center">
          <LoaderCircle
            size={27}
            className="animate-spin text-[#E11D48]"
          />
        </div>
      ) : programs.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm font-bold">
            No hay programas activos.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-xs font-extrabold">
                Programa
              </span>

              <select
                value={programId}
                onChange={(event) =>
                  setProgramId(event.target.value)
                }
                className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold outline-none focus:border-[#E11D48] focus:ring-4 focus:ring-rose-100"
              >
                {programs.map((program) => (
                  <option
                    key={program.id}
                    value={program.id}
                  >
                    {program.name}
                  </option>
                ))}
              </select>
            </label>

            {loadingConfiguration ? (
              <div className="grid min-h-40 place-items-center">
                <LoaderCircle
                  size={24}
                  className="animate-spin text-[#E11D48]"
                />
              </div>
            ) : (
              <>
                <label className="block">
                  <span className="mb-2 flex items-center justify-between text-xs font-extrabold">
                    Mensaje

                    <small className="text-[#9CA3AF]">
                      {message.length}/
                      {maximumMessageLength}
                    </small>
                  </span>

                  <textarea
                    rows={4}
                    maxLength={maximumMessageLength}
                    value={message}
                    onChange={(event) =>
                      setMessage(event.target.value)
                    }
                    placeholder="¿Ya tomaste café hoy? ☕"
                    className="w-full resize-none rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm font-semibold leading-6 outline-none focus:border-[#E11D48] focus:ring-4 focus:ring-rose-100"
                  />
                </label>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-extrabold">
                      Sucursales
                    </span>

                    <small className="font-bold text-[#9CA3AF]">
                      {selectedLocationIds.length}/
                      {configuration?.maximumLocations ??
                        10}
                    </small>
                  </div>

                  <div className="grid gap-2">
                    {configuration?.availableLocations.map(
                      (location) => {
                        const selected =
                          selectedLocationIds.includes(
                            location.id,
                          );

                        return (
                          <button
                            key={location.id}
                            type="button"
                            onClick={() =>
                              toggleLocation(
                                location.id,
                              )
                            }
                            className={[
                              "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition",
                              selected
                                ? "border-[#E11D48] bg-rose-50"
                                : "border-[#E5E7EB] hover:border-slate-300",
                            ].join(" ")}
                          >
                            <span
                              className={[
                                "grid h-9 w-9 place-items-center rounded-xl",
                                selected
                                  ? "bg-[#E11D48] text-white"
                                  : "bg-[#F3F4F6] text-[#6B7280]",
                              ].join(" ")}
                            >
                              {selected ? (
                                <CheckCircle2
                                  size={17}
                                />
                              ) : (
                                <MapPin size={17} />
                              )}
                            </span>

                            <span className="min-w-0">
                              <strong className="block truncate text-sm">
                                {location.name}
                              </strong>

                              <small className="block truncate text-[#6B7280]">
                                {[
                                  location.addressLine1,
                                  location.city,
                                ]
                                  .filter(Boolean)
                                  .join(", ") ||
                                  "Ubicación configurada"}
                              </small>
                            </span>
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  disabled={!canSave}
                  onClick={() =>
                    void saveConfiguration()
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-5 text-sm font-extrabold text-white shadow-lg shadow-rose-600/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ? (
                    <LoaderCircle
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <Save size={17} />
                  )}

                  {saving
                    ? "Guardando…"
                    : "Guardar GeoPush"}
                </button>
              </>
            )}
          </div>

          <aside className="rounded-2xl bg-black p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <small className="font-bold text-white/60">
                  Vista previa
                </small>

                <strong className="mt-1 block text-sm">
                  Pantalla bloqueada
                </strong>
              </div>

              <Smartphone
                size={19}
                className="text-white/65"
              />
            </div>

            <div className="mt-6 rounded-2xl bg-white p-4 text-black shadow-xl">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E11D48] text-white">
                  <BellRing size={18} />
                </span>

                <div>
                  <strong className="text-xs">
                    {configuration?.program.name ||
                      "Tu programa"}
                  </strong>

                  <p className="mt-2 text-xs leading-5 text-[#6B7280]">
                    {message.trim() ||
                      "Tu mensaje aparecerá aquí."}
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-5 text-[11px] leading-5 text-white/60">
              Apple determina automáticamente el
              radio y el momento en que presenta la
              tarjeta.
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}
