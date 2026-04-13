import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Setup from "./pages/Setup";
import Settings from "./pages/Settings";
import { useSettings } from "./hooks/useSettings";
import { useAlarm } from "./hooks/useAlarm";

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

  const audioContextRef = useRef(null);
  const sirenTimerRef = useRef(null);
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

  const playSirenBurst = useCallback((ctx) => {
    const startAt = ctx.currentTime;
    const duration = 0.7;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(760, startAt);
    oscillator.frequency.linearRampToValueAtTime(1100, startAt + duration / 2);
    oscillator.frequency.linearRampToValueAtTime(760, startAt + duration);

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.22, startAt + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(startAt);
    oscillator.stop(startAt + duration);
  }, []);

  const ensureAudioContext = useCallback(async () => {
    const AudioContextRef = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextRef) {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextRef();
    }

    const ctx = audioContextRef.current;

    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        return null;
      }
    }

    return ctx.state === "running" ? ctx : null;
  }, []);

  const armAlarmAudio = useCallback(async () => {
    const ctx = await ensureAudioContext();
    if (!ctx) {
      return false;
    }

    audioArmedRef.current = true;
    setLocalSirenBlocked(false);
    warnedRef.current = false;
    return true;
  }, [ensureAudioContext]);

  const stopLocalSiren = useCallback(() => {
    if (sirenTimerRef.current) {
      clearInterval(sirenTimerRef.current);
      sirenTimerRef.current = null;
    }
  }, []);

  const startLocalSiren = useCallback(async () => {
    if (sirenTimerRef.current) {
      return true;
    }

    if (!audioArmedRef.current) {
      return false;
    }

    const ctx = await ensureAudioContext();
    if (!ctx) {
      return false;
    }

    playSirenBurst(ctx);
    sirenTimerRef.current = window.setInterval(() => {
      playSirenBurst(ctx);
    }, 900);

    return true;
  }, [ensureAudioContext, playSirenBurst]);

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
      const ctx = audioContextRef.current;
      if (ctx) {
        ctx.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [audioContextRef, stopLocalSiren]);

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
