export type PriorityLevel = 'None' | 'Low' | 'Medium' | 'High';

export type ViewType = 
  | 'daily-plan'
  | 'priorities'
  | 'dedications'
  | 'keywords'
  | 'routines'
  | 'flow'
  | 'all-done'
  | 'widget'
  | 'settings';

export type PlanTimeframe = 'Day' | 'Week' | 'Month';

export interface Task {
  id: string;
  title: string;
  startTime: string; // e.g. "5:00 AM" or "05:00"
  endTime: string;   // e.g. "5:15 AM"
  durationMinutes: number;
  priority: PriorityLevel;
  dedicationId?: string;
  routineId?: string;
  routineName?: string;
  completed: boolean;
  completedAt?: string;
  date: string; // YYYY-MM-DD
  repeat?: 'None' | 'Daily' | 'Weekdays' | 'Weekends' | 'Weekly' | 'Monthly';
  recurringGroupId?: string;
  autoPromotePriority?: 'Off' | 'After 1 day' | 'After 2 days' | 'After 3 days' | 'After 1 week';
  notes?: string;
  agingDays?: number;
  agingIntervalHours?: number;
}

export interface Dedication {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  score: number;
  weeklyTarget?: number;
  pointMultiplier?: number;
  hidden?: boolean;
}

export interface Keyword {
  id: string;
  name: string;
  durationMinutes: number;
  priority: PriorityLevel;
  dedicationId?: string;
  autoPromotePriority?: Task['autoPromotePriority'];
  agingDays?: number;
  usageCount?: number;
}

export interface Routine {
  id: string;
  name: string;
  description?: string;
  taskKeywords: { keywordId: string; title: string; durationMinutes: number; priority: PriorityLevel }[];
  totalMinutes: number;
  points: number;
}

export interface PriorityColors {
  low: string;
  medium: string;
  high: string;
  none: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  bgColor: string;
  cardBg: string;
  primaryColor: string;
  primaryLight: string;
  textColor: string;
  accentColor: string;
  headerBg: string;
  priorityColors?: PriorityColors;
  isCustom?: boolean;
}

export interface NightThemeSchedule {
  enabled: boolean;
  startTime: string; // e.g. "8:00 PM"
  stopTime: string;  // e.g. "7:00 AM"
}

export interface GuideStep {
  step: number;
  title: string;
  text: string;
  targetView: ViewType;
  spotlightSelector?: string;
  spotlightLabel?: string;
}

export interface TimeSavedRecord {
  id: string;
  taskId: string;
  taskTitle: string;
  secondsSaved: number;
  completedAt: string;
}

export interface TimeSavedStats {
  totalSecondsSaved: number;
  tasksCompletedEarlyCount: number;
  history: TimeSavedRecord[];
}
