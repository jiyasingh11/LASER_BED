/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        elder: {
          bg: "#050915",
          panel: "#0f172a",
          panelSoft: "#111b2e",
          line: "#25314b",
          text: "#e5edff",
          muted: "#93a2c6",
          danger: "#ef4444",
          dangerDark: "#9f1239",
          safe: "#22c55e",
          safeDark: "#166534",
          amber: "#f59e0b"
        }
      },
      keyframes: {
        pulseSoft: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.85" },
          "50%": { transform: "scale(1.05)", opacity: "1" }
        },
        ripple: {
          "0%": { transform: "scale(0.2)", opacity: "0.8" },
          "100%": { transform: "scale(2.5)", opacity: "0" }
        }
      },
      animation: {
        pulseSoft: "pulseSoft 1.7s ease-in-out infinite",
        ripple: "ripple 700ms ease-out"
      },
      boxShadow: {
        alarm: "0 0 0 1px rgba(239, 68, 68, 0.45), 0 20px 60px rgba(239, 68, 68, 0.25)",
        panel: "0 18px 45px rgba(2, 6, 23, 0.55)"
      }
    }
  },
  plugins: []
};
