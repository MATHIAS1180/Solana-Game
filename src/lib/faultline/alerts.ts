export type AlertPreferences = {
  enabled: boolean;
  reveal: boolean;
  claim: boolean;
  reserve: boolean;
};

export const ALERT_PREFERENCES_KEY = "faultline:alerts:v1";
export const ALERT_SEEN_KEY = "faultline:alerts:seen:v1";

export const DEFAULT_ALERT_PREFERENCES: AlertPreferences = {
  enabled: false,
  reveal: true,
  claim: true,
  reserve: false
};

export function parseAlertPreferences(raw: string | null): AlertPreferences {
  if (!raw) {
    return DEFAULT_ALERT_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AlertPreferences>;
    return {
      enabled: parsed.enabled ?? DEFAULT_ALERT_PREFERENCES.enabled,
      reveal: parsed.reveal ?? DEFAULT_ALERT_PREFERENCES.reveal,
      claim: parsed.claim ?? DEFAULT_ALERT_PREFERENCES.claim,
      reserve: parsed.reserve ?? DEFAULT_ALERT_PREFERENCES.reserve
    };
  } catch {
    return DEFAULT_ALERT_PREFERENCES;
  }
}

export function serializeAlertPreferences(value: AlertPreferences) {
  return JSON.stringify(value);
}

export function parseSeenAlerts(raw: string | null) {
  if (!raw) {
    return {} as Record<string, number>;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, number>;
    return Object.fromEntries(Object.entries(parsed).filter((entry) => Number.isFinite(entry[1])));
  } catch {
    return {} as Record<string, number>;
  }
}

export function markSeenAlert(existing: Record<string, number>, id: string, timestamp = Date.now()) {
  const next = {
    ...existing,
    [id]: timestamp
  };

  const prunedEntries = Object.entries(next)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 200);

  return Object.fromEntries(prunedEntries);
}
