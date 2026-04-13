import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Setup from "./pages/Setup";
import Settings from "./pages/Settings";
import { useSettings } from "./hooks/useSettings";
import { useAlarm } from "./hooks/useAlarm";

let cachedAlarmToneDataUrl = null;

function getAlarmToneDataUrl() {
  if (cachedAlarmToneDataUrl) {
    return cachedAlarmToneDataUrl;
  }

  const sampleRate = 44100;
  const durationSeconds = 2.4;
  const sampleCount = Math.floor(sampleRate * durationSeconds);
  const pcm = new Int16Array(sampleCount);

  let phasePrimary = 0;
  let phaseSecondary = 0;

  const ringEnvelope = (timeInCycle) => {
    if (timeInCycle < 0.36) {
      const attack = Math.min(1, timeInCycle / 0.02);
      const release = Math.min(1, (0.36 - timeInCycle) / 0.08);
      return attack * release;
    }

    if (timeInCycle >= 0.52 && timeInCycle < 0.9) {
      const t = timeInCycle - 0.52;
      const attack = Math.min(1, t / 0.02);
      const release = Math.min(1, (0.38 - t) / 0.1);
      return attack * release;
    }

    return 0;
  };

  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / sampleRate;
    const cycle = t % 1.2;
    const envelope = ringEnvelope(cycle);

    const freqPrimary = 840;
    const freqSecondary = 1260;
    phasePrimary += (2 * Math.PI * freqPrimary) / sampleRate;
    phaseSecondary += (2 * Math.PI * freqSecondary) / sampleRate;

    const carrier =
      Math.sin(phasePrimary) * 0.72 +
      Math.sin(phaseSecondary) * 0.23 +
      Math.sin(phasePrimary * 0.5) * 0.08;

    const sample = carrier * envelope;
    pcm[i] = Math.max(-1, Math.min(1, sample)) * 32767;
  }

  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(buffer);

  const writeAscii = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, pcm.length * 2, true);

  let offset = 44;
  for (let i = 0; i < pcm.length; i += 1) {
    view.setInt16(offset, pcm[i], true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  cachedAlarmToneDataUrl = `data:audio/wav;base64,${btoa(binary)}`;
  return cachedAlarmToneDataUrl;
}

function ToastStack({ toasts, dismissToast }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(92vw,24rem)] flex-col gap-2">
      {toasts.map((toast) => {
        const toneClass =
          toast.type === "error"
            ? "border-red-500/50 bg-red-600/90"
            : toast.type === "success"
              ? "border-emerald-500/50 bg-emerald-700/85"
              : toast.type === "warning"
                ? "border-amber-500/50 bg-amber-700/85"
                : "border-slate-500/50 bg-slate-700/90";

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm text-white shadow-lg ${toneClass}`}
            role="status"
          >
            <div className="flex items-center justify-between gap-3">
              <span>{toast.message}</span>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="rounded-md border border-white/25 px-2 py-1 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();

  const {
    settings,
    history,
    hasCompletedSetup,
    updateSettings,
    saveSetup,
    addHistoryEntry,
    clearHistory,
    resetAllData
  } = useSettings();

  const [toasts, setToasts] = useState([]);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [localSirenBlocked, setLocalSirenBlocked] = useState(false);
  const [pendingTrigger, setPendingTrigger] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("trigger");
  });

  const alarmAudioRef = useRef(null);
  const warnedRef = useRef(false);
  const audioArmedRef = useRef(false);

  const addToast = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const payload = {
      id,
      type: toast.type || "info",
      message: toast.message || "Notification"
    };

    setToasts((prev) => [...prev, payload]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const {
    isSending,
    alertActive,
    repeatActive,
    lastActivityAt,
    lastError,
    sendAlarm,
    triggerFromQuery,
    acknowledgeAlert
  } = useAlarm({
    settings,
    addHistoryEntry,
    onToast: addToast
  });

  const getOrCreateAlarmAudio = useCallback(() => {
    if (!alarmAudioRef.current) {
      const audio = new Audio(getAlarmToneDataUrl());
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = 1;
      alarmAudioRef.current = audio;
    }

    return alarmAudioRef.current;
  }, []);

  const armAlarmAudio = useCallback(async () => {
    try {
      const audio = getOrCreateAlarmAudio();
      audio.muted = true;
      audio.currentTime = 0;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;

      audioArmedRef.current = true;
      setLocalSirenBlocked(false);
      warnedRef.current = false;
      return true;
    } catch {
      return false;
    }
  }, [getOrCreateAlarmAudio]);

  const stopLocalSiren = useCallback(() => {
    const audio = alarmAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

  const startLocalSiren = useCallback(async () => {
    if (!audioArmedRef.current) {
      return false;
    }

    try {
      const audio = getOrCreateAlarmAudio();
      audio.muted = false;
      audio.volume = 1;
      await audio.play();
      return true;
    } catch {
      return false;
    }
  }, [getOrCreateAlarmAudio]);

  const enableLocalAlarmAudio = useCallback(async () => {
    const armed = await armAlarmAudio();
    if (!armed) {
      addToast({ type: "warning", message: "Browser blocked alarm audio. Tap once on page and try again." });
      return;
    }

    const ok = alertActive ? await startLocalSiren() : true;
    if (ok) {
      setLocalSirenBlocked(false);
      warnedRef.current = false;
      addToast({ type: "success", message: "Alarm audio armed for this device." });
    } else {
      addToast({ type: "warning", message: "Browser blocked alarm audio. Tap once on page and try again." });
    }
  }, [addToast, alertActive, armAlarmAudio, startLocalSiren]);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      addToast({ type: "success", message: "Internet connection restored." });
    };

    const goOffline = () => {
      setIsOnline(false);
      addToast({ type: "warning", message: "You are offline. Alarms cannot be sent." });
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [addToast]);

  useEffect(() => {
    const armFromGesture = () => {
      armAlarmAudio();
    };

    window.addEventListener("pointerdown", armFromGesture);
    window.addEventListener("keydown", armFromGesture);

    return () => {
      window.removeEventListener("pointerdown", armFromGesture);
      window.removeEventListener("keydown", armFromGesture);
    };
  }, [armAlarmAudio]);

  useEffect(() => {
    let mounted = true;

    const syncSiren = async () => {
      if (alertActive && settings.localAlarmSound) {
        const ok = await startLocalSiren();
        if (!mounted) {
          return;
        }

        if (!ok) {
          setLocalSirenBlocked(true);
          if (!warnedRef.current) {
            warnedRef.current = true;
            addToast({
              type: "warning",
              message: "Alarm sound blocked by browser. Tap Enable Alarm Audio."
            });
          }
          return;
        }

        warnedRef.current = false;
        setLocalSirenBlocked(false);
      } else {
        stopLocalSiren();
        warnedRef.current = false;
        setLocalSirenBlocked(false);
      }
    };

    syncSiren();

    return () => {
      mounted = false;
    };
  }, [addToast, alertActive, settings.localAlarmSound, startLocalSiren, stopLocalSiren, warnedRef]);

  useEffect(() => {
    return () => {
      stopLocalSiren();
      if (alarmAudioRef.current) {
        alarmAudioRef.current.src = "";
        alarmAudioRef.current = null;
      }
    };
  }, [stopLocalSiren]);

  useEffect(() => {
    if (!pendingTrigger || !hasCompletedSetup) {
      return;
    }

    const executeTrigger = async () => {
      navigate("/dashboard", { replace: true });
      await triggerFromQuery(pendingTrigger);
      setPendingTrigger(null);

      const cleanedUrl = new URL(window.location.href);
      cleanedUrl.searchParams.delete("trigger");
      window.history.replaceState({}, "", cleanedUrl.toString());
    };

    executeTrigger();
  }, [hasCompletedSetup, navigate, pendingTrigger, triggerFromQuery]);

  const dashboardProps = useMemo(
    () => ({
      settings,
      history,
      updateSettings,
      sendAlarm,
      isSending,
      alertActive,
      repeatActive,
      acknowledgeAlert,
      lastActivityAt,
      isOnline,
      lastError,
      localSirenBlocked,
      enableLocalAlarmAudio
    }),
    [
      settings,
      history,
      updateSettings,
      sendAlarm,
      isSending,
      alertActive,
      repeatActive,
      acknowledgeAlert,
      lastActivityAt,
      isOnline,
      lastError,
      localSirenBlocked,
      enableLocalAlarmAudio
    ]
  );

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={<Navigate to={hasCompletedSetup ? "/dashboard" : "/setup"} replace />}
        />

        <Route
          path="/setup"
          element={
            <Setup
              settings={settings}
              saveSetup={saveSetup}
              onToast={addToast}
            />
          }
        />

        <Route
          path="/dashboard"
          element={hasCompletedSetup ? <Dashboard {...dashboardProps} /> : <Navigate to="/setup" replace />}
        />

        <Route
          path="/settings"
          element={
            hasCompletedSetup ? (
              <Settings
                settings={settings}
                updateSettings={updateSettings}
                history={history}
                clearHistory={clearHistory}
                resetAllData={resetAllData}
                onToast={addToast}
              />
            ) : (
              <Navigate to="/setup" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to={hasCompletedSetup ? "/dashboard" : "/setup"} replace />} />
      </Routes>

      <ToastStack toasts={toasts} dismissToast={dismissToast} />
    </>
  );
}
