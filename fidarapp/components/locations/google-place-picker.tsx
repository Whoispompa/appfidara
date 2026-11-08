"use client";

import {
  LoaderCircle,
  MapPin,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import styles from
  "./google-place-picker.module.css";

export type GooglePlaceSelection = {
  name: string;
  formattedAddress: string;
  addressLine1: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude: number;
  longitude: number;
};

type Props = {
  onPlaceSelected: (
    place: GooglePlaceSelection,
  ) => void;
};

type SelectedPlace = {
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
};

type AddressComponent = {
  types: string[];
  longText?: string;
  shortText?: string;
  long_name?: string;
  short_name?: string;
};

let mapsPromise:
  Promise<typeof google> | null = null;

function loadGoogleMaps(
  apiKey: string,
): Promise<typeof google> {
  if (
    window.google?.maps
      ?.importLibrary
  ) {
    return Promise.resolve(
      window.google,
    );
  }

  if (mapsPromise) {
    return mapsPromise;
  }

  mapsPromise = new Promise(
    (resolve, reject) => {
      const existing =
        document.getElementById(
          "fidara-google-maps",
        ) as HTMLScriptElement | null;

      if (existing) {
        existing.addEventListener(
          "load",
          () => {
            if (
              window.google?.maps
                ?.importLibrary
            ) {
              resolve(window.google);
            } else {
              reject(
                new Error(
                  "Google Maps no cargó correctamente.",
                ),
              );
            }
          },
        );

        return;
      }

      const script =
        document.createElement("script");

      script.id =
        "fidara-google-maps";

      script.src =
        "https://maps.googleapis.com/maps/api/js" +
        `?key=${encodeURIComponent(apiKey)}` +
        "&v=weekly" +
        "&libraries=places,maps" +
        "&language=es" +
        "&region=MX";

      script.async = true;
      script.defer = true;

      script.onload = () => {
        if (
          window.google?.maps
            ?.importLibrary
        ) {
          resolve(window.google);
        } else {
          reject(
            new Error(
              "Google Maps no cargó correctamente.",
            ),
          );
        }
      };

      script.onerror = () => {
        reject(
          new Error(
            "No fue posible cargar Google Maps.",
          ),
        );
      };

      document.head.appendChild(script);
    },
  );

  return mapsPromise;
}

function getComponent(
  components:
    | AddressComponent[]
    | null
    | undefined,
  type: string,
) {
  const component =
    components?.find((item) =>
      item.types.includes(type),
    );

  return (
    component?.longText ??
    component?.long_name ??
    ""
  );
}

export default function GooglePlacePicker({
  onPlaceSelected,
}: Props) {
  const autocompleteContainerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const mapContainerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const mapRef =
    useRef<google.maps.Map | null>(
      null,
    );

  const markerRef =
    useRef<google.maps.Marker | null>(
      null,
    );

  const onPlaceSelectedRef =
    useRef(onPlaceSelected);

  const [selectedPlace, setSelectedPlace] =
    useState<SelectedPlace | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    onPlaceSelectedRef.current =
      onPlaceSelected;
  }, [onPlaceSelected]);

  useEffect(() => {
    const apiKey =
      process.env
        .NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setError(
        "Falta configurar NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.",
      );

      setLoading(false);
      return;
    }

    let autocomplete:
      | google.maps.places.PlaceAutocompleteElement
      | null = null;

    let cancelled = false;

    async function initialize() {
      try {
        const maps =
          await loadGoogleMaps(apiKey!);

        const placesLibrary =
          (await maps.maps.importLibrary(
            "places",
          )) as google.maps.PlacesLibrary;

        if (
          cancelled ||
          !autocompleteContainerRef.current
        ) {
          return;
        }

        autocomplete =
          new placesLibrary
            .PlaceAutocompleteElement();

        autocomplete.placeholder =
          "Busca tu cafetería, negocio o dirección";

        autocomplete.includedRegionCodes =
          ["mx", "us"];

        autocomplete.style.width =
          "100%";

        autocomplete.addEventListener(
          "gmp-select",
          async (event: Event) => {
            try {
              const selectEvent =
                event as Event & {
                  placePrediction: {
                    toPlace: () =>
                      google.maps.places.Place;
                  };
                };

              const place =
                selectEvent.placePrediction
                  .toPlace();

              await place.fetchFields({
                fields: [
                  "displayName",
                  "formattedAddress",
                  "location",
                  "addressComponents",
                ],
              });

              if (!place.location) {
                setError(
                  "Selecciona una ubicación válida.",
                );

                return;
              }

              const components =
                place.addressComponents as
                  | AddressComponent[]
                  | null
                  | undefined;

              const streetNumber =
                getComponent(
                  components,
                  "street_number",
                );

              const route =
                getComponent(
                  components,
                  "route",
                );

              const city =
                getComponent(
                  components,
                  "locality",
                ) ||
                getComponent(
                  components,
                  "sublocality_level_1",
                ) ||
                getComponent(
                  components,
                  "administrative_area_level_2",
                );

              const state =
                getComponent(
                  components,
                  "administrative_area_level_1",
                );

              const country =
                getComponent(
                  components,
                  "country",
                );

              const postalCode =
                getComponent(
                  components,
                  "postal_code",
                );

              const formattedAddress =
                place.formattedAddress ??
                "";

              const addressLine1 =
                [route, streetNumber]
                  .filter(Boolean)
                  .join(" ")
                  .trim() ||
                formattedAddress;

              const latitude =
                place.location.lat();

              const longitude =
                place.location.lng();

              const name =
                place.displayName ||
                formattedAddress ||
                "Ubicación seleccionada";

              setSelectedPlace({
                name,
                formattedAddress,
                latitude,
                longitude,
              });

              setError("");

              onPlaceSelectedRef.current({
                name,
                formattedAddress,
                addressLine1,
                city,
                state,
                country,
                postalCode,
                latitude,
                longitude,
              });
            } catch {
              setError(
                "No fue posible obtener los datos de esta ubicación.",
              );
            }
          },
        );

        autocompleteContainerRef.current
          .replaceChildren(
            autocomplete,
          );

        setLoading(false);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "No fue posible cargar Google Maps.",
        );

        setLoading(false);
      }
    }

    void initialize();

    return () => {
      cancelled = true;
      autocomplete?.remove();
    };
  }, []);

  useEffect(() => {
    if (
      !selectedPlace ||
      !mapContainerRef.current ||
      !window.google?.maps
    ) {
      return;
    }

    const position = {
      lat: selectedPlace.latitude,
      lng: selectedPlace.longitude,
    };

    if (!mapRef.current) {
      mapRef.current =
        new window.google.maps.Map(
          mapContainerRef.current,
          {
            center: position,
            zoom: 16,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            gestureHandling:
              "cooperative",
          },
        );
    } else {
      mapRef.current.setCenter(
        position,
      );

      mapRef.current.setZoom(16);
    }

    if (!markerRef.current) {
      markerRef.current =
        new window.google.maps.Marker({
          map: mapRef.current,
          position,
          title:
            selectedPlace.name,
        });
    } else {
      markerRef.current.setPosition(
        position,
      );

      markerRef.current.setTitle(
        selectedPlace.name,
      );

      markerRef.current.setMap(
        mapRef.current,
      );
    }
  }, [selectedPlace]);

  return (
    <div className={styles.picker}>
      <label className={styles.label}>
        Ubicación en Google Maps *
      </label>

      <div
        ref={
          autocompleteContainerRef
        }
        className={
          styles.autocomplete
        }
      />

      {loading && (
        <div
          className={
            styles.loading
          }
        >
          <LoaderCircle
            className={
              styles.spinner
            }
            size={18}
          />

          Cargando Google Maps…
        </div>
      )}

      {error && (
        <p
          className={styles.error}
          role="alert"
        >
          {error}
        </p>
      )}

      {selectedPlace && (
        <>
          <div
            ref={mapContainerRef}
            className={styles.map}
          />

          <div
            className={
              styles.placeSummary
            }
          >
            <MapPin size={21} />

            <div>
              <strong>
                {selectedPlace.name}
              </strong>

              <span>
                {
                  selectedPlace.formattedAddress
                }
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}