import { useCallback, useEffect, useMemo, useState } from "react";

const SETTINGS_KEY = "elderguard.settings.v1";
const HISTORY_KEY = "elderguard.history.v1";

const defaultSettings = {
  topic: "",
  patientName: "",
  caretakerPhone: "",
  repeatAlarm: false,
  maxPriority: false,
  ringingMode: true,
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

export function useSettings() {
  const [settings, setSettings] = useState(() => {
    if (typeof window === "undefined") {
      return defaultSettings;
    }

    const stored = safeParse(window.localStorage.getItem(SETTINGS_KEY), {});
    return {
      ...defaultSettings,
      ...stored
    };
  });

  const [history, setHistory] = useState(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const stored = safeParse(window.localStorage.getItem(HISTORY_KEY), []);
    return Array.isArray(stored) ? stored.slice(0, 50) : [];
  });

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const hasCompletedSetup = useMemo(() => {
    return Boolean(settings.topic.trim() && settings.patientName.trim());
  }, [settings.patientName, settings.topic]);

  const updateSettings = useCallback((patch) => {
    setSettings((prev) => {
      const resolvedPatch = typeof patch === "function" ? patch(prev) : patch;
      return {
        ...prev,
        ...resolvedPatch,
        updatedAt: new Date().toISOString()
      };
    });
  }, []);

  const saveSetup = useCallback((setupValues) => {
    setSettings((prev) => ({
      ...prev,
      ...setupValues,
      createdAt: prev.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }, []);

  const addHistoryEntry = useCallback((entry) => {
    setHistory((prev) => [entry, ...prev].slice(0, 50));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const resetAllData = useCallback(() => {
    setSettings(defaultSettings);
    setHistory([]);
    window.localStorage.removeItem(SETTINGS_KEY);
    window.localStorage.removeItem(HISTORY_KEY);
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
