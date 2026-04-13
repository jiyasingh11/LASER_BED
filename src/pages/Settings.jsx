import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function playTonePattern(patternName) {
  const AudioContextRef = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextRef) {
    return;
  }

  const patterns = {
    standard: [
      { frequency: 660, duration: 0.16 },
      { frequency: 880, duration: 0.16 }
    ],
    gentle: [
      { frequency: 420, duration: 0.2 },
      { frequency: 520, duration: 0.2 }
    ],
    emergency: [
      { frequency: 920, duration: 0.12 },
      { frequency: 920, duration: 0.12 },
      { frequency: 720, duration: 0.2 }
    ]
  };

  const sequence = patterns[patternName] || patterns.standard;
  const context = new AudioContextRef();
  let current = context.currentTime;

  sequence.forEach((step) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = step.frequency;

    gain.gain.setValueAtTime(0.0001, current);
    gain.gain.exponentialRampToValueAtTime(0.18, current + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, current + step.duration);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(current);
    oscillator.stop(current + step.duration);

    current += step.duration + 0.04;
  });

  window.setTimeout(() => {
    context.close().catch(() => {});
  }, 1200);
}

export default function Settings({
  settings,
  updateSettings,
  history,
  clearHistory,
  resetAllData,
  onToast
}) {
  const navigate = useNavigate();

  const [topic, setTopic] = useState(settings.topic || "");
  const [patientName, setPatientName] = useState(settings.patientName || "");
  const [caretakerPhone, setCaretakerPhone] = useState(settings.caretakerPhone || "");
  const [sound, setSound] = useState(settings.preferredSound || "standard");

  const handleSave = (event) => {
    event.preventDefault();

    updateSettings({
      topic: topic.trim(),
      patientName: patientName.trim(),
      caretakerPhone: caretakerPhone.trim(),
      preferredSound: sound
    });

    onToast?.({ type: "success", message: "Settings updated." });
  };

  const handleClearHistory = () => {
    clearHistory();
    onToast?.({ type: "info", message: "Alarm history cleared." });
  };

  const handleReset = () => {
    const shouldReset = window.confirm("Reset all settings and history? This cannot be undone.");
    if (!shouldReset) {
      return;
    }

    resetAllData();
    onToast?.({ type: "warning", message: "All ElderGuard data reset." });
    navigate("/setup", { replace: true });
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="panel mb-5 flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
        <div>
          <h1 className="brand-font text-2xl font-bold text-elder-text sm:text-3xl">Settings</h1>
          <p className="mt-1 text-sm text-elder-muted">Edit patient and notification preferences</p>
        </div>

        <Link
          to="/dashboard"
          className="rounded-xl border border-elder-line bg-elder-panel px-4 py-2 text-sm font-semibold text-elder-text transition hover:border-red-400"
        >
          Back to Dashboard
        </Link>
      </header>

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="panel p-6">
          <form onSubmit={handleSave} className="space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-elder-text">ntfy Topic</span>
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className="mt-2 w-full rounded-xl border border-elder-line bg-elder-panelSoft px-4 py-3 text-elder-text outline-none transition focus:border-red-500"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-elder-text">Patient Name</span>
              <input
                value={patientName}
                onChange={(event) => setPatientName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-elder-line bg-elder-panelSoft px-4 py-3 text-elder-text outline-none transition focus:border-red-500"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-elder-text">Caretaker Phone</span>
              <input
                value={caretakerPhone}
                onChange={(event) => setCaretakerPhone(event.target.value)}
                className="mt-2 w-full rounded-xl border border-elder-line bg-elder-panelSoft px-4 py-3 text-elder-text outline-none transition focus:border-red-500"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-elder-text">Notification Sound Preview</span>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value={sound}
                  onChange={(event) => setSound(event.target.value)}
                  className="rounded-xl border border-elder-line bg-elder-panelSoft px-3 py-2 text-sm text-elder-text"
                >
                  <option value="standard">Standard</option>
                  <option value="gentle">Gentle</option>
                  <option value="emergency">Emergency</option>
                </select>
                <button
                  type="button"
                  onClick={() => playTonePattern(sound)}
                  className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-100"
                >
                  Play Preview
                </button>
              </div>
            </label>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-100"
              >
                Clear History
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl border border-red-500/40 bg-red-600/10 px-4 py-2.5 text-sm font-semibold text-red-100"
              >
                Reset All Data
              </button>
            </div>
          </form>
        </section>

        <section className="panel-soft p-6">
          <div className="flex items-center justify-between">
            <h2 className="brand-font text-xl font-bold text-elder-text">Alarm History</h2>
            <span className="rounded-full border border-elder-line px-3 py-1 text-xs uppercase tracking-[0.14em] text-elder-muted">
              {history.length} entries
            </span>
          </div>

          {history.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-elder-line p-4 text-sm text-elder-muted">
              No alarm records yet.
            </p>
          ) : (
            <div className="mt-4 max-h-[540px] space-y-2 overflow-auto pr-1">
              {history.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-xl border border-elder-line/80 bg-black/20 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-elder-text">
                      {entry.type.replaceAll("_", " ").toUpperCase()}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs uppercase tracking-[0.1em] ${
                        entry.status === "delivered"
                          ? "bg-emerald-500/20 text-emerald-200"
                          : "bg-red-500/20 text-red-200"
                      }`}
                    >
                      {entry.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-elder-muted">{new Date(entry.timestamp).toLocaleString()}</p>
                  <p className="mt-1 text-xs text-elder-muted">Priority: {entry.priority}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
