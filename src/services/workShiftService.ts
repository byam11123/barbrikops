/**
 * Work Shift & Operating Hours Engine
 *
 * Implements business-day, shift-based SLA deadline and delay calculations:
 * 1. Day Shift Hours (e.g. 09:30 to 18:30)
 * 2. Lunch Break Pause/Deduction (e.g. 13:30 to 14:30)
 * 3. Working Days of Week (e.g. Monday-Saturday working, Sunday weekly off)
 * 4. Precise Time Delay Formatting in `- hh:mm:ss` as requested
 */

export interface WorkShiftConfig {
  shiftStartTime: string; // e.g. "09:30"
  shiftEndTime: string;   // e.g. "18:30"
  lunchStartTime: string; // e.g. "13:30"
  lunchEndTime: string;   // e.g. "14:30"
  workingDays: number[];  // [1, 2, 3, 4, 5, 6] (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  timezone?: string;
}

export const DEFAULT_WORK_SHIFT_CONFIG: WorkShiftConfig = {
  shiftStartTime: '09:30',
  shiftEndTime: '18:30',
  lunchStartTime: '13:30',
  lunchEndTime: '14:30',
  workingDays: [1, 2, 3, 4, 5, 6], // Monday through Saturday working (Sunday weekly off)
};

/**
 * Parses time string like "09:30" or "9:30" into { hour, minute }
 */
export function parseTimeParts(timeStr: string): { hour: number; minute: number } {
  if (!timeStr) return { hour: 9, minute: 30 };
  const parts = timeStr.split(':');
  const hour = parseInt(parts[0], 10) || 0;
  const minute = parseInt(parts[1], 10) || 0;
  return { hour, minute };
}

/**
 * Checks if a given Date falls on an active working day (e.g. Mon-Sat)
 */
export function isWorkingDay(date: Date, workingDays: number[] = DEFAULT_WORK_SHIFT_CONFIG.workingDays): boolean {
  const dayOfWeek = date.getDay(); // 0 is Sunday, 1 is Monday ...
  return workingDays.includes(dayOfWeek);
}

/**
 * Converts a Date to total minutes from midnight for easy range checking
 */
export function getMinutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

/**
 * Checks if a date time is within working shift hours (excluding lunch)
 */
export function isWorkingShiftTime(date: Date, config: WorkShiftConfig = DEFAULT_WORK_SHIFT_CONFIG): boolean {
  if (!isWorkingDay(date, config.workingDays)) return false;

  const currentMin = getMinutesFromMidnight(date);
  const shiftStart = parseTimeParts(config.shiftStartTime);
  const shiftEnd = parseTimeParts(config.shiftEndTime);
  const lunchStart = parseTimeParts(config.lunchStartTime);
  const lunchEnd = parseTimeParts(config.lunchEndTime);

  const shiftStartMin = shiftStart.hour * 60 + shiftStart.minute;
  const shiftEndMin = shiftEnd.hour * 60 + shiftEnd.minute;
  const lunchStartMin = lunchStart.hour * 60 + lunchStart.minute;
  const lunchEndMin = lunchEnd.hour * 60 + lunchEnd.minute;

  if (currentMin < shiftStartMin || currentMin >= shiftEndMin) {
    return false;
  }

  // Inside lunch break
  if (currentMin >= lunchStartMin && currentMin < lunchEndMin) {
    return false;
  }

  return true;
}

/**
 * Advances a Date to the very next working minute if it's currently outside shift, in lunch, or on a weekend
 */
export function moveToNextWorkingWindow(date: Date, config: WorkShiftConfig = DEFAULT_WORK_SHIFT_CONFIG): Date {
  const cur = new Date(date.getTime());
  const shiftStart = parseTimeParts(config.shiftStartTime);
  const shiftEnd = parseTimeParts(config.shiftEndTime);
  const lunchStart = parseTimeParts(config.lunchStartTime);
  const lunchEnd = parseTimeParts(config.lunchEndTime);

  const shiftStartMin = shiftStart.hour * 60 + shiftStart.minute;
  const shiftEndMin = shiftEnd.hour * 60 + shiftEnd.minute;
  const lunchStartMin = lunchStart.hour * 60 + lunchStart.minute;
  const lunchEndMin = lunchEnd.hour * 60 + lunchEnd.minute;

  // Maximum loop guard of 14 days
  let safetyDays = 14;
  while (safetyDays > 0) {
    // 1. If not a working day (e.g. Sunday), move to next day at shift start
    if (!isWorkingDay(cur, config.workingDays)) {
      cur.setDate(cur.getDate() + 1);
      cur.setHours(shiftStart.hour, shiftStart.minute, 0, 0);
      safetyDays--;
      continue;
    }

    const currentMin = getMinutesFromMidnight(cur);

    // 2. Before shift start: snap to shift start
    if (currentMin < shiftStartMin) {
      cur.setHours(shiftStart.hour, shiftStart.minute, 0, 0);
      return cur;
    }

    // 3. During lunch: snap to lunch end
    if (currentMin >= lunchStartMin && currentMin < lunchEndMin) {
      cur.setHours(lunchEnd.hour, lunchEnd.minute, 0, 0);
      return cur;
    }

    // 4. After shift end: move to next day at shift start
    if (currentMin >= shiftEndMin) {
      cur.setDate(cur.getDate() + 1);
      cur.setHours(shiftStart.hour, shiftStart.minute, 0, 0);
      safetyDays--;
      continue;
    }

    // Currently within active working window
    return cur;
  }

  return cur;
}

