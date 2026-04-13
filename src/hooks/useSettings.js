import { useCallback, useEffect, useMemo, useState } from "react";

const SETTINGS_KEY = "elderguard.settings.v1";
const HISTORY_KEY = "elderguard.history.v1";

const defaultSettings = {
  topic: "",
  patientName: "",
  caretakerPhone: "",
  escalationPhone: "",
  ntfyAccessToken: "",
  phoneCallEscalation: false,
  repeatAlarm: false,
  maxPriority: false,
  ringingMode: true,
  localAlarmSound: true,
  connectionVerified: false,
  preferredSound: "standard",
  createdAt: null,
  updatedAt: null
};

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function asString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeHistoryEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const type = asString(entry.type, "test");
  const status = entry.status === "failed" ? "failed" : "delivered";

  return {
    id: asString(entry.id, `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    timestamp: asString(entry.timestamp, new Date().toISOString()),
    type,
    title: asString(entry.title, ""),
    body: asString(entry.body, ""),
    priority: asString(entry.priority, "default"),
    tags: asString(entry.tags, ""),
    status,
    error: asString(entry.error, "")
  };
}

function normalizeHistory(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((entry) => normalizeHistoryEntry(entry))
    .filter(Boolean)
    .slice(0, 50);
}

function normalizeSettings(input) {
  return {
    ...defaultSettings,
    topic: asString(input?.topic, defaultSettings.topic),
    patientName: asString(input?.patientName, defaultSettings.patientName),
    caretakerPhone: asString(input?.caretakerPhone, defaultSettings.caretakerPhone),
    escalationPhone: asString(input?.escalationPhone, defaultSettings.escalationPhone),
    ntfyAccessToken: asString(input?.ntfyAccessToken, defaultSettings.ntfyAccessToken),
    phoneCallEscalation: asBoolean(input?.phoneCallEscalation, defaultSettings.phoneCallEscalation),
    repeatAlarm: asBoolean(input?.repeatAlarm, defaultSettings.repeatAlarm),
    maxPriority: asBoolean(input?.maxPriority, defaultSettings.maxPriority),
    ringingMode: asBoolean(input?.ringingMode, defaultSettings.ringingMode),
    localAlarmSound: asBoolean(input?.localAlarmSound, defaultSettings.localAlarmSound),
    connectionVerified: asBoolean(input?.connectionVerified, defaultSettings.connectionVerified),
    preferredSound: asString(input?.preferredSound, defaultSettings.preferredSound),
    createdAt: typeof input?.createdAt === "string" ? input.createdAt : null,
    updatedAt: typeof input?.updatedAt === "string" ? input.updatedAt : null
  };
}

function safeStorageGet(key, fallback) {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function safeStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures (private mode/quota) and keep app functional.
  }
}

function safeStorageRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures and keep app functional.
  }
}

export function useSettings() {
  const [settings, setSettings] = useState(() => {
    if (typeof window === "undefined") {
      return defaultSettings;
    }

    const stored = safeParse(safeStorageGet(SETTINGS_KEY, null), {});
    return normalizeSettings(stored);
  });

  const [history, setHistory] = useState(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const stored = safeParse(safeStorageGet(HISTORY_KEY, null), []);
    return normalizeHistory(stored);
  });

  useEffect(() => {
    safeStorageSet(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    safeStorageSet(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const hasCompletedSetup = useMemo(() => {
    return Boolean(asString(settings.topic).trim() && asString(settings.patientName).trim());
  }, [settings.patientName, settings.topic]);

  const updateSettings = useCallback((patch) => {
    setSettings((prev) => {
      const resolvedPatch = typeof patch === "function" ? patch(prev) : patch;
      return normalizeSettings({
        ...prev,
        ...resolvedPatch,
        updatedAt: new Date().toISOString()
      });
    });
  }, []);

  const saveSetup = useCallback((setupValues) => {
    setSettings((prev) =>
      normalizeSettings({
        ...prev,
        ...setupValues,
        createdAt: prev.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    );
  }, []);

  const addHistoryEntry = useCallback((entry) => {
    const normalized = normalizeHistoryEntry(entry);
    if (!normalized) {
      return;
    }

    setHistory((prev) => [normalized, ...normalizeHistory(prev)].slice(0, 50));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const resetAllData = useCallback(() => {
    setSettings(defaultSettings);
    setHistory([]);
    safeStorageRemove(SETTINGS_KEY);
    safeStorageRemove(HISTORY_KEY);
  }, []);

  return {
    settings,
    history,
    hasCompletedSetup,
    updateSettings,
    saveSetup,
    addHistoryEntry,
    clearHistory,
    resetAllData
  };
}
