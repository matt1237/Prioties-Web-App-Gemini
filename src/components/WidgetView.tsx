import React, { useState, useEffect, useMemo } from 'react';
import { 
  Check, 
  Smartphone, 
  Plus, 
  ChevronRight, 
  ShieldCheck,
  Maximize2,
  Sliders,
  Sparkles,
  Clock
} from 'lucide-react';
import { Task } from '../types';
import { 
  parseTimeToSeconds, 
  formatSecondsToDigital, 
  formatSecondsToSavedDisplay,
  formatSecondsToHHMM,
  formatLocalDateToIso
} from '../utils/time';

export type WidgetSizePreset = '2x2' | '4x1' | '4x2' | '4x3' | '4x4' | 'custom';

interface WidgetViewProps {
  tasks: Task[];
  activeTask?: Task | null;
  onToggleTask: (taskId: string, timeSavedSeconds?: number) => void;
  onStartFlowWithTask?: (taskId: string) => void;
}

export const WidgetView: React.FC<WidgetViewProps> = ({
  tasks,
  activeTask = null,
  onToggleTask,
  onStartFlowWithTask,
}) => {
  const [widgetMode, setWidgetMode] = useState<'home' | 'lockscreen' | 'aod'>('home');
  const [widgetTab, setWidgetTab] = useState<'checklist' | 'flow'>('checklist');
  const [isAddedToast, setIsAddedToast] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Widget custom size states with local persistence
  const [sizePreset, setSizePreset] = useState<WidgetSizePreset>(() => {
    return (localStorage.getItem('priorities_widget_size_preset') as WidgetSizePreset) || '4x2';
  });
  const [customWidth, setCustomWidth] = useState<number>(() => {
    const saved = localStorage.getItem('priorities_widget_custom_w');
    return saved ? parseInt(saved, 10) : 440;
  });
  const [customHeight, setCustomHeight] = useState<number>(() => {
    const saved = localStorage.getItem('priorities_widget_custom_h');
    return saved ? parseInt(saved, 10) : 290;
  });
  const [showCustomSliders, setShowCustomSliders] = useState(false);

  // Accurate real-time clock ticker updating every second
  const [currentClockSec, setCurrentClockSec] = useState(() => {
    const d = new Date();
    return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  });

  useEffect(() => {
    const update = () => {
      const d = new Date();
      setCurrentClockSec(d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds());
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayIsoStr = formatLocalDateToIso(new Date());

  // Next tasks in the day, if available (up to 3)
  const nextThreeTasks = useMemo(() => {
    const todayTasks = tasks.filter(
      t => t.date === todayIsoStr || !t.date || t.date === '2026-09-17'
    );
    const pool = todayTasks.length > 0 ? todayTasks : tasks;
    if (pool.length === 0) return [];

    const sorted = [...pool].sort(
      (a, b) => parseTimeToSeconds(a.startTime) - parseTimeToSeconds(b.startTime)
    );

    const uncompleted = sorted.filter(t => !t.completed);
    if (uncompleted.length > 0) {
      return uncompleted.slice(0, 3);
    }
    return sorted.slice(-3);
  }, [tasks, todayIsoStr]);

  // Pomodoro Task & Free Time evaluation
  const currentHappeningTask = useMemo(() => {
    return tasks.find(t => {
      if (t.completed) return false;
      const startSec = parseTimeToSeconds(t.startTime);
      const durSec = (t.durationMinutes || 15) * 60;
      const endSec = parseTimeToSeconds(t.endTime) || (startSec + durSec);
      return startSec <= currentClockSec && currentClockSec < endSec;
    });
  }, [tasks, currentClockSec]);

  // Active task is either user-selected in flow (if uncompleted) or currently happening
  const activeCurrentTask = (activeTask && !activeTask.completed) ? activeTask : (currentHappeningTask || null);
  const isFreeTime = !activeCurrentTask;

  // Next upcoming task for today after current time
  const nextUpcomingTask = useMemo(() => {
    const upcomingToday = tasks
      .filter(t => !t.completed && parseTimeToSeconds(t.startTime) > currentClockSec)
      .sort((a, b) => parseTimeToSeconds(a.startTime) - parseTimeToSeconds(b.startTime));
    return upcomingToday[0] || null;
  }, [tasks, currentClockSec]);

  // Compute accurate display values for Pomodoro widget
  let activeTaskTitle = 'Free Time';
  let digitalTimerStr = '00:00';
  let secondsTickingStr = '00';
  let subtitleStr = 'ROUTINE CONTINUES';
  let savedBannerMain = 'Saved 0s';
  let savedBannerSub = 'Routine continues.';
  let progressRatio = 0.5;

  if (!isFreeTime && activeCurrentTask) {
    // Active task in progress
    activeTaskTitle = activeCurrentTask.title;
    const startSec = parseTimeToSeconds(activeCurrentTask.startTime);
    const durSec = (activeCurrentTask.durationMinutes || 15) * 60;
    const endSec = parseTimeToSeconds(activeCurrentTask.endTime) || (startSec + durSec);
    const remainingSec = Math.max(0, endSec - currentClockSec);
    
    digitalTimerStr = formatSecondsToDigital(remainingSec);
    secondsTickingStr = Math.floor(remainingSec % 60).toString().padStart(2, '0');
    subtitleStr = `ROUTINE IN PROGRESS • UNTIL ${activeCurrentTask.endTime || formatSecondsToDigital(endSec)}`;
    progressRatio = Math.min(1, Math.max(0, (currentClockSec - startSec) / Math.max(1, durSec)));
    savedBannerMain = `Saved ${formatSecondsToSavedDisplay(remainingSec)}`;
    savedBannerSub = `Routine continues with ${activeTaskTitle}.`;
  } else {
    // Free Time: user requested that it displays "Free Time" with time equaling HH:MM until next task starts
    activeTaskTitle = 'Free Time';
    if (nextUpcomingTask) {
      const nextStartSec = parseTimeToSeconds(nextUpcomingTask.startTime);
      const freeSec = Math.max(0, nextStartSec - currentClockSec);
      
      // Exact HH:MM until next task starts
      digitalTimerStr = formatSecondsToHHMM(freeSec);
      secondsTickingStr = Math.floor(freeSec % 60).toString().padStart(2, '0');
      subtitleStr = `FREE TIME UNTIL ${nextUpcomingTask.startTime}`;
      
      const freeHours = Math.floor(freeSec / 3600);
      const freeMins = Math.floor((freeSec % 3600) / 60);
      const freeTimeFormatted = freeHours > 0 ? `${freeHours}h ${freeMins}m` : `${freeMins}m`;

      savedBannerMain = `Free Time: ${freeTimeFormatted}`;
      savedBannerSub = `Next task "${nextUpcomingTask.title}" starts at ${nextUpcomingTask.startTime}.`;
      progressRatio = 0.75;
    } else {
      digitalTimerStr = '--:--';
      secondsTickingStr = '00';
      subtitleStr = 'ALL TASKS COMPLETED FOR TODAY';
      savedBannerMain = 'Free for the day';
      savedBannerSub = 'All scheduled tasks completed. Enjoy your free time!';
      progressRatio = 1;
    }
  }

  // Size preset handlers
  const handleSelectPreset = (preset: WidgetSizePreset) => {
    setSizePreset(preset);
    localStorage.setItem('priorities_widget_size_preset', preset);
    if (preset === '2x2') {
      setCustomWidth(280);
      setCustomHeight(260);
    } else if (preset === '4x1') {
      setCustomWidth(440);
      setCustomHeight(140);
    } else if (preset === '4x2') {
      setCustomWidth(440);
      setCustomHeight(290);
    } else if (preset === '4x3') {
      setCustomWidth(440);
      setCustomHeight(380);
    } else if (preset === '4x4') {
      setCustomWidth(440);
      setCustomHeight(480);
    }
  };

  const handleCustomWidthChange = (val: number) => {
    setSizePreset('custom');
    setCustomWidth(val);
    localStorage.setItem('priorities_widget_size_preset', 'custom');
    localStorage.setItem('priorities_widget_custom_w', val.toString());
  };

  const handleCustomHeightChange = (val: number) => {
    setSizePreset('custom');
    setCustomHeight(val);
    localStorage.setItem('priorities_widget_size_preset', 'custom');
    localStorage.setItem('priorities_widget_custom_h', val.toString());
  };

  const handleAddToHomeScreen = () => {
    setIsAddedToast(true);
    setTimeout(() => setIsAddedToast(false), 3000);
  };

  // Swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    // Swipe left -> flow, Swipe right -> checklist
    if (diff > 40) {
      setWidgetTab('flow');
    } else if (diff < -40) {
      setWidgetTab('checklist');
    }
    setTouchStartX(null);
  };

  // Dimensions for live widget card
  const isCompactHeight = customHeight <= 170; // 4x1 or short
  const isSquareWidth = customWidth <= 300;   // 2x2 or narrow

  return (
    <div className="flex-1 flex flex-col px-3 sm:px-4 pt-2 pb-24 max-w-lg mx-auto w-full space-y-4">
      {/* Subtitle */}
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-[#1b4332]">
          Stay on top of your day without opening the app.
        </p>
        <p className="text-xs text-[#52796f]">
          Interactive resizable widget with accurate Flow Pomodoro & Free Time clock
        </p>
      </div>

      {/* Widget Target Selector (Home, Lockscreen, AOD) */}
      <div className="flex p-1 bg-[#dbeedc] rounded-2xl shadow-inner text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setWidgetMode('home')}
          className={`flex-1 py-1.5 px-3 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            widgetMode === 'home' ? 'bg-white text-[#1b4332] shadow-xs font-bold' : 'text-[#3e694e]'
          }`}
        >
          Home Screen
        </button>
        <button
          onClick={() => setWidgetMode('lockscreen')}
          className={`flex-1 py-1.5 px-3 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            widgetMode === 'lockscreen' ? 'bg-white text-[#1b4332] shadow-xs font-bold' : 'text-[#3e694e]'
          }`}
        >
          Lock Screen
        </button>
        <button
          onClick={() => setWidgetMode('aod')}
          className={`flex-1 py-1.5 px-3 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            widgetMode === 'aod' ? 'bg-white text-[#1b4332] shadow-xs font-bold' : 'text-[#3e694e]'
          }`}
        >
          Samsung AOD
        </button>
      </div>

      {/* WIDGET SIZE & CUSTOMIZATION CONTROLS */}
      <div className="bg-[#e7f3e8] p-3 rounded-2xl border border-[#c5e4cb] shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#1b4332]">
            <Maximize2 className="w-3.5 h-3.5 text-[#52b788]" />
            <span>Widget Size ({sizePreset.toUpperCase()})</span>
          </div>
          <button
            type="button"
            onClick={() => setShowCustomSliders(!showCustomSliders)}
            className="text-[11px] font-semibold text-[#2d6a4f] hover:text-[#1b4332] flex items-center gap-1 cursor-pointer"
          >
            <Sliders className="w-3 h-3" />
            <span>{showCustomSliders ? 'Hide Sliders' : 'Custom Sliders'}</span>
          </button>
        </div>

        {/* Preset Buttons */}
        <div className="grid grid-cols-6 gap-1 text-[11px] font-bold">
          {(['2x2', '4x1', '4x2', '4x3', '4x4', 'custom'] as const).map(preset => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                handleSelectPreset(preset);
                if (preset === 'custom') setShowCustomSliders(true);
              }}
              className={`py-1.5 px-1 text-center rounded-xl transition-all cursor-pointer ${
                sizePreset === preset
                  ? 'bg-[#1b4332] text-white shadow-xs'
                  : 'bg-white/80 text-[#2d6a4f] hover:bg-white'
              }`}
            >
              {preset === 'custom' ? 'Custom' : preset}
            </button>
          ))}
        </div>

        {/* Custom Width & Height Sliders */}
        {(showCustomSliders || sizePreset === 'custom') && (
          <div className="pt-2 border-t border-[#c2e2c8] space-y-2 text-xs text-[#1b4332]">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Width: {customWidth}px</span>
              <input
                type="range"
                min="260"
                max="500"
                step="10"
                value={customWidth}
                onChange={(e) => handleCustomWidthChange(Number(e.target.value))}
                className="w-36 sm:w-48 accent-[#52b788] cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Height: {customHeight}px</span>
              <input
                type="range"
                min="130"
                max="520"
                step="10"
                value={customHeight}
                onChange={(e) => handleCustomHeightChange(Number(e.target.value))}
                className="w-36 sm:w-48 accent-[#52b788] cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between pt-1 text-[10px] text-[#52796f]">
              <span>Preview adjusts live to your custom dimensions.</span>
              <button
                type="button"
                onClick={() => handleSelectPreset('4x2')}
                className="underline font-semibold cursor-pointer"
              >
                Reset to standard 4x2
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Swipe Switcher Tabs */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold text-[#52796f] uppercase tracking-wider">
          Widget View (Swipe to switch)
        </span>
        <div className="inline-flex p-0.5 bg-[#dbeedc] rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setWidgetTab('checklist')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              widgetTab === 'checklist' ? 'bg-white text-[#1b4332] shadow-2xs font-bold' : 'text-[#3e694e]'
            }`}
          >
            Checklist
          </button>
          <button
            type="button"
            onClick={() => setWidgetTab('flow')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              widgetTab === 'flow' ? 'bg-white text-[#1b4332] shadow-2xs font-bold' : 'text-[#3e694e]'
            }`}
          >
            Flow Pomodoro
          </button>
        </div>
      </div>

      {/* LIVE PREVIEW CONTAINER WITH CUSTOM SIZE */}
      <div className="flex justify-center w-full overflow-hidden py-1">
        <div
          id="widget-card"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            width: sizePreset === '2x2' ? '280px' : (sizePreset === 'custom' ? `${customWidth}px` : '100%'),
            maxWidth: sizePreset === 'custom' ? `${customWidth}px` : '100%',
            minHeight: `${customHeight}px`,
          }}
          className={`relative rounded-3xl p-4 sm:p-5 shadow-xl border transition-all duration-200 overflow-hidden select-none flex flex-col justify-between ${
            widgetMode === 'aod'
              ? 'bg-black text-white border-neutral-800'
              : widgetMode === 'lockscreen'
              ? 'bg-[#1b4332]/90 text-white backdrop-blur-md border-[#52b788]/30'
              : 'bg-[#edf7ee] text-[#1b4332] border-[#c2e2c8]'
          }`}
        >
          {/* Top Widget Bar */}
          <div className="flex items-center justify-between pb-2 border-b border-current/10">
            <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-70 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${widgetMode === 'aod' ? 'bg-[#52b788]' : 'bg-[#2d6a4f]'}`} />
              <span>{sizePreset.toUpperCase()} WIDGET</span>
            </span>
            <span className="text-[10px] font-mono opacity-80 flex items-center gap-1">
              <Smartphone className="w-3 h-3" />
              <span>{customWidth}×{customHeight}px</span>
            </span>
          </div>

          {/* MAIN WIDGET CONTENT AREA */}
          <div className="flex-1 flex flex-col justify-center py-2">
            {widgetTab === 'checklist' ? (
              /* TAB 1: UPCOMING CHECKLIST */
              <div className="space-y-2.5">
                {/* Checklist Header (No current time display) */}
                {!isCompactHeight && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-bold tracking-tight">
                        Next Tasks
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        widgetMode === 'aod'
                          ? 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                          : widgetMode === 'lockscreen'
                          ? 'bg-white/20 text-white border border-white/20'
                          : 'bg-[#dbeedc] text-[#1b4332] border border-[#c2e2c8]'
                      }`}>
                        {nextThreeTasks.length > 0 ? `${nextThreeTasks.length} in queue` : 'Today'}
                      </span>
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-70 flex items-center gap-0.5">
                      <span>TODAY</span>
                      <ChevronRight className="w-3 h-3 opacity-60" />
                    </div>
                  </div>
                )}

                {/* Tasks List inside widget - adapts to height and width */}
                <div className="space-y-1.5">
                  {nextThreeTasks.length === 0 ? (
                    <div className="py-4 px-3 text-center rounded-xl border border-dashed border-current/20 bg-black/5">
                      <p className="text-xs font-semibold">No tasks scheduled</p>
                      <p className="text-[10px] opacity-70 mt-0.5">Plan tasks in Daily Plan</p>
                    </div>
                  ) : (
                    // In compact height (4x1), show only the 1st next task
                    (isCompactHeight ? nextThreeTasks.slice(0, 1) : (isSquareWidth ? nextThreeTasks.slice(0, 2) : nextThreeTasks)).map((t) => (
                      <div
                        key={t.id}
                        className={`flex items-center justify-between p-2.5 rounded-2xl transition-all ${
                          widgetMode === 'aod'
                            ? 'bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700'
                            : widgetMode === 'lockscreen'
                            ? 'bg-white/10 border border-white/10 hover:bg-white/15'
                            : 'bg-white border border-[#d8edd9] shadow-xs hover:border-[#a8d5b1]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => onToggleTask(t.id)}
                            aria-label={`Toggle task ${t.title}`}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer active:scale-90 ${
                              t.completed
                                ? 'bg-[#52b788] border-[#52b788] text-white'
                                : widgetMode === 'aod'
                                ? 'border-neutral-500 hover:border-[#52b788] bg-transparent'
                                : 'border-[#94cfa5] hover:border-[#52b788] bg-white'
                            }`}
                          >
                            {t.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <span className={`text-xs font-semibold truncate block ${
                              t.completed ? 'line-through opacity-50' : ''
                            }`}>
                              {t.title}
                            </span>
                            {t.durationMinutes && !isCompactHeight && (
                              <span className="text-[9px] opacity-60 block">
                                {t.durationMinutes}m
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="text-[10px] opacity-75 shrink-0 font-mono pl-2 font-medium">
                          {t.startTime}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {!isCompactHeight && (
                  <div className="flex items-center justify-center gap-1 text-[10px] opacity-75 text-center font-medium pt-0.5">
                    <Check className="w-3 h-3 text-[#52b788]" />
                    <span>Next {nextThreeTasks.length || 3} tasks &bull; Tap to check off</span>
                  </div>
                )}
              </div>
            ) : (
              /* TAB 2: FLOW POMODORO & FREE TIME CLOCK */
              isCompactHeight ? (
                /* Compact Strip Layout for 4x1 or short widgets */
                <div className="flex items-center justify-between gap-3 py-1">
                  <div className="relative flex items-center justify-center shrink-0">
                    <svg className="w-14 h-14" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke={widgetMode === 'aod' ? '#262626' : '#d5e4da'}
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#52b788"
                        strokeWidth="8"
                        strokeDasharray={2 * Math.PI * 40}
                        strokeDashoffset={2 * Math.PI * 40 * (1 - progressRatio)}
                        strokeLinecap="round"
                        fill="transparent"
                        className="-rotate-90 origin-center"
                      />
                    </svg>
                    <Clock className="w-4 h-4 absolute opacity-70" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold tracking-tight font-sans">
                        {digitalTimerStr}
                      </span>
                      <span className="text-[11px] font-mono opacity-60">:{secondsTickingStr}</span>
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-75 truncate">
                      {activeTaskTitle} {isFreeTime && nextUpcomingTask ? `• Next at ${nextUpcomingTask.startTime}` : ''}
                    </div>
                  </div>

                  {activeCurrentTask && (
                    <button
                      type="button"
                      onClick={() => onToggleTask(activeCurrentTask.id, 1773)}
                      className="py-1.5 px-3 rounded-xl bg-[#52b788] hover:bg-[#40916c] text-white font-bold text-xs shrink-0 cursor-pointer active:scale-95"
                    >
                      Done
                    </button>
                  )}
                </div>
              ) : (
                /* Standard & Tall Layout with Circular Clock */
                <div className="space-y-3 flex flex-col items-center">
                  {/* Digital Clock Header with accurate HH:MM and seconds */}
                  <div className="text-center">
                    <div className="flex items-baseline justify-center gap-1 font-sans">
                      <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                        {digitalTimerStr}
                      </span>
                      <span className="text-xs sm:text-sm font-mono opacity-50 font-bold">
                        :{secondsTickingStr}
                      </span>
                    </div>
                    <div className="text-[10px] font-bold tracking-widest opacity-60 uppercase mt-0.5">
                      {subtitleStr}
                    </div>
                  </div>

                  {/* Circular Ring with Dot */}
                  <div className="relative flex items-center justify-center">
                    <svg 
                      className={isSquareWidth ? "w-32 h-32" : "w-36 h-36 sm:w-40 sm:h-40"} 
                      viewBox="0 0 200 200"
                    >
                      <circle
                        cx="100"
                        cy="100"
                        r="80"
                        stroke={widgetMode === 'aod' ? '#262626' : '#d5e4da'}
                        strokeWidth="11"
                        fill="transparent"
                      />
                      <circle
                        cx="100"
                        cy="100"
                        r="80"
                        stroke={isFreeTime ? '#52b788' : '#8da9c4'}
                        strokeWidth="11"
                        strokeDasharray={2 * Math.PI * 80}
                        strokeDashoffset={2 * Math.PI * 80 * (1 - progressRatio)}
                        strokeLinecap="round"
                        fill="transparent"
                        className="-rotate-90 origin-center transition-all duration-300"
                      />
                      {/* Top indicator dot */}
                      <circle
                        cx="100"
                        cy="20"
                        r="5.5"
                        fill={isFreeTime ? '#52b788' : '#8da9c4'}
                      />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                      <span className="text-xl sm:text-2xl font-bold tracking-tight text-center truncate max-w-[130px]">
                        {activeTaskTitle}
                      </span>
                      {isFreeTime && nextUpcomingTask && (
                        <span className="text-[10px] opacity-70 font-mono mt-0.5">
                          until {nextUpcomingTask.startTime}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Banner */}
                  <div className={`w-full rounded-2xl p-2.5 sm:p-3 text-left border ${
                    widgetMode === 'aod' 
                      ? 'bg-neutral-900 border-neutral-800' 
                      : widgetMode === 'lockscreen'
                      ? 'bg-white/10 border-white/15'
                      : 'bg-white/80 border-[#c5e4cb]'
                  }`}>
                    <div className="text-xs sm:text-sm font-bold flex items-center justify-between">
                      <span>{savedBannerMain}</span>
                      {isFreeTime && <Sparkles className="w-3.5 h-3.5 text-[#52b788]" />}
                    </div>
                    <div className="text-[10px] opacity-75 truncate mt-0.5">
                      {savedBannerSub}
                    </div>
                  </div>

                  {/* Complete Task Button or Caught Up info */}
                  {activeCurrentTask ? (
                    <button
                      type="button"
                      onClick={() => onToggleTask(activeCurrentTask.id, 1773)}
                      className="w-full py-2.5 sm:py-3 rounded-2xl bg-[#8da9c4] hover:bg-[#7d99b4] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-98"
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Complete task</span>
                    </button>
                  ) : nextUpcomingTask ? (
                    <div className="w-full py-2.5 text-center text-xs opacity-85 font-semibold">
                      Next up: {nextUpcomingTask.title} at {nextUpcomingTask.startTime}
                    </div>
                  ) : (
                    <div className="w-full py-2 text-center text-xs opacity-75 font-semibold">
                      ✨ You're all caught up for today.
                    </div>
                  )}
                </div>
              )
            )}
          </div>

          {/* Widget Bottom: Swipe Indicators */}
          <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-current/10">
            <button
              type="button"
              onClick={() => setWidgetTab('checklist')}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                widgetTab === 'checklist' ? 'bg-current w-4' : 'bg-current/30 w-1.5'
              }`}
              aria-label="Checklist tab"
            />
            <button
              type="button"
              onClick={() => setWidgetTab('flow')}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                widgetTab === 'flow' ? 'bg-current w-4' : 'bg-current/30 w-1.5'
              }`}
              aria-label="Flow Pomodoro tab"
            />
          </div>
        </div>
      </div>

      {/* Button: + Add to home screen */}
      <button
        onClick={handleAddToHomeScreen}
        className="w-full py-3.5 px-4 bg-[#52b788] hover:bg-[#40916c] active:scale-98 text-white font-bold text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
        <span>+ Add to home screen ({sizePreset.toUpperCase()})</span>
      </button>

      {isAddedToast && (
        <div className="p-3 bg-[#2d6a4f] text-white text-xs font-semibold rounded-xl text-center shadow-lg animate-in fade-in duration-200">
          ✨ {sizePreset.toUpperCase()} Widget ({customWidth}×{customHeight}px) pinned to Home Screen preview!
        </div>
      )}

      {/* Android Studio & APK Guidance Box */}
      <div className="bg-white rounded-2xl p-4 border border-[#d8edd9] shadow-xs space-y-2.5 text-xs text-[#2d5a3f]">
        <div className="flex items-center gap-2 text-sm font-bold text-[#1b4332]">
          <ShieldCheck className="w-4 h-4 text-[#52b788]" />
          <span>Samsung Galaxy S22 Ultra APK & Widget Details</span>
        </div>
        <p className="text-[#52796f] leading-relaxed">
          The app is configured for Android (<code>com.priorities.app</code>) with AppWidgetProvider metadata supporting standard grid sizes (2x2, 4x1, 4x2, 4x3, 4x4) and free-form resizing. Swipe left/right anytime to flip between the upcoming task list and the accurate Pomodoro/Free Time clock.
        </p>
      </div>
    </div>
  );
};
