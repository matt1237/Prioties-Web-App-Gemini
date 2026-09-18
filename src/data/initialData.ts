import { Task, Dedication, Keyword, Routine, GuideStep, ThemeConfig, PriorityColors } from '../types';

export const INITIAL_DEDICATIONS: Dedication[] = [];

export const INITIAL_TASKS: Task[] = [];

export const INITIAL_COMPLETED_TASKS: Task[] = [];

export const INITIAL_KEYWORDS: Keyword[] = [];

export const INITIAL_ROUTINES: Routine[] = [];

export const GUIDE_STEPS: GuideStep[] = [
  {
    step: 1,
    title: 'Welcome to Priorities',
    text: 'This is your quick guide. The words type in one letter at a time. Tap this box once to reveal the whole message, then tap again to continue. Once it is full, the side arrows flash so you can go back or forward if you missed something.',
    targetView: 'daily-plan',
  },
  {
    step: 2,
    title: 'Daily Plan',
    text: 'Your Daily Plan is your main hub for success. Use Keywords to make new tasks more streamlined over time, let the next time try to set itself as you add tasks, and set Dedications to earn dedication points.',
    targetView: 'daily-plan',
    spotlightSelector: '#header-title',
    spotlightLabel: 'Daily Plan',
  },
  {
    step: 3,
    title: 'Add a task',
    text: 'Give a task a time, length, priority, and optional dedication. The next suggested time follows the most recently saved task, so planning stays quick.',
    targetView: 'daily-plan',
    spotlightSelector: '#add-task-fab',
    spotlightLabel: 'Add Task Button',
  },
  {
    step: 4,
    title: 'See the bigger picture',
    text: 'Switch between Day, Week, and Month to spot open time, plan ahead, and move around your schedule without losing your place.',
    targetView: 'daily-plan',
    spotlightSelector: '#timeframe-selector',
    spotlightLabel: 'Day / Week / Month',
  },
  {
    step: 5,
    title: 'Long-term priorities',
    text: 'Use Priorities for long-term goals and tasks you do not want to lose sight of. Set an aging interval so a priority automatically increases from Low to Medium to High based on the length of time you choose.',
    targetView: 'priorities',
    spotlightSelector: '#header-title',
    spotlightLabel: 'Priorities Hub',
  },
  {
    step: 6,
    title: 'Dedications',
    text: 'Dedications help you allocate your attention over time. Assign a task a dedication to gain points, then use this page to see where your attention is going and where it may need more focus.',
    targetView: 'dedications',
    spotlightSelector: '#header-title',
    spotlightLabel: 'Dedications',
  },
  {
    step: 7,
    title: 'Keywords',
    text: 'Keywords remember task details for fast entry. Save the defaults you use often, including duration, priority, aging interval, and dedication.',
    targetView: 'keywords',
    spotlightSelector: '#header-title',
    spotlightLabel: 'Keywords',
  },
  {
    step: 8,
    title: 'Routines',
    text: 'Routines group keywords into repeatable plans. Build routines for morning rituals, work blocks, evening wind-down, or workouts, and drop them right into your day.',
    targetView: 'keywords',
    spotlightSelector: '#routines-section',
    spotlightLabel: 'Routines',
  },
  {
    step: 9,
    title: 'Stay in Flow',
    text: 'Flow helps you stay on track in real time. Keep the current task and timer in view so you do not get caught loafing around when you should be busy.',
    targetView: 'flow',
    spotlightSelector: '#header-title',
    spotlightLabel: 'Flow Mode',
  },
  {
    step: 10,
    title: 'Recent achievements',
    text: 'All Done shows your recent achievements. Use it to see the work you have finished and give yourself credit for making progress.',
    targetView: 'all-done',
    spotlightSelector: '#header-title',
    spotlightLabel: 'All Done',
  },
  {
    step: 11,
    title: 'Your home-screen widget',
    text: 'The Widget keeps the next 3 tasks in your day at a glance, so you can stay oriented and check off items directly without opening Priorities.',
    targetView: 'widget',
    spotlightSelector: '#widget-card',
    spotlightLabel: 'Widget Preview',
  },
  {
    step: 12,
    title: 'Your app menu',
    text: 'Tap the menu button any time to move between Daily Plan, Priorities, Dedications, Keywords, Routines, Flow, All Done, Widget, and Settings.',
    targetView: 'daily-plan',
    spotlightSelector: '#menu-btn',
    spotlightLabel: 'App Menu',
  },
  {
    step: 13,
    title: 'Make it yours',
    text: 'Settings lets you choose your background, text, and priority colors, plus notification behavior. Save a theme when you find a look you like.',
    targetView: 'settings',
    spotlightSelector: '#header-title',
    spotlightLabel: 'Settings & Themes',
  },
  {
    step: 14,
    title: 'Replay whenever you need',
    text: 'That bubbly star is your guide. Tap it in the top-right to play this tutorial again. You are ready to make a plan that works for you.',
    targetView: 'daily-plan',
    spotlightSelector: '#guide-star-btn',
    spotlightLabel: 'Guide Star',
  },
];

export const DEFAULT_PRIORITY_COLORS: PriorityColors = {
  low: '#bbf7d0',     // Pastel Green for Low
  medium: '#fef08a',  // Pastel Yellow for Medium
  high: '#fecdd3',    // Pastel Red for High
  none: '#f1f5f9',    // Neutral
};

export const PAPER_WHITE_THEME: ThemeConfig = {
  id: 'paper-white',
  name: 'Paper White (Default)',
  bgColor: '#ffffff',
  cardBg: '#f6f6f7',
  primaryColor: '#000000',
  primaryLight: '#f1f1f3',
  textColor: '#000000',
  accentColor: '#27272a',
  headerBg: '#ffffff',
  priorityColors: {
    low: '#bbf7d0',
    medium: '#fef08a',
    high: '#fecdd3',
    none: '#f1f5f9',
  },
};

export const NIGHT_MODE_THEME: ThemeConfig = {
  id: 'night-mode',
  name: 'Night Mode',
  bgColor: '#000000',
  cardBg: '#171717',
  primaryColor: '#ffffff',
  primaryLight: '#262626',
  textColor: '#ffffff',
  accentColor: '#e4e4e7',
  headerBg: '#000000',
  priorityColors: {
    low: '#14532d',
    medium: '#713f12',
    high: '#7f1d1d',
    none: '#262626',
  },
};

export const THEMES: ThemeConfig[] = [
  PAPER_WHITE_THEME,
  NIGHT_MODE_THEME,
];

