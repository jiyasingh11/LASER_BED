const TYPE_LABEL = {
  bed_exit: "Bed Exit",
  fall: "Fall Detected",
  inactivity: "Inactivity Alert",
  all_clear: "All Clear",
  test: "Test Signal"
};

export default function ActivityLog({ entries }) {
  return (
    <section className="panel-soft p-5 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="brand-font text-lg font-bold text-elder-text">Activity Log</h3>
        <span className="rounded-full border border-elder-line bg-elder-panel px-3 py-1 text-xs uppercase tracking-[0.14em] text-elder-muted">
          Last 10
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-elder-line p-4 text-sm text-elder-muted">
          No activity yet. Trigger a test signal to confirm notifications are working.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {entries.map((entry) => {
            const isSuccess = entry.status === "delivered";
            const safeType = typeof entry.type === "string" ? entry.type : "test";
            return (
              <li
                key={entry.id}
                className="rounded-xl border border-elder-line/80 bg-black/25 px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-elder-text">
                    {TYPE_LABEL[safeType] || safeType.replaceAll("_", " ")}
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.1em] ${
                      isSuccess
                        ? "bg-emerald-500/20 text-emerald-200"
                        : "bg-red-500/20 text-red-200"
                    }`}
                  >
                    {entry.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-elder-muted">{new Date(entry.timestamp || Date.now()).toLocaleString()}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
