function statusStyles(status) {
  if (status === "In Bed") {
    return "border-emerald-500/40 bg-emerald-600/10 text-emerald-100 safe-ring";
  }

  if (status === "Out of Bed") {
    return "border-amber-500/40 bg-amber-500/10 text-amber-100";
  }

  return "border-red-500/40 bg-red-600/10 text-red-100 danger-ring";
}

export default function StatusCard({
  patientName,
  status,
  lastActivityAt,
  alertActive,
  isOnline,
  lastError
}) {
  const readableTime = lastActivityAt
    ? new Date(lastActivityAt).toLocaleString()
    : "No signal sent yet";

  return (
    <section className={`panel p-5 md:p-6 ${statusStyles(status)}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-elder-muted">Patient</p>
          <h2 className="mt-1 text-xl font-bold md:text-2xl">{patientName || "Not configured"}</h2>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.1em]">
          <span className="relative flex h-3 w-3">
            {alertActive && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />}
            <span
              className={`relative inline-flex h-3 w-3 rounded-full ${
                isOnline ? "bg-emerald-400" : "bg-red-500"
              }`}
            />
          </span>
          <span>{isOnline ? "Online" : "Offline"}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-elder-muted">Current status</p>
          <p className="mt-2 text-xl font-bold">{status}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-elder-muted">Last activity</p>
          <p className="mt-2 text-sm font-medium text-elder-text">{readableTime}</p>
        </div>
      </div>

      {!isOnline && (
        <p className="mt-4 rounded-xl border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Internet appears offline. New alarms cannot be sent until connection returns.
        </p>
      )}

      {lastError && (
        <p className="mt-3 rounded-xl border border-red-500/40 bg-red-600/10 px-3 py-2 text-sm text-red-100">
          Last error: {lastError}
        </p>
      )}
    </section>
  );
}
