import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fault: {
          ember: "#ff7447",
          ash: "#f7efe4",
          basalt: "#090b11",
          rust: "#7b341f",
          flare: "#ffd36e",
          blood: "#c73a2b",
          signal: "#75f7ff",
          mist: "#d8e4ea"
        }
      },
      boxShadow: {
        fault: "0 20px 60px rgba(0, 0, 0, 0.35)",
        arena: "0 25px 80px rgba(0, 0, 0, 0.45)"
      },
      backgroundImage: {
        topo: "radial-gradient(circle at 20% 20%, rgba(255, 107, 53, 0.2), transparent 35%), radial-gradient(circle at 80% 0%, rgba(255, 209, 102, 0.18), transparent 25%), linear-gradient(135deg, rgba(255,255,255,0.06) 0, rgba(255,255,255,0) 45%)"
      },
      fontFamily: {
        display: ["var(--font-syne)"],
        body: ["var(--font-manrope)"],
        mono: ["var(--font-ibm-plex-mono)"]
      }
    }
  },
  plugins: []
};

export default config;