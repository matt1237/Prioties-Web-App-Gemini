/**
 * Utility functions for parsing and formatting duration minutes across the app.
 */

/**
 * Parse any user text input into duration minutes.
 * Supports:
 * - Direct numbers: "15", "45", "90"
 * - HH:MM notation: "1:30" -> 90 mins, "0:45" -> 45 mins
 * - Natural text: "15m", "15 min", "15 mins", "1.5h", "1h 30m", "1 hr 30 min", "2 hours"
 */
export function parseDurationToMinutes(input: string, fallback: number = 30): number {
  if (!input || !input.trim()) return fallback;
  const trimmed = input.trim().toLowerCase();

  // 1. Check for HH:MM pattern (e.g. 1:30, 0:45, 2:00)
  const colonMatch = trimmed.match(/^(\d{1,2}):(\d{1,2})$/);
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10);
    const mins = parseInt(colonMatch[2], 10);
    const total = hours * 60 + mins;
    return total > 0 ? Math.min(1440, total) : fallback;
  }

  // 2. Check for combined hour + minute text (e.g. "1h 30m", "1 hr 15 mins", "2.5h")
  const hasHours = /(?:(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?))/i.test(trimmed);
  const hasMinutes = /(?:(\d+)\s*(?:m|min|mins|minutes?))/i.test(trimmed);

  if (hasHours || hasMinutes) {
    let total = 0;
    const hMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?)/i);
    if (hMatch) {
      total += Math.round(parseFloat(hMatch[1]) * 60);
    }
    const mMatch = trimmed.match(/(\d+)\s*(?:m|min|mins|minutes?)/i);
    if (mMatch) {
      total += parseInt(mMatch[1], 10);
    }
    if (total > 0) return Math.min(1440, total);
  }

  // 3. Fallback to extracting the first positive integer
  const numMatch = trimmed.match(/^(\d+)/);
  if (numMatch) {
    const val = parseInt(numMatch[1], 10);
    if (!isNaN(val) && val > 0) {
      return Math.min(1440, val);
    }
  }

  return fallback;
}

/**
 * Format minutes into clean human-readable text e.g. "15 min", "1 hr", "1 hr 30 min"
 */
export function formatDurationDisplay(minutes: number): string {
  if (!minutes || minutes <= 0) return '0 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} ${h === 1 ? 'hr' : 'hrs'}`;
  return `${h} hr ${m} min`;
}

/**
 * Format minutes into clean compact text e.g. "15m", "1h", "1h 30m"
 */
export function formatDurationCompact(minutes: number): string {
  if (!minutes || minutes <= 0) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
