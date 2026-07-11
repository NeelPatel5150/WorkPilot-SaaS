import type { CSSProperties } from "react";

/**
 * White-Label Theme Engine
 * Company primary/secondary from register → full UI gradients.
 */

export type CompanyTheme = {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
};

const DEFAULT_THEME: CompanyTheme = {
  primaryColor: "#2563EB",
  secondaryColor: "#EFF6FF",
};

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) return { r: 37, g: 99, b: 235 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mix(hex: string, toward: "white" | "black", amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const t = toward === "white" ? 255 : 0;
  const mixChannel = (c: number) => Math.round(c + (t - c) * amount);
  const toHex = (c: number) => c.toString(16).padStart(2, "0");
  return `#${toHex(mixChannel(r))}${toHex(mixChannel(g))}${toHex(mixChannel(b))}`;
}

export function buildThemeStyle(
  theme?: Partial<CompanyTheme> | null
): CSSProperties {
  const t = { ...DEFAULT_THEME, ...theme };
  const primary = t.primaryColor;
  const secondary = t.secondaryColor;
  const light = mix(primary, "white", 0.28);
  const mid = mix(primary, "white", 0.12);
  const dark = mix(primary, "black", 0.22);
  const soft = mix(secondary, "white", 0.35);
  const { r, g, b } = hexToRgb(primary);

  return {
    ["--primary" as string]: primary,
    ["--secondary" as string]: secondary,
    ["--primary-rgb" as string]: `${r}, ${g}, ${b}`,
    ["--primary-shine" as string]: `linear-gradient(135deg, ${light} 0%, ${mid} 28%, ${primary} 58%, ${dark} 100%)`,
    ["--card-shine" as string]: `linear-gradient(155deg, #ffffff 0%, ${soft} 45%, ${secondary} 100%)`,
    ["--input-shine" as string]: `linear-gradient(180deg, #ffffff 0%, ${secondary} 100%)`,
    ["--sidebar-shine" as string]: `linear-gradient(180deg, #ffffff 0%, ${secondary} 100%)`,
    ["--stat-accent" as string]: `linear-gradient(90deg, ${dark} 0%, ${primary} 45%, #fbbf24 100%)`,
    ["--portal-glow" as string]: `radial-gradient(ellipse 80% 55% at 15% 0%, rgba(${r}, ${g}, ${b}, 0.28), transparent 62%), radial-gradient(ellipse 70% 45% at 95% 5%, rgba(251, 191, 36, 0.2), transparent 55%)`,
    ["--app-bg" as string]: [
      `radial-gradient(ellipse 1100px 580px at 8% -12%, rgba(${r}, ${g}, ${b}, 0.32), transparent 58%)`,
      `radial-gradient(ellipse 900px 520px at 100% 0%, rgba(251, 191, 36, 0.24), transparent 52%)`,
      `radial-gradient(ellipse 800px 420px at 50% 110%, rgba(${r}, ${g}, ${b}, 0.14), transparent 55%)`,
      `linear-gradient(165deg, ${secondary} 0%, #f8fafc 40%, ${mix(secondary, "white", 0.15)} 100%)`,
    ].join(", "),
  };
}

export function resolveCompanySlugFromHost(host: string, rootDomain: string): string | null {
  if (host.endsWith(rootDomain)) {
    const sub = host.replace(`.${rootDomain}`, "");
    if (sub && sub !== rootDomain && sub !== "www") return sub;
    return null;
  }
  return null;
}
