export type DateTimePreferences = {
  language?: string | null;
  locale?: string | null;
  timeZone?: string | null;
};

type StoredSession = {
  language?: string | null;
  locale?: string | null;
  timeZone?: string | null;
};

function readStoredPreferences(): DateTimePreferences {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = sessionStorage.getItem("fidara_session");

    if (!raw) {
      return {};
    }

    const session = JSON.parse(raw) as StoredSession;

    return {
      language: session.language,
      locale: session.locale,
      timeZone: session.timeZone,
    };
  } catch {
    return {};
  }
}

function resolvePreferences(preferences: DateTimePreferences = {}) {
  const stored = readStoredPreferences();

  return {
    locale:
      preferences.locale ??
      preferences.language ??
      stored.locale ??
      stored.language ??
      "es-MX",
    timeZone: preferences.timeZone ?? stored.timeZone ?? undefined,
  };
}

function parseUtcDate(value: string | Date) {
  if (value instanceof Date) {
    return value;
  }

  // SQL datetime/datetime2 llega a veces sin sufijo. El backend guarda UTC.
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const normalized = value.includes("T") && !hasTimeZone ? `${value}Z` : value;

  return new Date(normalized);
}

function safeFormat(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions,
  preferences: DateTimePreferences,
  fallback: string,
) {
  if (!value) {
    return fallback;
  }

  const date = parseUtcDate(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  const resolved = resolvePreferences(preferences);

  return new Intl.DateTimeFormat(resolved.locale, {
    ...options,
    ...(resolved.timeZone ? { timeZone: resolved.timeZone } : {}),
  }).format(date);
}

export function formatDateTime(
  value: string | Date | null | undefined,
  preferences: DateTimePreferences = {},
  fallback = "—",
) {
  return safeFormat(
    value,
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
    preferences,
    fallback,
  );
}

export function formatShortDateTime(
  value: string | Date | null | undefined,
  preferences: DateTimePreferences = {},
  fallback = "—",
) {
  return safeFormat(
    value,
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    },
    preferences,
    fallback,
  );
}

export function formatDate(
  value: string | Date | null | undefined,
  preferences: DateTimePreferences = {},
  fallback = "—",
) {
  return safeFormat(
    value,
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
    preferences,
    fallback,
  );
}

export function formatTime(
  value: string | Date | null | undefined,
  preferences: DateTimePreferences = {},
  fallback = "—",
) {
  return safeFormat(
    value,
    {
      hour: "2-digit",
      minute: "2-digit",
    },
    preferences,
    fallback,
  );
}

// Fechas civiles como cumpleaños no deben convertirse entre zonas horarias.
export function formatDateOnly(
  value: string | null | undefined,
  preferences: DateTimePreferences = {},
  fallback = "—",
) {
  if (!value) {
    return fallback;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  if (!match) {
    return fallback;
  }

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  const resolved = resolvePreferences(preferences);

  return new Intl.DateTimeFormat(resolved.locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