/**
 * Parses user / sheet formatted date strings into valid JS Date
 */
export function parseDateSafe(input: Date | string | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input !== 'string') return null;

  const clean = input.replace(',', ' ').trim();
  if (!clean || clean === '—' || clean === '-' || clean.toLowerCase().includes('pending')) return null;

  try {
    // Format DD/MM/YYYY or DD-MM-YYYY with optional HH:mm[:ss] [AM|PM]
    const match = clean.match(/^(\d{1,2})[\s/:_.-]+(\d{1,2})[\s/:_.-]+(\d{4})/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const year = parseInt(match[3], 10);

      let hour = 0;
      let min = 0;
      let sec = 0;

      const timePart = clean.substring(match[0].length).trim();
      if (timePart) {
        const timeMatch = timePart.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
        if (timeMatch) {
          hour = parseInt(timeMatch[1], 10);
          min = parseInt(timeMatch[2], 10);
          if (timeMatch[3]) sec = parseInt(timeMatch[3], 10);
        }
      }

      const isPM = clean.toLowerCase().includes('pm');
      const isAM = clean.toLowerCase().includes('am');
      if (isPM && hour < 12) hour += 12;
      if (isAM && hour === 12) hour = 0;

      const d = new Date(year, month, day, hour, min, sec);
      if (!isNaN(d.getTime())) return d;
    }
  } catch {}

  const d = new Date(input);
  if (!isNaN(d.getTime())) return d;
  return null;
}

/**
 * Formats a Date object cleanly into DD/MM/YYYY HH:mm:ss
 */
export function formatToStandardDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hour = pad(d.getHours());
  const min = pad(d.getMinutes());
  const sec = pad(d.getSeconds());
  return `${day}/${month}/${year} ${hour}:${min}:${sec}`;
}

/**
 * Calculates Target Planned DateTime by adding SLA Hours purely through working shifts
 * Skips non-working days (Sundays), off-hours (evenings/nights), and lunch break!
 */
export function addWorkingSlaHours(
  startDateTime: Date | string,
  slaHours: number,
  config: WorkShiftConfig = DEFAULT_WORK_SHIFT_CONFIG
): Date {
  const initial = parseDateSafe(startDateTime) || new Date();
  if (slaHours <= 0) return initial;

  let pointer = moveToNextWorkingWindow(initial, config);
  let remainingMinutes = Math.round(slaHours * 60);

  const shiftEnd = parseTimeParts(config.shiftEndTime);
  const lunchStart = parseTimeParts(config.lunchStartTime);
  const lunchEnd = parseTimeParts(config.lunchEndTime);

  const shiftEndMin = shiftEnd.hour * 60 + shiftEnd.minute;
  const lunchStartMin = lunchStart.hour * 60 + lunchStart.minute;
  const lunchEndMin = lunchEnd.hour * 60 + lunchEnd.minute;

  let safetyCounter = 10000; // prevents any infinite loop

  while (remainingMinutes > 0 && safetyCounter > 0) {
    safetyCounter--;
    pointer = moveToNextWorkingWindow(pointer, config);

    const currentMin = getMinutesFromMidnight(pointer);

    // How many working minutes available in the current active window?
    let minutesAvailableUntilBreakOrEnd = 0;

    if (currentMin < lunchStartMin) {
      minutesAvailableUntilBreakOrEnd = lunchStartMin - currentMin;
    } else if (currentMin >= lunchEndMin && currentMin < shiftEndMin) {
      minutesAvailableUntilBreakOrEnd = shiftEndMin - currentMin;
    }

    if (minutesAvailableUntilBreakOrEnd <= 0) {
      pointer = moveToNextWorkingWindow(new Date(pointer.getTime() + 60000), config);
      continue;
    }

    if (remainingMinutes <= minutesAvailableUntilBreakOrEnd) {
      // Finished within this window!
      pointer = new Date(pointer.getTime() + remainingMinutes * 60000);
      remainingMinutes = 0;
      break;
    } else {
      // Consume the entire window chunk and advance to next window
      remainingMinutes -= minutesAvailableUntilBreakOrEnd;
      pointer = new Date(pointer.getTime() + minutesAvailableUntilBreakOrEnd * 60000);
      pointer = moveToNextWorkingWindow(pointer, config);
    }
  }

  return pointer;
}

