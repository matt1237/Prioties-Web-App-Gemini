/**
 * Real-time clock and schedule calculation utilities.
 * Ensures all views and timers are strictly grounded in the user's current clock.
 */

/**
 * Parse strings like "9:00 AM", "09:15", "9 AM", "9:12 PM", "17:30", "9am" into seconds from midnight.
 */
export function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)?$/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const ampm = match[3]?.toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 3600 + minutes * 60;
  }

  // Relaxed fallback search
  const relaxed = trimmed.match(/(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)?/i);
  if (!relaxed) return 0;
  let hours = parseInt(relaxed[1], 10);
  const minutes = relaxed[2] ? parseInt(relaxed[2], 10) : 0;
  const ampm = relaxed[3]?.toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 3600 + minutes * 60;
}

/**
 * Format total seconds into MM:SS (or HH:MM:SS if >= 1 hour)
 */
export function formatSecondsToDigital(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format seconds into "Xm Ys" or "Xs"
 */
export function formatSecondsToSavedDisplay(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

/**
 * Format seconds into exact HH:MM (e.g. 00:45, 01:15)
 */
export function formatSecondsToHHMM(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Get local date string YYYY-MM-DD from user's local clock
 */
export function formatLocalDateToIso(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Checks whether the current device time falls within the configured Night Theme schedule.
 */
export function isWithinNightSchedule(
  schedule?: { enabled: boolean; startTime: string; stopTime: string },
  date: Date = new Date()
): boolean {
  if (!schedule || !schedule.enabled) return false;
  const currentSec = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
  const startSec = parseTimeToSeconds(schedule.startTime);
  const stopSec = parseTimeToSeconds(schedule.stopTime);

  if (startSec === stopSec) return true;
  if (startSec < stopSec) {
    return currentSec >= startSec && currentSec < stopSec;
  }
  // Span crosses midnight (e.g. 8:00 PM (72000s) to 7:00 AM (25200s))
  return currentSec >= startSec || currentSec < stopSec;
}

