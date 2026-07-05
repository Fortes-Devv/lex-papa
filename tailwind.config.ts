import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ─── COLORS ────────────────────────────────────────────────────────────
      colors: {
        // Semantic tokens mapped to CSS vars
        background: "hsl(var(--background))",
        surface:    "hsl(var(--surface))",
        card:       "hsl(var(--card))",
        popover:    "hsl(var(--popover))",

        border:  "hsl(var(--border))",
        divider: "hsl(var(--divider))",
        input:   "hsl(var(--input))",
        ring:    "hsl(var(--ring))",

        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover:      "hsl(var(--primary-hover))",
          muted:      "hsl(var(--primary-muted))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },

        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },

        success: {
          DEFAULT:    "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          muted:      "hsl(var(--success-muted))",
        },
        warning: {
          DEFAULT:    "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          muted:      "hsl(var(--warning-muted))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          muted:      "hsl(var(--destructive-muted))",
        },
        info: {
          DEFAULT:    "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          muted:      "hsl(var(--info-muted))",
        },

        foreground:          "hsl(var(--foreground))",
        "foreground-muted":  "hsl(var(--foreground-muted))",
        "foreground-subtle": "hsl(var(--foreground-subtle))",

        sidebar:       "hsl(var(--sidebar))",
        "sidebar-border": "hsl(var(--sidebar-border))",

        // Raw palette — LEX orange + amber
        orange: {
          50:  "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#e8650a",
          800: "#9a3412",
          900: "#7c2d12",
          950: "#431407",
        },
        amber: {
          50:  "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03",
        },
        warm: {
          50:  "#fdf8f4",
          100: "#f9ede0",
          200: "#f0d5bc",
          300: "#e4b48e",
          400: "#d48a5a",
          500: "#c8703a",
          600: "#b55a2c",
          700: "#974825",
          800: "#7c3b22",
          900: "#67321f",
          950: "#371710",
        },
      },

      // ─── TYPOGRAPHY ────────────────────────────────────────────────────────
      fontFamily: {
        sans: ["Archivo Variable", "system-ui", "sans-serif"],
        serif: ["Source Serif 4 Variable", "Georgia", "serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        display: ["Archivo Variable", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs":    ["0.625rem", { lineHeight: "1rem",    letterSpacing: "0.05em"  }],
        xs:       ["0.75rem",  { lineHeight: "1rem",    letterSpacing: "0.025em" }],
        sm:       ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "0.01em"  }],
        base:     ["1rem",     { lineHeight: "1.5rem",  letterSpacing: "0"       }],
        lg:       ["1.125rem", { lineHeight: "1.75rem", letterSpacing: "-0.01em" }],
        xl:       ["1.25rem",  { lineHeight: "1.75rem", letterSpacing: "-0.01em" }],
        "2xl":    ["1.5rem",   { lineHeight: "2rem",    letterSpacing: "-0.02em" }],
        "3xl":    ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "-0.02em" }],
        "4xl":    ["2.25rem",  { lineHeight: "2.5rem",  letterSpacing: "-0.03em" }],
        "5xl":    ["3rem",     { lineHeight: "1.1",     letterSpacing: "-0.04em" }],
        "6xl":    ["3.75rem",  { lineHeight: "1",       letterSpacing: "-0.04em" }],
        "7xl":    ["4.5rem",   { lineHeight: "1",       letterSpacing: "-0.05em" }],
        "display": ["5rem",    { lineHeight: "1",       letterSpacing: "-0.05em" }],
      },

      // ─── SPACING ───────────────────────────────────────────────────────────
      spacing: {
        "0.5": "0.125rem",  // 2px
        "1":   "0.25rem",   // 4px
        "1.5": "0.375rem",  // 6px
        "2":   "0.5rem",    // 8px
        "2.5": "0.625rem",  // 10px
        "3":   "0.75rem",   // 12px
        "3.5": "0.875rem",  // 14px
        "4":   "1rem",      // 16px
        "5":   "1.25rem",   // 20px
        "6":   "1.5rem",    // 24px
        "7":   "1.75rem",   // 28px
        "8":   "2rem",      // 32px
        "9":   "2.25rem",   // 36px
        "10":  "2.5rem",    // 40px
        "11":  "2.75rem",   // 44px
        "12":  "3rem",      // 48px
        "14":  "3.5rem",    // 56px
        "16":  "4rem",      // 64px
        "18":  "4.5rem",    // 72px
        "20":  "5rem",      // 80px
        "24":  "6rem",      // 96px
        "28":  "7rem",      // 112px
        "32":  "8rem",      // 128px
        "36":  "9rem",      // 144px
        "40":  "10rem",     // 160px
        "48":  "12rem",     // 192px
        "56":  "14rem",     // 224px
        "60":  "15rem",     // 240px
        "64":  "16rem",     // 256px
        "72":  "18rem",     // 288px
        "80":  "20rem",     // 320px
        "96":  "24rem",     // 384px
      },

      // ─── BORDER RADIUS ─────────────────────────────────────────────────────
      borderRadius: {
        none:  "0",
        sm:    "calc(var(--radius) - 4px)",
        DEFAULT: "var(--radius)",
        md:    "calc(var(--radius) + 0px)",
        lg:    "calc(var(--radius) + 4px)",
        xl:    "calc(var(--radius) + 8px)",
        "2xl": "calc(var(--radius) + 12px)",
        "3xl": "1.5rem",
        full:  "9999px",
      },

      // ─── SHADOWS ───────────────────────────────────────────────────────────
      boxShadow: {
        none: "none",
        xs:   "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        sm:   "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        DEFAULT: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        md:   "0 4px 12px -2px rgb(0 0 0 / 0.12), 0 2px 6px -2px rgb(0 0 0 / 0.08)",
        lg:   "0 10px 24px -4px rgb(0 0 0 / 0.12), 0 4px 8px -4px rgb(0 0 0 / 0.08)",
        xl:   "0 20px 40px -8px rgb(0 0 0 / 0.14), 0 8px 16px -6px rgb(0 0 0 / 0.08)",
        "2xl": "0 32px 64px -12px rgb(0 0 0 / 0.18)",
        inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
        glow:  "0 0 0 3px hsl(26 91% 47% / 0.30), 0 0 20px hsl(26 91% 47% / 0.12)",
        "glow-sm": "0 0 0 2px hsl(26 91% 47% / 0.22)",
        "glow-orange": "0 4px 32px hsl(26 91% 47% / 0.25), 0 0 0 1px hsl(26 91% 47% / 0.15)",
        card:  "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.04), inset 0 0 0 1px rgb(255 255 255 / 0.04)",
      },

      // ─── ANIMATIONS ────────────────────────────────────────────────────────
      keyframes: {
        "accordion-down":  { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up":    { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in":         { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-out":        { from: { opacity: "1" }, to: { opacity: "0" } },
        "slide-in-up":     { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "slide-in-down":   { from: { opacity: "0", transform: "translateY(-8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "slide-in-left":   { from: { opacity: "0", transform: "translateX(-8px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        "slide-in-right":  { from: { opacity: "0", transform: "translateX(8px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        "scale-in":        { from: { opacity: "0", transform: "scale(0.96)" }, to: { opacity: "1", transform: "scale(1)" } },
        "shimmer":         { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        "pulse-soft":      { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.5" } },
        "spin-slow":       { from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } },
        "bounce-gentle":   { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-4px)" } },
        "progress-indeterminate": {
          "0%":   { left: "-40%", width: "40%" },
          "100%": { left: "100%", width: "40%" },
        },
      },
      animation: {
        "accordion-down":  "accordion-down 0.2s ease-out",
        "accordion-up":    "accordion-up 0.2s ease-out",
        "fade-in":         "fade-in 0.15s ease-out",
        "fade-out":        "fade-out 0.15s ease-in",
        "slide-in-up":     "slide-in-up 0.2s ease-out",
        "slide-in-down":   "slide-in-down 0.2s ease-out",
        "slide-in-left":   "slide-in-left 0.2s ease-out",
        "slide-in-right":  "slide-in-right 0.2s ease-out",
        "scale-in":        "scale-in 0.15s ease-out",
        "shimmer":         "shimmer 2s linear infinite",
        "pulse-soft":      "pulse-soft 2s ease-in-out infinite",
        "spin-slow":       "spin-slow 3s linear infinite",
        "bounce-gentle":   "bounce-gentle 2s ease-in-out infinite",
        "progress-indeterminate": "progress-indeterminate 1.5s ease-in-out infinite",
      },

      // ─── TRANSITIONS ───────────────────────────────────────────────────────
      transitionDuration: {
        "75":  "75ms",
        "100": "100ms",
        "150": "150ms",
        "200": "200ms",
        "250": "250ms",
        "300": "300ms",
        "500": "500ms",
        "700": "700ms",
      },
      transitionTimingFunction: {
        "ease-smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
        "ease-spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "ease-in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
      },

      // ─── LAYOUT ────────────────────────────────────────────────────────────
      screens: {
        xs:  "375px",
        sm:  "640px",
        md:  "768px",
        lg:  "1024px",
        xl:  "1280px",
        "2xl": "1440px",
        "3xl": "1920px",
      },
      maxWidth: {
        "8xl":  "88rem",
        "9xl":  "96rem",
        "10xl": "120rem",
      },
      zIndex: {
        "0":    "0",
        "10":   "10",
        "20":   "20",
        "30":   "30",
        "40":   "40",
        "50":   "50",
        "dropdown":  "1000",
        "sticky":    "1100",
        "modal-backdrop": "1200",
        "modal":     "1300",
        "tooltip":   "1400",
        "toast":     "1500",
        "max":       "9999",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