/**
 * Calculates elapsed working hours & seconds between two timestamps (taking into account shift & lunch)
 */
export function getWorkingSecondsDifference(
  fromDateTime: Date | string,
  toDateTime: Date | string,
  config: WorkShiftConfig = DEFAULT_WORK_SHIFT_CONFIG
): number {
  const from = parseDateSafe(fromDateTime);
  const to = parseDateSafe(toDateTime);

  if (!from || !to) return 0;
  if (to.getTime() <= from.getTime()) return 0;

  let pointer = moveToNextWorkingWindow(from, config);
  let totalWorkingSeconds = 0;

  const shiftEnd = parseTimeParts(config.shiftEndTime);
  const lunchStart = parseTimeParts(config.lunchStartTime);
  const lunchEnd = parseTimeParts(config.lunchEndTime);

  const shiftEndMin = shiftEnd.hour * 60 + shiftEnd.minute;
  const lunchStartMin = lunchStart.hour * 60 + lunchStart.minute;
  const lunchEndMin = lunchEnd.hour * 60 + lunchEnd.minute;

  let loopLimit = 10000;

  while (pointer.getTime() < to.getTime() && loopLimit > 0) {
    loopLimit--;
    pointer = moveToNextWorkingWindow(pointer, config);
    if (pointer.getTime() >= to.getTime()) break;

    const currentMin = getMinutesFromMidnight(pointer);
    let nextBoundaryMin = shiftEndMin;

    if (currentMin < lunchStartMin) {
      nextBoundaryMin = lunchStartMin;
    } else if (currentMin >= lunchEndMin && currentMin < shiftEndMin) {
      nextBoundaryMin = shiftEndMin;
    }

    const maxSecondsInWindow = (nextBoundaryMin - currentMin) * 60;
    const secondsUntilTarget = Math.max(0, Math.floor((to.getTime() - pointer.getTime()) / 1000));

    if (secondsUntilTarget <= maxSecondsInWindow) {
      totalWorkingSeconds += secondsUntilTarget;
      break;
    } else {
      totalWorkingSeconds += maxSecondsInWindow;
      pointer = new Date(pointer.getTime() + maxSecondsInWindow * 1000);
      pointer = moveToNextWorkingWindow(pointer, config);
    }
  }

  return totalWorkingSeconds;
}

/**
 * Formats time delay strictly as `- hh:mm:ss` (e.g. `- 02:45:30` or `00:00:00` if on-time)
 */
export function formatDelayHms(totalDelaySeconds: number, isDelayed: boolean): string {
  if (!isDelayed || totalDelaySeconds <= 0) {
    return '00:00:00';
  }

  const totalSec = Math.round(totalDelaySeconds);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  const hStr = pad(h);
  const mStr = pad(m);
  const sStr = pad(s);

  // Formatted strictly as `- hh:mm:ss`
  return `- ${hStr}:${mStr}:${sStr}`;
}

/**
 * Calculates stage or flow delay variance taking shift hours, lunch and weekly off into account
 */
export function calculateWorkingHoursDelay(
  plannedDateStr: Date | string | undefined,
  actualDateStr: Date | string | undefined,
  config: WorkShiftConfig = DEFAULT_WORK_SHIFT_CONFIG
): {
  delayHours: number;
  totalDelaySeconds: number;
  isDelayed: boolean;
  formattedDelay: string;
} {
  const planned = parseDateSafe(plannedDateStr);
  if (!planned) {
    return { delayHours: 0, totalDelaySeconds: 0, isDelayed: false, formattedDelay: '00:00:00' };
  }

  const actual = parseDateSafe(actualDateStr) || new Date();

  // If actual completed before or at planned date
  if (actual.getTime() <= planned.getTime()) {
    return { delayHours: 0, totalDelaySeconds: 0, isDelayed: false, formattedDelay: '00:00:00' };
  }

  const workingSeconds = getWorkingSecondsDifference(planned, actual, config);
  const delayHours = workingSeconds / 3600;
  const isDelayed = workingSeconds > 0;

  return {
    delayHours,
    totalDelaySeconds: workingSeconds,
    isDelayed,
    formattedDelay: formatDelayHms(workingSeconds, isDelayed),
  };
}
