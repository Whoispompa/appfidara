"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

type Location = { id: string; name: string };
type StoredSession = {
  activeLocationId?: string;
  activeLocationName?: string;
  defaultLocationId?: string;
  locations?: Location[];
};

export function useActiveLocation() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState("");
  const [ready, setReady] = useState(false);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("fidara_session");
      const session = raw ? (JSON.parse(raw) as StoredSession) : {};
      const allowed = Array.isArray(session.locations) ? session.locations : [];
      const candidate =
        session.activeLocationId ??
        session.defaultLocationId ??
        (allowed.length === 1 ? allowed[0].id : "");
      // La sesión del navegador es la fuente externa de estas ubicaciones.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocations(allowed);
      setLocationId(allowed.some((item) => item.id === candidate) ? candidate : "");
    } catch {
      setLocations([]);
      setLocationId("");
    } finally {
      setReady(true);
    }
  }, []);

  const selectLocation = useCallback(async (nextId: string) => {
    if (!nextId) {
      setLocationId("");
      return;
    }
    setChanging(true);
    try {
      const response = await fetch("/api/session/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: nextId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message ?? "No fue posible activar la sucursal.");
      setLocationId(nextId);
      const raw = sessionStorage.getItem("fidara_session");
      const session = raw ? (JSON.parse(raw) as StoredSession) : {};
      const selected = locations.find((item) => item.id === nextId);
      sessionStorage.setItem("fidara_session", JSON.stringify({
        ...session,
        activeLocationId: nextId,
        activeLocationName: selected?.name,
      }));
    } catch (caught) {
      toast.error("No se pudo cambiar la sucursal", {
        description: caught instanceof Error ? caught.message : undefined,
      });
    } finally {
      setChanging(false);
    }
  }, [locations]);

  return {
    locations,
    locationId,
    location: locations.find((item) => item.id === locationId),
    ready,
    changing,
    selectLocation,
  };
}

export function ActiveLocationSelector({ compact = false }: { compact?: boolean }) {
  const state = useActiveLocation();
  if (!state.ready) return null;
  if (state.locations.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
        No tienes sucursales autorizadas. Solicita acceso antes de vender o canjear.
      </div>
    );
  }
  if (state.locations.length === 1) {
    return (
      <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
        <MapPin size={16} /> {state.locations[0].name}
      </div>
    );
  }
  return (
    <label className={compact ? "grid gap-1 text-sm font-bold" : "grid gap-2 text-sm font-bold"}>
      Sucursal activa
      <select
        className="h-11 rounded-xl border border-slate-300 bg-white px-3"
        value={state.locationId}
        disabled={state.changing}
        onChange={(event) => void state.selectLocation(event.target.value)}
      >
        <option value="">Selecciona una sucursal</option>
        {state.locations.map((location) => (
          <option key={location.id} value={location.id}>{location.name}</option>
        ))}
      </select>
    </label>
  );
}

