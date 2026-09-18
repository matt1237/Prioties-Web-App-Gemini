import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronDown, 
  Trash2, 
  Smartphone, 
  Check, 
  X, 
  Sliders, 
  Clock, 
  Sparkles,
  Info
} from 'lucide-react';
import { THEMES } from '../data/initialData';
import { ThemeConfig, PriorityColors, Task, TimeSavedStats } from '../types';
import { getPriorityColors } from '../utils/priorityColors';
import { ColorPickerField } from './ColorPickerField';
import { BubbleDensity } from './FloatingBubbles';
import { parseTimeToSeconds, formatLocalDateToIso } from '../utils/time';

interface SettingsViewProps {
  currentTheme: ThemeConfig;
  savedThemes?: ThemeConfig[];
  onSelectTheme: (theme: ThemeConfig) => void;
  onSaveTheme?: (theme: ThemeConfig) => void;
  onDeleteSavedTheme?: (themeId: string) => void;
  onReplayTutorial?: () => void;
  onResetData?: () => void;
  bubblesEnabled: boolean;
  onToggleBubbles: (enabled: boolean) => void;
  bubbleDensity?: BubbleDensity;
  onSelectBubbleDensity?: (density: BubbleDensity) => void;
  bubblesPoppedCount?: number;
  tasks?: Task[];
  activeTask?: Task | null;
  timeSavedStats?: TimeSavedStats;
  onResetTimeSaved?: () => void;
  onToggleTask?: (taskId: string, timeSavedSeconds?: number) => void;
}

