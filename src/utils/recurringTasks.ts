import { Task } from '../types';
import { formatLocalDateToIso } from './time';

/**
 * Add days to a YYYY-MM-DD string cleanly in local time
 */
export function addDaysToIsoDate(isoDate: string, daysToAdd: number): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    return formatLocalDateToIso(d);
  }
  const [year, month, day] = parts;
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + daysToAdd);
  return formatLocalDateToIso(d);
}

/**
 * Add months to a YYYY-MM-DD string cleanly in local time
 */
export function addMonthsToIsoDate(isoDate: string, monthsToAdd: number): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    const d = new Date();
    d.setMonth(d.getMonth() + monthsToAdd);
    return formatLocalDateToIso(d);
  }
  const [year, month, day] = parts;
  // Handle end-of-month target correctly
  const d = new Date(year, month - 1 + monthsToAdd, 1);
  const maxDaysInTargetMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, maxDaysInTargetMonth));
  return formatLocalDateToIso(d);
}

/**
 * Generates future occurrences for a repeating task starting AFTER the base task's date.
 */
export function generateRecurringInstances(baseTask: Task): Task[] {
  if (!baseTask.repeat || baseTask.repeat === 'None') {
    return [];
  }

  const baseDate = baseTask.date || formatLocalDateToIso();
  const instances: Task[] = [];
  const groupId = baseTask.recurringGroupId || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  if (baseTask.repeat === 'Daily') {
    // Generate for next 60 days
    for (let i = 1; i <= 60; i++) {
      const nextDate = addDaysToIsoDate(baseDate, i);
      instances.push({
        ...baseTask,
        id: `task-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
        recurringGroupId: groupId,
        date: nextDate,
        completed: false,
        completedAt: undefined,
      });
    }
  } else if (baseTask.repeat === 'Weekdays') {
    // Monday (1) to Friday (5) for next 60 calendar days
    let dayOffset = 1;
    let count = 0;
    while (count < 45 && dayOffset <= 90) {
      const nextDate = addDaysToIsoDate(baseDate, dayOffset);
      const [y, m, d] = nextDate.split('-').map(Number);
      const dayOfWeek = new Date(y, m - 1, d).getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        instances.push({
          ...baseTask,
          id: `task-${Date.now()}-${dayOffset}-${Math.random().toString(36).slice(2, 5)}`,
          recurringGroupId: groupId,
          date: nextDate,
          completed: false,
          completedAt: undefined,
        });
        count++;
      }
      dayOffset++;
    }
  } else if (baseTask.repeat === 'Weekends') {
    // Saturday (6) and Sunday (0)
    let dayOffset = 1;
    let count = 0;
    while (count < 20 && dayOffset <= 90) {
      const nextDate = addDaysToIsoDate(baseDate, dayOffset);
      const [y, m, d] = nextDate.split('-').map(Number);
      const dayOfWeek = new Date(y, m - 1, d).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        instances.push({
          ...baseTask,
          id: `task-${Date.now()}-${dayOffset}-${Math.random().toString(36).slice(2, 5)}`,
          recurringGroupId: groupId,
          date: nextDate,
          completed: false,
          completedAt: undefined,
        });
        count++;
      }
      dayOffset++;
    }
  } else if (baseTask.repeat === 'Weekly') {
    // Same day of week for 26 weeks
    for (let w = 1; w <= 26; w++) {
      const nextDate = addDaysToIsoDate(baseDate, w * 7);
      instances.push({
        ...baseTask,
        id: `task-${Date.now()}-w${w}-${Math.random().toString(36).slice(2, 5)}`,
        recurringGroupId: groupId,
        date: nextDate,
        completed: false,
        completedAt: undefined,
      });
    }
  } else if (baseTask.repeat === 'Monthly') {
    // Same day of month for 12 months
    for (let m = 1; m <= 12; m++) {
      const nextDate = addMonthsToIsoDate(baseDate, m);
      instances.push({
        ...baseTask,
        id: `task-${Date.now()}-m${m}-${Math.random().toString(36).slice(2, 5)}`,
        recurringGroupId: groupId,
        date: nextDate,
        completed: false,
        completedAt: undefined,
      });
    }
  }

  return instances;
}

/**
 * Check if a task is set to repeat or is part of a recurring series
 */
export function isRepeatingTask(task: Task, allTasks: Task[] = []): boolean {
  if (task.repeat && task.repeat !== 'None') {
    return true;
  }
  if (task.recurringGroupId) {
    // Check if other tasks exist with this groupId
    const hasRelatives = allTasks.some(
      (t) => t.id !== task.id && t.recurringGroupId === task.recurringGroupId
    );
    if (hasRelatives) return true;
  }
  return false;
}

/**
 * Find all following tasks in the repeat series (date >= targetTask.date)
 */
export function getFollowingRepeatTasks(targetTask: Task, allTasks: Task[]): Task[] {
  const targetDate = targetTask.date || formatLocalDateToIso();

  return allTasks.filter((t) => {
    if (t.id === targetTask.id) return false;

    // Match by recurringGroupId if present
    if (targetTask.recurringGroupId && t.recurringGroupId === targetTask.recurringGroupId) {
      return (t.date || '') >= targetDate;
    }

    // Fallback match: if repeat was set and title + startTime match
    if (
      targetTask.repeat &&
      targetTask.repeat !== 'None' &&
      t.title.toLowerCase() === targetTask.title.toLowerCase() &&
      t.startTime === targetTask.startTime
    ) {
      return (t.date || '') >= targetDate;
    }

    return false;
  });
}
