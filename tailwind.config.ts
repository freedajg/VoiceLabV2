import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

// Lifted from FilmBros dashboard — same tokens drive the neo layer in index.css.
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        brand: {
          DEFAULT: "#6B4EFF",
          hover: "#5A3FE8",
          deep: "#2E1A6B",
          light: "#B89AE6",
          pale: "#F4F1FB",
        },
        success: { DEFAULT: "#10B981", soft: "#ECFDF5" },
        warning: { DEFAULT: "#F59E0B", soft: "#FFFBEB" },
        danger: { DEFAULT: "#EF4444", soft: "#FEF2F2" },
        info: { DEFAULT: "#3B82F6", soft: "#EFF6FF" },
        "hot-lead": "#FF4D4D",
        // ── JSMB prototype palette (src/jsmb) ──────────────────────────────
        // Values come from the `data-brand` token sets in src/jsmb/jsmb.css,
        // stored as bare RGB triplets so opacity modifiers work (bg-j-ink/10).
        j: {
          canvas: "rgb(var(--j-canvas) / <alpha-value>)",
          surface: "rgb(var(--j-surface) / <alpha-value>)",
          "surface-2": "rgb(var(--j-surface-2) / <alpha-value>)",
          line: "rgb(var(--j-line) / <alpha-value>)",
          "line-strong": "rgb(var(--j-line-strong) / <alpha-value>)",
          ink: "rgb(var(--j-ink) / <alpha-value>)",
          "ink-2": "rgb(var(--j-ink-2) / <alpha-value>)",
          "ink-3": "rgb(var(--j-ink-3) / <alpha-value>)",
          primary: "rgb(var(--j-primary) / <alpha-value>)",
          "primary-bright": "rgb(var(--j-primary-bright) / <alpha-value>)",
          "primary-soft": "rgb(var(--j-primary-soft) / <alpha-value>)",
          accent: "rgb(var(--j-accent) / <alpha-value>)",
          "accent-soft": "rgb(var(--j-accent-soft) / <alpha-value>)",
          gold: "rgb(var(--j-gold) / <alpha-value>)",
          console: "rgb(var(--j-console) / <alpha-value>)",
          "console-2": "rgb(var(--j-console-2) / <alpha-value>)",
          "console-3": "rgb(var(--j-console-3) / <alpha-value>)",
          "console-line": "rgb(var(--j-console-line) / <alpha-value>)",
          "console-ink": "rgb(var(--j-console-ink) / <alpha-value>)",
          "console-ink-2": "rgb(var(--j-console-ink-2) / <alpha-value>)",
          "lane-front": "rgb(var(--j-lane-front) / <alpha-value>)",
          "lane-otc": "rgb(var(--j-lane-otc) / <alpha-value>)",
          "lane-back": "rgb(var(--j-lane-back) / <alpha-value>)",
          success: "rgb(var(--j-success) / <alpha-value>)",
          "success-soft": "rgb(var(--j-success-soft) / <alpha-value>)",
          warn: "rgb(var(--j-warn) / <alpha-value>)",
          "warn-soft": "rgb(var(--j-warn-soft) / <alpha-value>)",
          danger: "rgb(var(--j-danger) / <alpha-value>)",
          "danger-soft": "rgb(var(--j-danger-soft) / <alpha-value>)",
          info: "rgb(var(--j-info) / <alpha-value>)",
          "info-soft": "rgb(var(--j-info-soft) / <alpha-value>)",
        },
        "text-primary": "#0A0B14",
        "text-secondary": "#4B5168",
        "text-muted": "#8B92A8",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        "glow-brand": "0 0 40px rgba(107,78,255,0.25)",
        "glow-success": "0 0 30px rgba(16,185,129,0.3)",
        glass: "0 8px 32px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.6)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.3s ease-out forwards",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
