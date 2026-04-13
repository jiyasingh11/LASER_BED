import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Setup({ settings, saveSetup, onToast }) {
  const navigate = useNavigate();

  const [topic, setTopic] = useState(settings.topic || "");
  const [patientName, setPatientName] = useState(settings.patientName || "");
  const [caretakerPhone, setCaretakerPhone] = useState(settings.caretakerPhone || "");
  const [escalationPhone, setEscalationPhone] = useState(settings.escalationPhone || "");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(Boolean(settings.connectionVerified));

  const canSave = useMemo(() => topic.trim() && patientName.trim(), [topic, patientName]);

  const verifyConnection = async () => {
    if (!topic.trim()) {
      onToast?.({ type: "warning", message: "Enter an ntfy topic before verification." });
      return;
    }

    setIsVerifying(true);

    try {
      const endpoint = `https://ntfy.sh/${encodeURIComponent(topic.trim())}`;
      const patient = patientName.trim() || "Patient";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Title: "SOUND CHECK - ElderGuard Setup",
          Priority: "high",
          "X-Priority": "high",
          Tags: "white_check_mark,speaker",
          Click: window.location.origin,
          "Content-Type": "text/plain"
        },
        body: `Setup verification alert for ${patient}. If this arrives silently, enable notification sound in the ntfy app for this topic.`
      });

      if (!response.ok) {
        throw new Error(`ntfy returned status ${response.status}`);
      }

      setIsVerified(true);
      onToast?.({
        type: "success",
        message: "Connection verified. If no sound played, update ntfy app notification channel settings."
      });
    } catch (error) {
      setIsVerified(false);
      onToast?.({ type: "error", message: "Verification failed. Re-check topic and internet." });
      console.error(error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!canSave) {
      return;
    }

    saveSetup({
      topic: topic.trim(),
      patientName: patientName.trim(),
      caretakerPhone: caretakerPhone.trim(),
      escalationPhone: escalationPhone.trim(),
      connectionVerified: isVerified
    });

    onToast?.({ type: "success", message: "Setup saved successfully." });
    navigate("/dashboard", { replace: true });
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <section className="panel p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600/20 text-xl text-red-300">EG</div>
          <div>
            <h1 className="brand-font text-3xl font-bold sm:text-4xl">ElderGuard</h1>
            <p className="mt-1 text-sm text-elder-muted">Patient bed-exit alarm monitoring setup</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="space-y-5 md:col-span-1">
            <label className="block">
              <span className="text-sm font-semibold text-elder-text">ntfy Topic Name</span>
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="elderguard-home-9821"
                className="mt-2 w-full rounded-xl border border-elder-line bg-elder-panelSoft px-4 py-3 text-elder-text outline-none transition focus:border-red-500"
                required
              />
              <span className="mt-1 block text-xs text-elder-muted">Use a private, random topic string.</span>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-elder-text">Patient Name</span>
              <input
                value={patientName}
                onChange={(event) => setPatientName(event.target.value)}
                placeholder="Dada ji"
                className="mt-2 w-full rounded-xl border border-elder-line bg-elder-panelSoft px-4 py-3 text-elder-text outline-none transition focus:border-red-500"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-elder-text">Caretaker Phone</span>
              <input
                value={caretakerPhone}
                onChange={(event) => setCaretakerPhone(event.target.value)}
                placeholder="+91 98xx xxx xxx"
                className="mt-2 w-full rounded-xl border border-elder-line bg-elder-panelSoft px-4 py-3 text-elder-text outline-none transition focus:border-red-500"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-elder-text">Escalation Phone (Optional, for ringtone call)</span>
              <input
                value={escalationPhone}
                onChange={(event) => setEscalationPhone(event.target.value)}
                placeholder="+91 98xx xxx xxx"
                className="mt-2 w-full rounded-xl border border-elder-line bg-elder-panelSoft px-4 py-3 text-elder-text outline-none transition focus:border-red-500"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={verifyConnection}
                disabled={isVerifying}
                className="rounded-xl border border-elder-line bg-elder-panel px-4 py-2.5 text-sm font-semibold text-elder-text transition hover:border-red-400 disabled:opacity-60"
              >
                {isVerifying ? "Verifying..." : "Verify Connection"}
              </button>

              <button
                type="submit"
                disabled={!canSave}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
              >
                Save & Continue
              </button>
            </div>

            <p
              className={`rounded-xl border px-3 py-2 text-sm ${
                isVerified
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-100"
              }`}
            >
              {isVerified
                ? "Connection verified. Phone notifications are ready."
                : "Not verified yet. You can still save, but verify first for reliability."}
            </p>
          </div>

          <aside className="panel-soft p-5 md:col-span-1">
            <h2 className="brand-font text-xl font-bold text-elder-text">How to receive alerts on phone</h2>
            <ol className="mt-4 space-y-3 text-sm text-elder-muted">
              <li>1. Install the ntfy app from Play Store or App Store.</li>
              <li>2. Open app and subscribe to your topic name exactly as entered here.</li>
              <li>3. Keep notification permission and sound enabled for this topic.</li>
              <li>4. In ntfy app settings, set High/Urgent/Max priorities to play sound.</li>
              <li>5. In ElderGuard dashboard, tap Arm Alarm Audio once to enable continuous siren playback in browser.</li>
            </ol>

            <div className="mt-5 rounded-xl border border-elder-line bg-black/25 p-4 text-xs text-elder-muted">
              Tip: Share this topic only with trusted family members. Anyone with topic access can receive messages.
            </div>
          </aside>
        </form>
      </section>
    </main>
  );
}
