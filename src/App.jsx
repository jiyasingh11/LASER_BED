import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [pendingTrigger, setPendingTrigger] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("trigger");
  });

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
      lastError
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
      lastError
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