type ActiveColorTarget = 'bg' | 'text' | 'low' | 'medium' | 'high' | null;

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentTheme,
  savedThemes = THEMES,
  onSelectTheme,
  onSaveTheme,
  onDeleteSavedTheme,
  bubblesEnabled,
  onToggleBubbles,
  tasks = [],
  activeTask = null,
  timeSavedStats,
  onResetTimeSaved,
  onToggleTask,
}) => {
  const [aodSubView, setAodSubView] = useState<'tasks' | 'flow'>('tasks');
  // Notification states
  const [allowNotifications, setAllowNotifications] = useState(true);
  const [showNextTaskOnLockScreen, setShowNextTaskOnLockScreen] = useState(true);
  const [upcomingTaskReminders, setUpcomingTaskReminders] = useState(true);
  const [reminderWindow, setReminderWindow] = useState('15 minutes before');
  const [isReminderDropdownOpen, setIsReminderDropdownOpen] = useState(false);
  const [priorityAgingAlerts, setPriorityAgingAlerts] = useState(false);
  const [interactiveAodCheckboxes, setInteractiveAodCheckboxes] = useState(true);

  // Completed memory states
  const [completedTasksDays, setCompletedTasksDays] = useState('7');
  const [completedPrioritiesDays, setCompletedPrioritiesDays] = useState('30');

  // Appearance & Color Customization
  const currentPriorityColors = getPriorityColors(currentTheme);
  const [priorityColors, setPriorityColors] = useState<PriorityColors>(currentPriorityColors);
  const [bgColor, setBgColor] = useState<string>(currentTheme.bgColor || '#FAF8F3');
  const [textColor, setTextColor] = useState<string>(currentTheme.textColor || '#3D4A5C');

  // Keep local state in sync if currentTheme changes externally
  useEffect(() => {
    if (currentTheme.bgColor) setBgColor(currentTheme.bgColor);
    if (currentTheme.textColor) setTextColor(currentTheme.textColor);
    setPriorityColors(getPriorityColors(currentTheme));
  }, [currentTheme.bgColor, currentTheme.textColor, currentTheme.priorityColors]);

  // Active expanded color picker
  const [activeColorTarget, setActiveColorTarget] = useState<ActiveColorTarget>(null);

  // Saved theme creation
  const [newThemeName, setNewThemeName] = useState('');
  const [localSavedThemes, setLocalSavedThemes] = useState<ThemeConfig[]>(savedThemes);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Samsung AOD Interactive Preview Modal
  const [isAodModalOpen, setIsAodModalOpen] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('10:19');
  const [activeWidgetPreviewMode, setActiveWidgetPreviewMode] = useState<'aod' | 'lockscreen' | 'home'>('aod');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleToggleColorPicker = (target: ActiveColorTarget) => {
    setActiveColorTarget((prev) => (prev === target ? null : target));
  };

  // Immediate live color application
  const handleBgColorChange = (hex: string) => {
    setBgColor(hex);
    onSelectTheme({
      ...currentTheme,
      bgColor: hex,
    });
  };

  const handleTextColorChange = (hex: string) => {
    setTextColor(hex);
    onSelectTheme({
      ...currentTheme,
      textColor: hex,
    });
  };

  const handlePriorityColorChange = (level: 'low' | 'medium' | 'high', hex: string) => {
    const updated = { ...priorityColors, [level]: hex };
    setPriorityColors(updated);
    onSelectTheme({
      ...currentTheme,
      priorityColors: updated,
    });
  };

  // Save custom theme
  const handleSaveCurrentTheme = () => {
    const name = newThemeName.trim() || `Theme ${localSavedThemes.length + 1}`;
    const newTheme: ThemeConfig = {
      ...currentTheme,
      id: `theme-${Date.now()}`,
      name,
      bgColor,
      textColor,
      priorityColors,
      isCustom: true,
    };

    const updatedThemes = [...localSavedThemes, newTheme];
    setLocalSavedThemes(updatedThemes);
    if (onSaveTheme) {
      onSaveTheme(newTheme);
    }
    setNewThemeName('');
    showToast(`Theme "${name}" saved!`);
  };

  const handleDeleteTheme = (themeId: string) => {
    const updatedThemes = localSavedThemes.filter((t) => t.id !== themeId);
    setLocalSavedThemes(updatedThemes);
    if (onDeleteSavedTheme) {
      onDeleteSavedTheme(themeId);
    }
    showToast('Theme removed');
  };

  const handleApplyTheme = (theme: ThemeConfig) => {
    onSelectTheme(theme);
    setBgColor(theme.bgColor || '#FAF8F3');
    setTextColor(theme.textColor || '#3D4A5C');
    if (theme.priorityColors) {
      setPriorityColors(theme.priorityColors);
    }
    showToast(`Applied ${theme.name}`);
  };

  // Save changes button at bottom
  const handleSaveChanges = () => {
    onSelectTheme({
      ...currentTheme,
      bgColor,
      textColor,
      priorityColors,
    });
    showToast('Settings saved successfully');
  };

  // Next 3 tasks in the day for AOD / Widget preview
  const previewTasks = useMemo(() => {
    const todayIsoStr = formatLocalDateToIso(new Date());
    const todayTasks = (tasks || []).filter(
      t => t.date === todayIsoStr || !t.date || t.date === '2026-09-17'
    );
    const pool = todayTasks.length > 0 ? todayTasks : (tasks || []);
    if (pool.length === 0) {
      return [
        {
          id: 'task-demo-1',
          title: 'Review weekly priorities',
          startTime: '9:00 AM',
          endTime: '9:45 AM',
          durationMinutes: 45,
          completed: false,
          priority: 'High' as const,
          date: todayIsoStr,
        },
        {
          id: 'task-demo-2',
          title: 'Sprint planning meeting',
          startTime: '10:00 AM',
          endTime: '11:00 AM',
          durationMinutes: 60,
          completed: false,
          priority: 'Medium' as const,
          date: todayIsoStr,
        },
        {
          id: 'task-demo-3',
          title: 'Send project update email',
          startTime: '11:30 AM',
          endTime: '12:00 PM',
          durationMinutes: 30,
          completed: false,
          priority: 'Low' as const,
          date: todayIsoStr,
        },
      ];
    }
    const sorted = [...pool].sort((a, b) => parseTimeToSeconds(a.startTime) - parseTimeToSeconds(b.startTime));
    const uncompleted = sorted.filter(t => !t.completed);
    return uncompleted.length > 0 ? uncompleted.slice(0, 3) : sorted.slice(0, 3);
  }, [tasks]);

  return (
    <div 
      className="flex-1 flex flex-col w-full min-h-[calc(100vh-65px)] select-none transition-colors duration-200"
      style={{
        backgroundColor: currentTheme.bgColor,
        color: currentTheme.textColor,
      }}
    >
      <div className="max-w-xl mx-auto w-full px-4 sm:px-6 pt-5 pb-32 space-y-10">

        {/* SECTION 1: NOTIFICATIONS */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-[#1e293b] tracking-tight">
              Notifications
            </h2>
            <p className="text-[13.5px] text-[#64748b] mt-1 leading-relaxed">
              Everything stays on this device. Turn reminders on only when you want Priorities to notify you.
            </p>
          </div>

          <div className="space-y-5 pt-1">
            {/* Allow notifications */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-[15px] font-semibold text-[#1e293b]">
                  Allow notifications
                </h3>
                <p className="text-[12.5px] text-[#64748b] mt-0.5">
                  Task reminders and priority aging alerts are available
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAllowNotifications(!allowNotifications)}
                className={`w-12 h-7 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer ${
                  allowNotifications ? 'bg-[#7898b8]' : 'bg-[#cbd5e1]'
                }`}
              >
                <span
                  className={`block w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
                    allowNotifications ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Show next task on lock screen */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-[15px] font-semibold text-[#1e293b]">
                  Show next task on lock screen
                </h3>
                <p className="text-[12.5px] text-[#64748b] mt-0.5">
                  Keep the next task visible in Android notifications and supported AOD surfaces
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNextTaskOnLockScreen(!showNextTaskOnLockScreen)}
                className={`w-12 h-7 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer ${
                  showNextTaskOnLockScreen ? 'bg-[#7898b8]' : 'bg-[#cbd5e1]'
                }`}
              >
                <span
                  className={`block w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
                    showNextTaskOnLockScreen ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Samsung AOD setup Card */}
            <div className="bg-[#eef3f8] rounded-2xl p-4 border border-[#e2e8f0] space-y-2.5">
              <h4 className="text-sm font-bold text-[#1e293b]">
                Samsung AOD setup
              </h4>
              <p className="text-[12px] text-[#475569] leading-relaxed">
                On Galaxy phones, open system Settings &rarr; Lock screen and AOD &rarr; Always On Display, enable Show notifications, and allow Priorities notification details. Samsung controls how much text appears while the screen is off.
              </p>
              <button
                type="button"
                onClick={() => setIsAodModalOpen(true)}
                className="w-full sm:w-auto mt-1 px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 active:scale-98 border border-[#cbd5e1] text-xs font-bold text-[#1e293b] shadow-2xs transition-all cursor-pointer text-center"
              >
                Open Priorities notification settings
              </button>
            </div>

            {/* Interactive AOD and Widgets Checkboxes Setting */}
            <div className="flex items-center justify-between gap-4 pt-1">
              <div className="flex-1">
                <h3 className="text-[15px] font-semibold text-[#1e293b]">
                  Always On Display & widget checkboxes
                </h3>
                <p className="text-[12.5px] text-[#64748b] mt-0.5">
                  Check off tasks directly from AOD and home screen widgets
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInteractiveAodCheckboxes(!interactiveAodCheckboxes)}
                className={`w-12 h-7 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer ${
                  interactiveAodCheckboxes ? 'bg-[#7898b8]' : 'bg-[#cbd5e1]'
                }`}
              >
                <span
                  className={`block w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
                    interactiveAodCheckboxes ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Upcoming task reminders */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-[#1e293b]">
                    Upcoming task reminders
                  </h3>
                  <p className="text-[12.5px] text-[#64748b] mt-0.5">
                    Notify before the scheduled start time
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUpcomingTaskReminders(!upcomingTaskReminders)}
                  className={`w-12 h-7 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer ${
                    upcomingTaskReminders ? 'bg-[#7898b8]' : 'bg-[#cbd5e1]'
                  }`}
                >
                  <span
                    className={`block w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
                      upcomingTaskReminders ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Reminder window dropdown */}
              {upcomingTaskReminders && (
                <div className="pt-2">
                  <label className="block text-xs text-[#64748b] font-medium mb-1">
                    Reminder window
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsReminderDropdownOpen(!isReminderDropdownOpen)}
                      className="w-full flex items-center justify-between py-2 text-sm text-[#1e293b] font-medium border-b border-[#cbd5e1] hover:border-[#94a3b8] transition-colors cursor-pointer text-left"
                    >
                      <span>{reminderWindow}</span>
                      <ChevronDown className="w-4 h-4 text-[#64748b]" />
                    </button>

                    {isReminderDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-[#e2e8f0] py-1 z-20">
                        {['5 minutes before', '10 minutes before', '15 minutes before', '30 minutes before', '1 hour before'].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setReminderWindow(opt);
                              setIsReminderDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-2 text-left text-xs font-medium hover:bg-gray-50 flex items-center justify-between cursor-pointer ${
                              reminderWindow === opt ? 'text-[#84a4cb] font-bold bg-[#f0f7ff]' : 'text-[#334155]'
                            }`}
                          >
                            <span>{opt}</span>
                            {reminderWindow === opt && <Check className="w-3.5 h-3.5 text-[#84a4cb]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Priority aging alerts */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-[15px] font-semibold text-[#1e293b]">
                  Priority aging alerts
                </h3>
                <p className="text-[12.5px] text-[#64748b] mt-0.5">
                  Notify when a task reaches its next priority level
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPriorityAgingAlerts(!priorityAgingAlerts)}
                className={`w-12 h-7 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer ${
                  priorityAgingAlerts ? 'bg-[#7898b8]' : 'bg-[#cbd5e1]'
                }`}
              >
                <span
                  className={`block w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
                    priorityAgingAlerts ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 2: PLAYFUL TOUCHES */}
        <section className="space-y-3">
          <div>
            <h2 className="text-2xl font-bold text-[#1e293b] tracking-tight">
              Playful touches
            </h2>
            <p className="text-[13.5px] text-[#64748b] mt-1">
              Add a gentle bit of motion to the Daily Plan when you want it.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-[#1e293b]">
                Floating bubbles
              </h3>
              <p className="text-[12.5px] text-[#64748b] mt-0.5">
                Let soft bubbles drift upward and pop with retro-style boops
              </p>
            </div>
            <button
              type="button"
              onClick={() => onToggleBubbles(!bubblesEnabled)}
              className={`w-12 h-7 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer ${
                bubblesEnabled ? 'bg-[#7898b8]' : 'bg-[#cbd5e1]'
              }`}
            >
              <span
                className={`block w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
                  bubblesEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </section>

        {/* SECTION: TIME SAVED */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#1e293b] tracking-tight">
                Time saved
              </h2>
              <p className="text-[13.5px] text-[#64748b] mt-1 leading-relaxed">
                Time gained by finishing flow tasks ahead of their scheduled duration.
              </p>
            </div>
            {timeSavedStats && timeSavedStats.history.length > 0 && onResetTimeSaved && (
              <button
                type="button"
                onClick={onResetTimeSaved}
                className="text-xs font-semibold text-[#94a3b8] hover:text-red-500 transition-colors cursor-pointer py-1 px-2.5 rounded-lg hover:bg-red-50"
              >
                Reset stats
              </button>
            )}
          </div>

          <div className="bg-[#f0f6fa] border border-[#d6e5f0] rounded-2xl p-4 sm:p-5 space-y-4">
            {/* Stats Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-[#e2edf5] shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Total Saved</span>
                <p className="text-xl sm:text-2xl font-extrabold text-[#2c3e50] mt-1">
                  {(() => {
                    const total = timeSavedStats?.totalSecondsSaved || 0;
                    const h = Math.floor(total / 3600);
                    const m = Math.floor((total % 3600) / 60);
                    const s = total % 60;
                    if (h > 0) return `${h}h ${m}m ${s}s`;
                    if (m > 0) return `${m}m ${s}s`;
                    return `${s}s`;
                  })()}
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-[#e2edf5] shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Finished Early</span>
                <p className="text-xl sm:text-2xl font-extrabold text-[#2c3e50] mt-1">
                  {timeSavedStats?.tasksCompletedEarlyCount || 0} <span className="text-xs font-normal text-[#64748b]">tasks</span>
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-[#e2edf5] shadow-2xs col-span-2 sm:col-span-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Avg per Task</span>
                <p className="text-xl sm:text-2xl font-extrabold text-[#2c3e50] mt-1">
                  {(() => {
                    const count = timeSavedStats?.tasksCompletedEarlyCount || 0;
                    if (count === 0) return '0s';
                    const avg = Math.round((timeSavedStats?.totalSecondsSaved || 0) / count);
                    const m = Math.floor(avg / 60);
                    const s = avg % 60;
                    return m > 0 ? `${m}m ${s}s` : `${s}s`;
                  })()}
                </p>
              </div>
            </div>

            {/* History Logs */}
            {timeSavedStats && timeSavedStats.history.length > 0 ? (
              <div className="space-y-2 pt-1 border-t border-[#e2edf5]">
                <div className="text-xs font-bold text-[#64748b] uppercase tracking-wider pt-2">
                  Recent Early Completions
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {timeSavedStats.history.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-[#e2edf5] text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-[#52b788]" />
                        <span className="font-semibold text-[#1e293b] truncate max-w-[160px] sm:max-w-[240px]">
                          {record.taskTitle}
                        </span>
                        <span className="text-[10px] text-[#94a3b8] font-mono">
                          {record.completedAt}
                        </span>
                      </div>
                      <span className="font-bold text-[#2d5a3f] bg-[#eaf5ec] px-2 py-0.5 rounded-md text-[11px] shrink-0 font-mono">
                        +{Math.floor(record.secondsSaved / 60)}m {record.secondsSaved % 60}s
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#64748b] text-center py-2">
                No time saved yet. Complete a task in the Flow timer ahead of time to bank saved minutes!
              </p>
            )}
          </div>
        </section>

        {/* SECTION 3: COMPLETED MEMORY */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-[#1e293b] tracking-tight">
              Completed memory
            </h2>
            <p className="text-[13.5px] text-[#64748b] mt-1 leading-relaxed">
              Choose how long completed items remain visible in All Done. Older items remain in your history for scoring and calendar records.
            </p>
          </div>

          <div className="space-y-4 pt-1">
            {/* Completed tasks */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-[15px] font-semibold text-[#1e293b]">
                  Completed tasks
                </h3>
                <p className="text-[12.5px] text-[#64748b] mt-0.5">
                  Tasks without a priority
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={completedTasksDays}
                  onChange={(e) => setCompletedTasksDays(e.target.value)}
                  className="w-16 py-2 px-2 text-center text-base font-bold bg-white rounded-xl border border-[#cbd5e1] text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#84a4cb]"
                />
                <span className="text-xs font-semibold text-[#64748b]">days</span>
              </div>
            </div>

            {/* Completed priorities */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-[15px] font-semibold text-[#1e293b]">
                  Completed priorities
                </h3>
                <p className="text-[12.5px] text-[#64748b] mt-0.5">
                  Tasks with Low, Medium, or High priority
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={completedPrioritiesDays}
                  onChange={(e) => setCompletedPrioritiesDays(e.target.value)}
                  className="w-16 py-2 px-2 text-center text-base font-bold bg-white rounded-xl border border-[#cbd5e1] text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#84a4cb]"
                />
                <span className="text-xs font-semibold text-[#64748b]">days</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: APPEARANCE */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-[#1e293b] tracking-tight">
              Appearance
            </h2>
            <p className="text-[13.5px] text-[#64748b] mt-1 leading-relaxed">
              Choose the colors used throughout Priorities. Changes apply immediately and stay on this device.
            </p>
          </div>

          {/* Subsection: Priorities (Background & Text) */}
          <div className="space-y-3 pt-1">
            <div>
              <h3 className="text-lg font-bold text-[#1e293b]">
                Priorities
              </h3>
              <p className="text-xs text-[#64748b] mt-0.5">
                A calm space for what matters next.
              </p>
            </div>

            <div className="space-y-2">
              {/* Background color row */}
              <div className="py-2 border-b border-[#f1f5f9]">
                <div 
                  onClick={() => handleToggleColorPicker('bg')}
                  className="flex items-center justify-between cursor-pointer group"
                >
                  <span className="text-sm font-semibold text-[#1e293b]">
                    Background color
                  </span>
                  <div
                    style={{ backgroundColor: bgColor }}
                    className="w-9 h-9 rounded-xl border border-[#cbd5e1] shadow-2xs group-hover:scale-105 transition-transform"
                  />
                </div>

                {activeColorTarget === 'bg' && (
                  <div className="mt-3">
                    <ColorPickerField
                      color={bgColor}
                      onChange={handleBgColorChange}
                    />
                  </div>
                )}
              </div>

              {/* Text color row */}
              <div className="py-2 border-b border-[#f1f5f9]">
                <div 
                  onClick={() => handleToggleColorPicker('text')}
                  className="flex items-center justify-between cursor-pointer group"
                >
                  <span className="text-sm font-semibold text-[#1e293b]">
                    Text color
                  </span>
                  <div
                    style={{ backgroundColor: textColor }}
                    className="w-9 h-9 rounded-xl border border-[#cbd5e1] shadow-2xs group-hover:scale-105 transition-transform"
                  />
                </div>

                {activeColorTarget === 'text' && (
                  <div className="mt-3">
                    <ColorPickerField
                      color={textColor}
                      onChange={handleTextColorChange}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Subsection: Priority colors (Low, Medium, High) */}
          <div className="space-y-3 pt-2">
            <div>
              <h3 className="text-lg font-bold text-[#1e293b]">
                Priority colors
              </h3>
              <p className="text-xs text-[#64748b] mt-0.5">
                Choose the colors used for Low, Medium, and High priority tasks across all views.
              </p>
            </div>

            <div className="space-y-2">
              {/* Low priority */}
              <div className="py-2 border-b border-[#f1f5f9]">
                <div 
                  onClick={() => handleToggleColorPicker('low')}
                  className="flex items-center justify-between cursor-pointer group"
                >
                  <span className="text-sm font-semibold text-[#1e293b]">
                    Low priority
                  </span>
                  <div
                    style={{ backgroundColor: priorityColors.low }}
                    className="w-9 h-9 rounded-xl border border-[#cbd5e1] shadow-2xs group-hover:scale-105 transition-transform"
                  />
                </div>

                {activeColorTarget === 'low' && (
                  <div className="mt-3">
                    <ColorPickerField
                      color={priorityColors.low}
                      onChange={(hex) => handlePriorityColorChange('low', hex)}
                    />
                  </div>
                )}
              </div>

              {/* Medium priority */}
              <div className="py-2 border-b border-[#f1f5f9]">
                <div 
                  onClick={() => handleToggleColorPicker('medium')}
                  className="flex items-center justify-between cursor-pointer group"
                >
                  <span className="text-sm font-semibold text-[#1e293b]">
                    Medium priority
                  </span>
                  <div
                    style={{ backgroundColor: priorityColors.medium }}
                    className="w-9 h-9 rounded-xl border border-[#cbd5e1] shadow-2xs group-hover:scale-105 transition-transform"
                  />
                </div>

                {activeColorTarget === 'medium' && (
                  <div className="mt-3">
                    <ColorPickerField
                      color={priorityColors.medium}
                      onChange={(hex) => handlePriorityColorChange('medium', hex)}
                    />
                  </div>
                )}
              </div>

              {/* High priority */}
              <div className="py-2 border-b border-[#f1f5f9]">
                <div 
                  onClick={() => handleToggleColorPicker('high')}
                  className="flex items-center justify-between cursor-pointer group"
                >
                  <span className="text-sm font-semibold text-[#1e293b]">
                    High priority
                  </span>
                  <div
                    style={{ backgroundColor: priorityColors.high }}
                    className="w-9 h-9 rounded-xl border border-[#cbd5e1] shadow-2xs group-hover:scale-105 transition-transform"
                  />
                </div>

                {activeColorTarget === 'high' && (
                  <div className="mt-3">
                    <ColorPickerField
                      color={priorityColors.high}
                      onChange={(hex) => handlePriorityColorChange('high', hex)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Subsection: Saved themes */}
          <div className="space-y-3 pt-2">
            <div>
              <h3 className="text-lg font-bold text-[#1e293b]">
                Saved themes
              </h3>
              <p className="text-xs text-[#64748b] mt-0.5">
                Save this color pair with a name, then tap a saved theme to use it.
              </p>
            </div>

            {/* Input row */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Name this theme"
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveCurrentTheme();
                }}
                className="flex-1 bg-white rounded-xl border border-[#cbd5e1] px-4 py-2.5 text-sm text-[#1e293b] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#84a4cb]"
              />
              <button
                type="button"
                onClick={handleSaveCurrentTheme}
                className="px-5 py-2.5 rounded-xl bg-[#84a4cb] hover:bg-[#7496be] active:scale-95 text-white font-bold text-sm shadow-2xs transition-all cursor-pointer shrink-0"
              >
                + Save
              </button>
            </div>

            {/* List of saved themes */}
            <div className="space-y-2 pt-2">
              {localSavedThemes.map((theme) => {
                const isCurrent = (currentTheme.id && currentTheme.id === theme.id) ||
                  (currentTheme.bgColor === theme.bgColor && currentTheme.textColor === theme.textColor);

                return (
                  <div
                    key={theme.id}
                    onClick={() => handleApplyTheme(theme)}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#e2e8f0] hover:border-[#cbd5e1] shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Split Color Pill */}
                      <div className="w-10 h-7 rounded-lg border border-[#cbd5e1] flex overflow-hidden shrink-0 shadow-2xs">
                        <div
                          style={{ backgroundColor: theme.bgColor || '#FAF8F3' }}
                          className="w-1/2 h-full"
                        />
                        <div
                          style={{ backgroundColor: theme.textColor || '#3D4A5C' }}
                          className="w-1/2 h-full"
                        />
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[#1e293b] truncate">
                          {theme.name}
                        </h4>
                        {isCurrent && (
                          <span className="text-[11px] font-semibold text-[#64748b]">
                            Current
                          </span>
                        )}
                      </div>
                    </div>

                    {theme.isCustom && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTheme(theme.id);
                        }}
                        title="Delete theme"
                        className="p-1.5 text-[#ef4444] hover:text-[#dc2626] rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* BOTTOM ACTION: SAVE CHANGES BUTTON */}
        <div className="pt-4">
          <button
            type="button"
            onClick={handleSaveChanges}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#84a4cb] hover:bg-[#7496be] active:scale-98 text-white font-bold text-base shadow-sm transition-all cursor-pointer text-center"
          >
            Save changes
          </button>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1e293b] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-150">
          {toastMessage}
        </div>
      )}

      {/* SAMSUNG AOD & WIDGET INTERACTIVE CHECKBOX SIMULATOR MODAL */}
      {isAodModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsAodModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-[#0a0a0a] rounded-[36px] border-4 border-[#262626] shadow-2xl p-5 text-white flex flex-col max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#84a4cb]" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Galaxy S22 Ultra Simulator
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAodModalOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex p-1 bg-neutral-900 rounded-xl my-3 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveWidgetPreviewMode('aod')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeWidgetPreviewMode === 'aod'
                    ? 'bg-neutral-800 text-white font-bold shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Always On Display
              </button>
              <button
                type="button"
                onClick={() => setActiveWidgetPreviewMode('lockscreen')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeWidgetPreviewMode === 'lockscreen'
                    ? 'bg-neutral-800 text-white font-bold shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Lock Screen
              </button>
              <button
                type="button"
                onClick={() => setActiveWidgetPreviewMode('home')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeWidgetPreviewMode === 'home'
                    ? 'bg-neutral-800 text-white font-bold shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Home Widget
              </button>
            </div>

            {/* Interactive Device Screen Content */}
            <div className="flex-1 overflow-y-auto py-2 space-y-4">
              {/* Always On Display Pure Black AMOLED Mode */}
              {activeWidgetPreviewMode === 'aod' && (
                <div className="text-center space-y-3 pt-2">
                  {/* AOD Swipe / Tab Indicator */}
                  <div className="flex items-center justify-center gap-1.5 p-1 bg-neutral-900/90 rounded-full max-w-[200px] mx-auto border border-neutral-800 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setAodSubView('tasks')}
                      className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                        aodSubView === 'tasks' ? 'bg-neutral-700 text-white font-bold' : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      Tasks
                    </button>
                    <button
                      type="button"
                      onClick={() => setAodSubView('flow')}
                      className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                        aodSubView === 'flow' ? 'bg-neutral-700 text-white font-bold' : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      Flow Clock
                    </button>
                  </div>

                  {aodSubView === 'tasks' ? (
                    <div className="space-y-4 pt-2">
                      {/* Digital Clock */}
                      <div className="text-4xl font-extralight tracking-tight font-mono text-neutral-200">
                        {currentTimeStr}
                      </div>
                      <div className="text-xs text-neutral-400 -mt-2">
                        Thu, Sep 17 &bull; 85%
                      </div>

                      {/* Notification badge / label */}
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-semibold text-neutral-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#52b788] animate-pulse" />
                        Priorities &bull; Tap to check off
                      </div>

                      {/* Tasks with Interactive Checkboxes */}
                      <div className="space-y-2.5 text-left pt-1">
                        {previewTasks.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between p-3 rounded-2xl bg-neutral-950 border border-neutral-800/80 hover:border-neutral-700 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => onToggleTask && onToggleTask(t.id)}
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer active:scale-90 ${
                                  t.completed
                                    ? 'bg-[#52b788] border-[#52b788] text-white'
                                    : 'border-neutral-600 hover:border-[#52b788] bg-transparent'
                                }`}
                              >
                                {t.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </button>
                              <span
                                className={`text-xs font-medium truncate ${
                                  t.completed ? 'line-through text-neutral-500' : 'text-neutral-200'
                                }`}
                              >
                                {t.title}
                              </span>
                            </div>
                            <span className="text-[10px] text-neutral-500 shrink-0 font-mono ml-2">
                              {t.startTime}
                            </span>
                          </div>
                        ))}
                      </div>

                      <p className="text-[11px] text-neutral-500 leading-relaxed pt-1">
                        Swipe left/right on screen to toggle between Tasks and Flow Clock
                      </p>
                    </div>
                  ) : (
                    /* AOD Flow Pomodoro Clock matching video in AMOLED styling */
                    <div className="space-y-4 pt-1 flex flex-col items-center">
                      <div>
                        <div className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
                          29:58
                        </div>
                        <div className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase mt-1">
                          ROUTINE CONTINUES
                        </div>
                      </div>

                      {/* AMOLED Circular ring with dot */}
                      <div className="relative flex items-center justify-center">
                        <svg className="w-48 h-48" viewBox="0 0 200 200">
                          <circle
                            cx="100"
                            cy="100"
                            r="82"
                            stroke="#262626"
                            strokeWidth="10"
                            fill="transparent"
                          />
                          <circle
                            cx="100"
                            cy="100"
                            r="82"
                            stroke="#8da9c4"
                            strokeWidth="10"
                            strokeDasharray={2 * Math.PI * 82}
                            strokeDashoffset={2 * Math.PI * 82 * 0.9}
                            strokeLinecap="round"
                            fill="transparent"
                            className="-rotate-90 origin-center opacity-30"
                          />
                          {/* Dot at top */}
                          <circle
                            cx="100"
                            cy="18"
                            r="5"
                            fill="#8da9c4"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                          <span className="text-2xl font-bold text-white tracking-tight truncate max-w-[140px]">
                            {activeTask?.title || 'Free Time'}
                          </span>
                        </div>
                      </div>

                      {/* Saved Time Banner */}
                      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-left w-full">
                        <div className="text-sm font-bold text-white">
                          {activeTask ? 'Saved 29m 33s' : 'Free Time • Routine Continues'}
                        </div>
                        <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                          {activeTask ? `Routine continues with ${activeTask.title}.` : 'Next task scheduled for today.'}
                        </div>
                      </div>

                      {/* Complete Task Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (activeTask && onToggleTask) {
                            onToggleTask(activeTask.id, 1773);
                          }
                        }}
                        className="w-full py-3 rounded-xl bg-[#8da9c4] hover:bg-[#7d99b4] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>Complete task</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Lock Screen Mode */}
              {activeWidgetPreviewMode === 'lockscreen' && (
                <div className="space-y-3 pt-2">
                  <div className="text-center pb-2">
                    <div className="text-3xl font-bold text-white">
                      {currentTimeStr}
                    </div>
                    <div className="text-xs text-neutral-300">
                      Thursday, September 17
                    </div>
                  </div>

                  {/* Lock Screen Notification Card */}
                  <div className="bg-neutral-800/80 backdrop-blur-md rounded-2xl p-3.5 border border-neutral-700 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-neutral-400 font-semibold border-b border-neutral-700/60 pb-1.5">
                      <span>Priorities &bull; Next Tasks</span>
                      <span>Next {previewTasks.length} in Day</span>
                    </div>

                    <div className="space-y-2">
                      {previewTasks.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-neutral-900/60 border border-neutral-700/50"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => onToggleTask && onToggleTask(t.id)}
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer active:scale-90 ${
                                t.completed
                                  ? 'bg-[#52b788] border-[#52b788] text-white'
                                  : 'border-neutral-500 hover:border-[#52b788]'
                              }`}
                            >
                              {t.completed && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>
                            <span
                              className={`text-xs font-semibold truncate ${
                                t.completed ? 'line-through text-neutral-500' : 'text-neutral-100'
                              }`}
                            >
                              {t.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-400 shrink-0 font-mono">
                            {t.startTime}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Home Screen Widget Mode */}
              {activeWidgetPreviewMode === 'home' && (
                <div className="space-y-3 pt-2">
                  <div className="bg-[#faf8f3] text-[#1e293b] rounded-3xl p-4 border border-[#e2e8f0] shadow-md space-y-2.5">
                    <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#52b788]" />
                        <span className="text-xs font-bold text-[#1e293b]">
                          Next Tasks (4x2)
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-[#64748b]">
                        Next {previewTasks.length} in Day
                      </span>
                    </div>

                    <div className="space-y-2">
                      {previewTasks.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#ebe7df] shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => onToggleTask && onToggleTask(t.id)}
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer active:scale-90 ${
                                t.completed
                                  ? 'bg-[#52b788] border-[#52b788] text-white'
                                  : 'border-[#94a3b8] hover:border-[#52b788]'
                              }`}
                            >
                              {t.completed && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>
                            <span
                              className={`text-xs font-bold truncate ${
                                t.completed ? 'line-through text-[#94a3b8]' : 'text-[#1e293b]'
                              }`}
                            >
                              {t.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#64748b] shrink-0 font-mono">
                            {t.startTime}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Close */}
            <div className="pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsAodModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-98 text-white text-xs font-bold transition-all cursor-pointer text-center"
              >
                Close Simulator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
