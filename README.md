# ElderGuard

ElderGuard is a production-ready React + Tailwind web application for patient bed-exit monitoring. It sends instant push alerts to family/caretakers via [ntfy.sh](https://ntfy.sh) with no backend and no database.

## Features

- Setup flow for ntfy topic, patient name, and caretaker phone
- Dashboard with large emergency trigger and quick alarm types
- Alarm types with proper ntfy priorities and tags:
  - Bed Exit (urgent)
  - Fall Detected (max)
  - Inactivity Alert (high)
  - All Clear (default)
  - Test Signal (low)
- Max Priority toggle to force critical alerts to `max`
- Repeat Alarm toggle (resends every 30 seconds until acknowledged)
- "I'm Aware" acknowledgement button to stop repeat alarms
- URL-based remote trigger support for Raspberry Pi:
  - `?trigger=bed_exit`
  - `?trigger=fall`
  - `?trigger=all_clear`
- Activity log (last 10) and persisted alarm history (last 50)
- Offline warning detection
- PWA manifest for installable mobile web app
- LocalStorage persistence (settings + logs)

## Tech Stack

- React 18
- Tailwind CSS v3
- Vite
- ntfy.sh HTTP API

## Quick Start

```bash
npm install
npm run dev
```

App runs on the local Vite URL shown in terminal (typically `http://localhost:5173`).

## ntfy Setup

1. Install the ntfy app on Android/iOS.
2. Choose a unique private topic name (for example: `elderguard-home-9821`).
3. In ElderGuard Setup screen, save the same topic.
4. In ntfy mobile app, subscribe to that topic.
5. Press Verify Connection and Test Signal.

## Alarm Payload Format

ElderGuard uses this client-side pattern:

```js
fetch("https://ntfy.sh/TOPIC_NAME", {
  method: "POST",
  headers: {
    Title: "ALARM TITLE",
    Priority: "urgent",
    Tags: "rotating_light",
    "Content-Type": "text/plain"
  },
  body: "Alarm message body here"
});
```

## Raspberry Pi Trigger Integration

ElderGuard supports remote trigger via URL query parameter. Open these URLs in browser or call with scripts:

- `https://your-app-domain.com/?trigger=bed_exit`
- `https://your-app-domain.com/?trigger=fall`
- `https://your-app-domain.com/?trigger=all_clear`

If setup is already completed in that browser profile, ElderGuard auto-fires the mapped alarm on page load.

### Example curl call

```bash
curl "https://your-app-domain.com/?trigger=bed_exit"
```

Note: Since this is a frontend-only app, this trigger requires the app session/browser context with saved settings.

## Deployment

### Vercel

1. Push project to GitHub.
2. Import repository into Vercel.
3. Framework preset: Vite.
4. Build command: `npm run build`
5. Output directory: `dist`

### Netlify

1. Push project to GitHub.
2. New Site from Git.
3. Build command: `npm run build`
4. Publish directory: `dist`

## Project Structure

- `src/App.jsx` - main app, routing, trigger parsing, toasts
- `src/pages/Setup.jsx` - onboarding + topic verification
- `src/pages/Dashboard.jsx` - live monitoring controls
- `src/pages/Settings.jsx` - editable settings and history management
- `src/components/AlarmButton.jsx` - large pulsing trigger button
- `src/components/StatusCard.jsx` - patient and connection status
- `src/components/ActivityLog.jsx` - recent signal timeline
- `src/hooks/useAlarm.js` - ntfy send logic + repeat + trigger mapping
- `src/hooks/useSettings.js` - localStorage settings/history persistence
- `public/manifest.json` - PWA metadata

## Security Notes

- Treat your ntfy topic as a private channel.
- Use random topic names to reduce accidental discovery.
- Do not store sensitive medical details in payload body.

## Production Tips

- Pin this app to home screen on caregiver phones.
- Keep Repeat Alarm enabled for unattended night monitoring.
- Keep device battery optimization disabled for ntfy app so alerts are not delayed.
