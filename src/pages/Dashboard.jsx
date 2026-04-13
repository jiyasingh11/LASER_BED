import { useMemo } from "react";
import { Link } from "react-router-dom";
import AlarmButton from "../components/AlarmButton";
import StatusCard from "../components/StatusCard";
import ActivityLog from "../components/ActivityLog";

const STATUS_BY_TYPE = {
  bed_exit: "Out of Bed",
  fall: "Alert Active",
  inactivity: "Alert Active",
  all_clear: "In Bed"
};

export default function Dashboard({
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
}) {
  const latestDelivered = useMemo(
    () => history.find((item) => item.status === "delivered"),
    [history]
  );

  const currentStatus = latestDelivered
    ? STATUS_BY_TYPE[latestDelivered.type] || "In Bed"
    : "In Bed";

  const recentEntries = history.slice(0, 10);

  const triggerAlarm = async (type) => {
    await sendAlarm(type);
  };

  const quickButtons = [
    {
      type: "bed_exit",
      label: "Bed Exit",
      hint: settings.ringingMode || settings.maxPriority ? "max" : "urgent",
      className: "border-red-500/40 bg-red-600/10 text-red-100"
    },
    {
      type: "fall",
      label: "Fall Detected",
      hint: "max",
      className: "border-red-500/60 bg-red-700/20 text-red-100"
    },
    {
      type: "inactivity",
      label: "Inactivity Alert",
      hint: settings.ringingMode || settings.maxPriority ? "max" : "high",
      className: "border-amber-500/40 bg-amber-500/10 text-amber-100"
    },
    {
      type: "all_clear",
      label: "All Clear",
      hint: "default",
      className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
    }
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="panel mb-5 flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6">
        <div>
          <h1 className="brand-font text-2xl font-bold text-elder-text sm:text-3xl">ElderGuard</h1>
          <p className="mt-1 text-xs text-elder-muted sm:text-sm">Live monitoring dashboard</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-elder-text">
            <span className="relative flex h-3 w-3">
              {alertActive && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />}
              <span
                className={`relative inline-flex h-3 w-3 rounded-full ${
                  isOnline && settings.connectionVerified ? "bg-emerald-400" : "bg-red-500"
                }`}
              />
            </span>
            <span>
              {isOnline && settings.connectionVerified
                ? "Connected"
                : isOnline
                  ? "Unverified"
                  : "Offline"}
            </span>
          </div>

          <Link
            to="/settings"
            className="rounded-xl border border-elder-line bg-elder-panel px-4 py-2 text-sm font-semibold text-elder-text transition hover:border-red-400"
          >
            Settings
          </Link>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <StatusCard
            patientName={settings.patientName}
            status={currentStatus}
            lastActivityAt={lastActivityAt}
            alertActive={alertActive}
            isOnline={isOnline}
            lastError={lastError}
          />

          <section className="panel-soft p-5 md:p-6">
            <h2 className="brand-font text-lg font-bold text-elder-text">Quick Alarm Types</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {quickButtons.map((button) => (
                <button
                  key={button.type}
                  type="button"
                  onClick={() => triggerAlarm(button.type)}
                  disabled={isSending || !isOnline}
                  className={`rounded-xl border px-4 py-3 text-left transition hover:brightness-110 disabled:opacity-50 ${button.className}`}
                >
                  <p className="text-base font-semibold">{button.label}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em]">Priority: {button.hint}</p>
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => triggerAlarm("test")}
                disabled={isSending || !isOnline}
                className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2.5 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/20 disabled:opacity-50"
              >
                Test Signal
              </button>

              {alertActive && (
                <button
                  type="button"
                  onClick={acknowledgeAlert}
                  className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20"
                >
                  I&apos;m Aware
                </button>
              )}

              {settings.localAlarmSound && (
                <button
                  type="button"
                  onClick={enableLocalAlarmAudio}
                  className="rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 px-4 py-2.5 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-500/20"
                >
                  Arm Ringtone Audio
                </button>
              )}

              {alertActive && localSirenBlocked && (
                <button
                  type="button"
                  onClick={enableLocalAlarmAudio}
                  className="rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 px-4 py-2.5 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-500/20"
                >
                  Enable Alarm Audio
                </button>
              )}
            </div>

            <p className="mt-3 text-xs text-elder-muted">
              Test Signal uses low priority and may be silent on some phones. Use Bed Exit/Fall to validate audible alarm behavior.
            </p>
          </section>

          <ActivityLog entries={recentEntries} />
        </div>

        <div className="space-y-5">
          <section className="panel p-6">
            <AlarmButton
              onClick={() => triggerAlarm("bed_exit")}
              disabled={isSending || !isOnline}
              active={!isSending && isOnline}
            />

            <p className="mt-4 text-center text-sm text-elder-muted">
              Large emergency trigger for instant Bed Exit alert.
            </p>
          </section>

          <section className="panel-soft p-5">
            <h3 className="brand-font text-lg font-bold text-elder-text">Control Toggles</h3>

            <div className="mt-4 space-y-3">
              <label className="flex items-center justify-between rounded-xl border border-elder-line bg-black/20 px-3 py-3">
                <span>
                  <p className="font-semibold text-elder-text">Ringing Alarm Mode</p>
                  <p className="text-xs text-elder-muted">Forces max priority for stronger phone alert sound channels.</p>
                </span>
                <input
                  type="checkbox"
                  checked={settings.ringingMode}
                  onChange={(event) => updateSettings({ ringingMode: event.target.checked })}
                  className="h-5 w-5 accent-red-500"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-elder-line bg-black/20 px-3 py-3">
                <span>
                  <p className="font-semibold text-elder-text">Max Priority</p>
                  <p className="text-xs text-elder-muted">Override alert priority to max for critical alarms.</p>
                </span>
                <input
                  type="checkbox"
                  checked={settings.maxPriority}
                  onChange={(event) => updateSettings({ maxPriority: event.target.checked })}
                  className="h-5 w-5 accent-red-500"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-elder-line bg-black/20 px-3 py-3">
                <span>
                  <p className="font-semibold text-elder-text">Repeat Alarm</p>
                  <p className="text-xs text-elder-muted">Resend active alarm every 30 seconds until acknowledged.</p>
                </span>
                <input
                  type="checkbox"
                  checked={settings.repeatAlarm}
                  onChange={(event) => updateSettings({ repeatAlarm: event.target.checked })}
                  className="h-5 w-5 accent-red-500"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-elder-line bg-black/20 px-3 py-3">
                <span>
                  <p className="font-semibold text-elder-text">Phone Call Escalation</p>
                  <p className="text-xs text-elder-muted">Use ntfy call for critical alerts to force real ringtone behavior.</p>
                </span>
                <input
                  type="checkbox"
                  checked={settings.phoneCallEscalation || false}
                  onChange={(event) => updateSettings({ phoneCallEscalation: event.target.checked })}
                  className="h-5 w-5 accent-red-500"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-elder-line bg-black/20 px-3 py-3">
                <span>
                  <p className="font-semibold text-elder-text">Local Continuous Siren</p>
                  <p className="text-xs text-elder-muted">Play continuous in-app alarm tone until I&apos;m Aware or All Clear.</p>
                </span>
                <input
                  type="checkbox"
                  checked={settings.localAlarmSound ?? true}
                  onChange={(event) => updateSettings({ localAlarmSound: event.target.checked })}
                  className="h-5 w-5 accent-red-500"
                />
              </label>
            </div>

            {repeatActive && (
              <p className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                Repeat alarm is active. Alerts resend every 30 seconds until acknowledged.
              </p>
            )}

            {settings.phoneCallEscalation && (
              <p className="mt-3 rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
                Phone call escalation enabled. Critical alerts will attempt call-based ringtone.
              </p>
            )}

            {settings.localAlarmSound && (
              <p className="mt-3 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 px-3 py-2 text-sm text-fuchsia-100">
                Local continuous siren enabled. Tap Arm Ringtone Audio once after opening app.
              </p>
            )}
          </section>

          <section className="panel-soft p-5">
            <h3 className="brand-font text-lg font-bold text-elder-text">Simulate Sensor Trigger</h3>
            <p className="mt-2 text-sm text-elder-muted">
              Use these controls to mimic Raspberry Pi laser sensor events.
            </p>
            <p className="mt-1 text-xs text-elder-muted">
              Duplicate bed_exit/fall/inactivity alerts are suppressed until all_clear is sent.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => triggerAlarm("bed_exit")}
                className="rounded-lg border border-red-500/40 bg-red-600/10 px-3 py-2 text-sm text-red-100"
              >
                bed_exit
              </button>
              <button
                type="button"
                onClick={() => triggerAlarm("fall")}
                className="rounded-lg border border-red-500/40 bg-red-600/10 px-3 py-2 text-sm text-red-100"
              >
                fall
              </button>
              <button
                type="button"
                onClick={() => triggerAlarm("all_clear")}
                className="rounded-lg border border-emerald-500/40 bg-emerald-600/10 px-3 py-2 text-sm text-emerald-100"
              >
                all_clear
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
