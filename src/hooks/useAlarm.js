import { useCallback, useEffect, useRef, useState } from "react";

const ALERT_TYPES = ["bed_exit", "fall", "inactivity"];
const DEFAULT_REPEAT_MS = 30000;
const RINGING_MODE_REPEAT_MS = 10000;

export const ALARM_PRESETS = {
  bed_exit: {
    label: "Bed Exit",
    title: "BED EXIT DETECTED",
    priority: "urgent",
    tags: "rotating_light,bed",
    body: (name) => `${name} has left the bed. Please check immediately.`
  },
  fall: {
    label: "Fall Detected",
    title: "FALL DETECTED - EMERGENCY",
    priority: "max",
    tags: "warning,ambulance",
    body: (name) => `Emergency: ${name} may have fallen. Respond now.`
  },
  inactivity: {
    label: "Inactivity Alert",
    title: "NO MOVEMENT DETECTED",
    priority: "high",
    tags: "zzz",
    body: (name) => `${name} has not moved for an extended period.`
  },
  all_clear: {
    label: "All Clear",
    title: "ALL CLEAR",
    priority: "default",
    tags: "green_heart",
    body: (name) => `${name} is safe and back in bed.`
  },
  test: {
    label: "Test Signal",
    title: "TEST - ElderGuard",
    priority: "low",
    tags: "white_check_mark",
    body: (name) => `System test for ${name}. Everything working OK.`
  }
};

const TRIGGER_MAP = {
  bed_exit: "bed_exit",
  "bed-exit": "bed_exit",
  fall: "fall",
  fall_detected: "fall",
  inactivity: "inactivity",
  all_clear: "all_clear",
  clear: "all_clear",
  test: "test"
};

export function useAlarm({ settings, addHistoryEntry, onToast }) {
  const [isSending, setIsSending] = useState(false);
  const [alertActive, setAlertActive] = useState(false);
  const [repeatActive, setRepeatActive] = useState(false);
  const [lastActivityAt, setLastActivityAt] = useState(null);
  const [lastError, setLastError] = useState("");

  const repeatTimerRef = useRef(null);
  const repeatTypeRef = useRef(null);

  const stopRepeat = useCallback(() => {
    if (repeatTimerRef.current) {
      clearInterval(repeatTimerRef.current);
      repeatTimerRef.current = null;
      repeatTypeRef.current = null;
    }
    setRepeatActive(false);
  }, []);

  useEffect(() => {
    return () => stopRepeat();
  }, [stopRepeat]);

  const sendPreset = useCallback(
    async (type, options = {}) => {
      const preset = ALARM_PRESETS[type];

      if (!preset) {
        return { ok: false, reason: "Unknown alarm type" };
      }

      const topic = settings.topic?.trim();
      if (!topic) {
        const message = "Set your ntfy topic before sending alarms.";
        setLastError(message);
        onToast?.({ type: "error", message });
        return { ok: false, reason: message };
      }

      const patientName = settings.patientName?.trim() || "Patient";
      const isCriticalAlert = ALERT_TYPES.includes(type);
      const forceMaxPriority = isCriticalAlert && (settings.maxPriority || settings.ringingMode);
      const priority = forceMaxPriority
        ? "max"
        : preset.priority;

      const title = options.isRepeat ? `${preset.title} (REPEAT)` : preset.title;
      const body = preset.body(patientName);
      const endpoint = `https://ntfy.sh/${encodeURIComponent(topic)}`;
      const tags = forceMaxPriority
        ? `${preset.tags},alarm_clock`
        : preset.tags;

      setIsSending(true);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Title: title,
            Priority: priority,
            "X-Priority": priority,
            Tags: tags,
            Click: window.location.origin,
            "Content-Type": "text/plain"
          },
          body
        });

        if (!response.ok) {
          throw new Error(`ntfy returned status ${response.status}`);
        }

        const timestamp = new Date().toISOString();
        const entry = {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          timestamp,
          type,
          title,
          body,
          priority,
          tags,
          status: "delivered"
        };

        addHistoryEntry?.(entry);
        setLastActivityAt(timestamp);
        setLastError("");

        if (!options.silentToast) {
          const baseMessage = `${preset.label} sent successfully`;
          const lowPriorityHint =
            type === "test"
              ? " (test uses low priority and may be silent on phone)"
              : "";
          const ringingHint =
            forceMaxPriority ? " (ringing mode active)" : "";
          onToast?.({
            type: "success",
            message: `${baseMessage}${lowPriorityHint}${ringingHint}`
          });
        }

        return { ok: true, entry };
      } catch (error) {
        const timestamp = new Date().toISOString();
        const message = error instanceof Error ? error.message : "Unknown send failure";
        const entry = {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          timestamp,
          type,
          title,
          body,
          priority,
          tags,
          status: "failed",
          error: message
        };

        addHistoryEntry?.(entry);
        setLastError(message);
        onToast?.({
          type: "error",
          message: `Failed to send ${preset.label.toLowerCase()}`
        });

        return { ok: false, error: message };
      } finally {
        setIsSending(false);
      }
    },
    [
      addHistoryEntry,
      onToast,
      settings.maxPriority,
      settings.patientName,
      settings.ringingMode,
      settings.topic
    ]
  );

  const startRepeat = useCallback(
    (type, intervalMs = DEFAULT_REPEAT_MS) => {
      stopRepeat();

      repeatTypeRef.current = type;
      repeatTimerRef.current = window.setInterval(() => {
        sendPreset(type, { isRepeat: true, silentToast: true });
      }, intervalMs);
      setRepeatActive(true);
    },
    [sendPreset, stopRepeat]
  );

  const sendAlarm = useCallback(
    async (type) => {
      const result = await sendPreset(type);

      if (!result.ok) {
        return result;
      }

      if (ALERT_TYPES.includes(type)) {
        setAlertActive(true);
        if (settings.repeatAlarm || settings.ringingMode) {
          const repeatMs = settings.ringingMode
            ? RINGING_MODE_REPEAT_MS
            : DEFAULT_REPEAT_MS;
          startRepeat(type, repeatMs);
        }
      }

      if (type === "all_clear") {
        stopRepeat();
        setAlertActive(false);
      }

      return result;
    },
    [sendPreset, settings.repeatAlarm, settings.ringingMode, startRepeat, stopRepeat]
  );

  const acknowledgeAlert = useCallback(() => {
    stopRepeat();
    setAlertActive(false);
    onToast?.({ type: "info", message: "Alarm acknowledged. Repeat stopped." });
  }, [onToast, stopRepeat]);

  const triggerFromQuery = useCallback(
    async (triggerValue) => {
      const normalized = (triggerValue || "").toLowerCase();
      const mappedType = TRIGGER_MAP[normalized];

      if (!mappedType) {
        onToast?.({
          type: "warning",
          message: `Unsupported trigger: ${triggerValue}`
        });
        return { ok: false, reason: "Unsupported trigger" };
      }

      return sendAlarm(mappedType);
    },
    [onToast, sendAlarm]
  );

  return {
    isSending,
    alertActive,
    repeatActive,
    lastActivityAt,
    lastError,
    sendAlarm,
    triggerFromQuery,
    stopRepeat,
    acknowledgeAlert
  };
}
