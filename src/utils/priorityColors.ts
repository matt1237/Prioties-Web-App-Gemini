import { PriorityLevel, PriorityColors, ThemeConfig } from '../types';
import { DEFAULT_PRIORITY_COLORS } from '../data/initialData';

export function getPriorityColors(theme?: ThemeConfig): PriorityColors {
  if (theme?.priorityColors) {
    return {
      low: theme.priorityColors.low || DEFAULT_PRIORITY_COLORS.low,
      medium: theme.priorityColors.medium || DEFAULT_PRIORITY_COLORS.medium,
      high: theme.priorityColors.high || DEFAULT_PRIORITY_COLORS.high,
      none: theme.priorityColors.none || DEFAULT_PRIORITY_COLORS.none,
    };
  }
  return DEFAULT_PRIORITY_COLORS;
}

// Convert hex to rgb
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) {
    return { r: 255, g: 255, b: 255 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function isDarkTheme(theme?: ThemeConfig): boolean {
  if (!theme?.bgColor) return false;
  try {
    const { r, g, b } = hexToRgb(theme.bgColor);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq < 128;
  } catch {
    return false;
  }
}

// Compute luminance to guarantee crisp readable text
export function getContrastTextColor(hexBg: string, theme?: ThemeConfig): string {
  try {
    const { r, g, b } = hexToRgb(hexBg);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    // For light/pastel priority cards (yiq >= 140), use ultra-crisp dark slate text (#0f172a) for maximum contrast
    return yiq >= 140 ? '#0f172a' : '#ffffff';
  } catch {
    return '#0f172a';
  }
}

// Darker border helper
export function getDarkerShade(hex: string, percent = 15): string {
  try {
    const { r, g, b } = hexToRgb(hex);
    const factor = (100 - percent) / 100;
    const nr = Math.max(0, Math.floor(r * factor));
    const ng = Math.max(0, Math.floor(g * factor));
    const nb = Math.max(0, Math.floor(b * factor));
    return `#${((1 << 24) + (nr << 16) + (ng << 8) + nb).toString(16).slice(1)}`;
  } catch {
    return hex;
  }
}

// Slightly lighter offset helper for containers and cards
export function getSurfaceOffsetColor(bgColor: string): string {
  try {
    const { r, g, b } = hexToRgb(bgColor);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    if (yiq < 30) {
      // Near black or pitch black (#000000) -> slightly lighter elevated card surface
      return '#171717';
    } else if (yiq < 128) {
      // Moderately dark theme -> 12% lighter
      const nr = Math.min(255, r + 22);
      const ng = Math.min(255, g + 22);
      const nb = Math.min(255, b + 22);
      return `#${((1 << 24) + (nr << 16) + (ng << 8) + nb).toString(16).slice(1)}`;
    } else if (yiq > 248) {
      // Paper white (#ffffff) -> clean soft surface offset (#f6f6f7)
      return '#f6f6f7';
    } else {
      // Soft light / pastel (e.g. mint green #dcf0e2, soft blue, lavender) -> 25% lighter tint towards pure white
      const nr = Math.min(255, Math.floor(r + (255 - r) * 0.35));
      const ng = Math.min(255, Math.floor(g + (255 - g) * 0.35));
      const nb = Math.min(255, Math.floor(b + (255 - b) * 0.35));
      return `#${((1 << 24) + (nr << 16) + (ng << 8) + nb).toString(16).slice(1)}`;
    }
  } catch {
    return '#f6f6f7';
  }
}

export function getSurfaceBg(theme?: ThemeConfig): string {
  if (theme?.cardBg && theme.cardBg !== '#ffffff') return theme.cardBg;
  return getSurfaceOffsetColor(theme?.bgColor || '#ffffff');
}

export function getBorderColor(theme?: ThemeConfig): string {
  return isDarkTheme(theme) ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
}

export function getPriorityColorStyle(
  priority: PriorityLevel,
  theme?: ThemeConfig
): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  const colors = getPriorityColors(theme);
  let bg = colors.none;
  let dot = '#94a3b8';

  if (priority === 'Low') {
    bg = colors.low;
    dot = '#22c55e';
  } else if (priority === 'Medium') {
    bg = colors.medium;
    dot = '#eab308';
  } else if (priority === 'High') {
    bg = colors.high;
    dot = '#ef4444';
  }

  const text = getContrastTextColor(bg, theme);
  const isDark = isDarkTheme(theme);
  const border = isDark ? 'rgba(255, 255, 255, 0.15)' : getDarkerShade(bg, 14);

  return { bg, text, border, dot };
}

