import React, { useState, useEffect, useMemo } from 'react';
import { 
  Check, 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  Calendar, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';
import { Task, ThemeConfig } from '../types';
import { retroAudio } from '../utils/retroAudio';
import { getPriorityColorStyle } from '../utils/priorityColors';
import { 
  parseTimeToSeconds, 
  formatSecondsToDigital, 
  formatSecondsToSavedDisplay, 
  formatLocalDateToIso 
} from '../utils/time';

export { parseTimeToSeconds };

interface FlowViewProps {
  activeTask: Task | null;
  allTasks: Task[];
  upcomingTasks: Task[];
  currentTheme?: ThemeConfig;
  onCompleteTask: (taskId: string, timeSavedSeconds?: number) => void;
  onSelectNextTask: (task: Task) => void;
  onRecordTimeSaved?: (record: { taskId: string; taskTitle: string; secondsSaved: number }) => void;
  onNavigateToDailyPlan?: () => void;
}

interface ManualSession {
  taskId: string;
  startedAtSeconds: number;
  durationSeconds: number;
}

export const FlowView: React.FC<FlowViewProps> = ({
  activeTask,
  allTasks,
  upcomingTasks,
  currentTheme,
  onCompleteTask,
  onSelectNextTask,
  onRecordTimeSaved,
  onNavigateToDailyPlan,
}) => {
  // Live wall-clock time updated every second directly from the user's system clock
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Current time in seconds from midnight (e.g. 9:12:00 AM = 9 * 3600 + 12 * 60 = 33120s)
  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const todayIsoStr = formatLocalDateToIso(now);

  // Filter uncompleted tasks for today (or fallback to all uncompleted tasks)
  const uncompletedTasks = useMemo(() => {
    const forToday = allTasks.filter(
      t => !t.completed && (t.date === todayIsoStr || !t.date || t.date === '2026-09-17')
    );
    const pool = forToday.length > 0 ? forToday : allTasks.filter(t => !t.completed);
    return pool.sort((a, b) => parseTimeToSeconds(a.startTime) - parseTimeToSeconds(b.startTime));
  }, [allTasks, todayIsoStr]);

  // Helper to compute start & end seconds for any task
  const getTaskSecondsWindow = (t: Task) => {
    const startSec = parseTimeToSeconds(t.startTime);
    let endSec = parseTimeToSeconds(t.endTime);
    const durSec = Math.max(60, (t.durationMinutes || 15) * 60);
    if (!endSec || endSec <= startSec) {
      endSec = startSec + durSec;
    }
    if (endSec < startSec) {
      endSec += 86400; // crosses midnight
    }
    return { startSec, endSec, durSec };
  };

  // 1. Task happening RIGHT NOW based on user's wall-clock time
  const timeHappeningTask = useMemo(() => {
    return uncompletedTasks.find(t => {
      const { startSec, endSec } = getTaskSecondsWindow(t);
      // Handle midnight wrap if applicable
      const effNow = (endSec > 86400 && nowSeconds < startSec) ? nowSeconds + 86400 : nowSeconds;
      return startSec <= effNow && effNow < endSec;
    }) || null;
  }, [uncompletedTasks, nowSeconds]);

  // 2. Next scheduled task starting in the future
  const nextScheduledTask = useMemo(() => {
    return uncompletedTasks.find(t => {
      const { startSec } = getTaskSecondsWindow(t);
      return startSec > nowSeconds;
    }) || null;
  }, [uncompletedTasks, nowSeconds]);

  // Track explicit manual selections & early starts
  const [explicitTaskId, setExplicitTaskId] = useState<string | null>(null);
  const [manualSession, setManualSession] = useState<ManualSession | null>(null);

  // Sync with activeTask prop when explicitly requested externally
  useEffect(() => {
    if (activeTask && !activeTask.completed) {
      setExplicitTaskId(activeTask.id);
    }
  }, [activeTask?.id, activeTask?.completed]);

  // Explicitly chosen task
  const explicitTask = uncompletedTasks.find(t => t.id === explicitTaskId) || null;

  // Determine current effective task and flow state:
  // Priority:
  // 1. All done: No uncompleted tasks left
  // 2. Task happening right now based on user's clock
  // 3. Explicitly chosen task (if user manually clicked "Start task now" or "Play")
  // 4. Countdown to next scheduled task
  // 5. Uncompleted task from earlier today
  let flowState: 'active_task' | 'countdown_to_next' | 'all_done' = 'all_done';
  let currentTask: Task | null = null;
  let targetNextTask: Task | null = null;

  if (uncompletedTasks.length === 0) {
    flowState = 'all_done';
  } else if (timeHappeningTask) {
    // Current clock is within this task's scheduled start and end time!
    flowState = 'active_task';
    currentTask = timeHappeningTask;
  } else if (explicitTask && manualSession && manualSession.taskId === explicitTask.id) {
    // User explicitly started this task early
    flowState = 'active_task';
    currentTask = explicitTask;
  } else if (nextScheduledTask) {
    // No task happening right now, but a task is scheduled later
    flowState = 'countdown_to_next';
    targetNextTask = nextScheduledTask;
  } else if (explicitTask) {
    flowState = 'active_task';
    currentTask = explicitTask;
  } else {
    // Fallback: earliest uncompleted task
    flowState = 'active_task';
    currentTask = uncompletedTasks[0];
  }

  // Pause / Resume state
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [pausedRemainingSec, setPausedRemainingSec] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCompletedToast, setIsCompletedToast] = useState<boolean>(false);

  // Compute live timing for current task strictly from wall-clock time
  const taskTiming = useMemo(() => {
    if (!currentTask) {
      return {
        totalDurationSec: 900,
        elapsedSec: 0,
        remainingSec: 0,
        progressRatio: 0,
      };
    }

    const { startSec, endSec, durSec } = getTaskSecondsWindow(currentTask);
    const totalDurationSec = Math.max(60, endSec - startSec);

    // If task has a manual early start active
    if (manualSession && manualSession.taskId === currentTask.id) {
      const elapsedSec = Math.max(0, nowSeconds - manualSession.startedAtSeconds);
      const remainingSec = Math.max(0, manualSession.durationSeconds - elapsedSec);
      const progressRatio = Math.max(0, Math.min(1, elapsedSec / manualSession.durationSeconds));
      return {
        totalDurationSec: manualSession.durationSeconds,
        elapsedSec,
        remainingSec,
        progressRatio,
      };
    }

    // Standard clock-based calculation:
    // E.g. Shower at 9:00 AM, ends 9:15 AM. User clock is 9:12:00 AM -> remaining is 3m 0s (180s)!
    const effNow = (endSec > 86400 && nowSeconds < startSec) ? nowSeconds + 86400 : nowSeconds;

    if (startSec <= effNow && effNow < endSec) {
      // In progress on the user's clock
      const elapsedSec = effNow - startSec;
      const remainingSec = Math.max(0, endSec - effNow);
      const progressRatio = Math.max(0, Math.min(1, elapsedSec / totalDurationSec));
      return {
        totalDurationSec,
        elapsedSec,
        remainingSec,
        progressRatio,
      };
    } else if (effNow >= endSec) {
      // Past the scheduled end time
      return {
        totalDurationSec,
        elapsedSec: totalDurationSec,
        remainingSec: 0,
        progressRatio: 1,
      };
    } else {
      // Upcoming task that user opened in active mode
      return {
        totalDurationSec,
        elapsedSec: 0,
        remainingSec: totalDurationSec,
        progressRatio: 0,
      };
    }
  }, [currentTask, nowSeconds, manualSession]);

  // Effective seconds remaining considering pause state
  const effectiveRemainingSec = isPaused && pausedRemainingSec !== null 
    ? pausedRemainingSec 
    : taskTiming.remainingSec;

  const effectiveProgressRatio = isPaused && pausedRemainingSec !== null && taskTiming.totalDurationSec > 0
    ? Math.max(0, Math.min(1, 1 - (pausedRemainingSec / taskTiming.totalDurationSec)))
    : taskTiming.progressRatio;

  // Countdown to next scheduled task
  const secondsUntilNextStart = targetNextTask 
    ? Math.max(0, parseTimeToSeconds(targetNextTask.startTime) - nowSeconds)
    : 0;

  // When countdown to next task hits 0, auto-transition to active task!
  useEffect(() => {
    if (flowState === 'countdown_to_next' && targetNextTask && secondsUntilNextStart === 0) {
      setExplicitTaskId(targetNextTask.id);
      onSelectNextTask(targetNextTask);
    }
  }, [flowState, targetNextTask, secondsUntilNextStart, onSelectNextTask]);

  // Formatted digital strings
  const formattedActiveTime = formatSecondsToDigital(effectiveRemainingSec);
  const formattedCountdownTime = formatSecondsToDigital(secondsUntilNextStart);
  const savedTimeLabel = formatSecondsToSavedDisplay(effectiveRemainingSec);

  // Circular progress calculations for the 280x280 SVG ring
  const activeProgressRatio = flowState === 'countdown_to_next'
    ? Math.max(0, Math.min(1, 1 - (secondsUntilNextStart / 1800))) // 30-min window for countdown ring
    : effectiveProgressRatio;

  // Angle for indicator dot on ring: -90 deg is top (12 o'clock)
  const angleDeg = -90 + activeProgressRatio * 360;
  const angleRad = (angleDeg * Math.PI) / 180;
  const radius = 115;
  const center = 140;
  const dotX = center + radius * Math.cos(angleRad);
  const dotY = center + radius * Math.sin(angleRad);

  // Find next task in routine or list
  const nextTaskInRoutine = useMemo(() => {
    if (!currentTask) return uncompletedTasks[0] || null;

    if (currentTask.routineId) {
      const routineNext = uncompletedTasks.find(
        t => t.routineId === currentTask?.routineId && t.id !== currentTask?.id
      );
      if (routineNext) return routineNext;
    }

    return uncompletedTasks.find(t => t.id !== currentTask?.id) || null;
  }, [currentTask, uncompletedTasks]);

  // Toggle run / pause
  const toggleRun = () => {
    if (!isPaused) {
      setPausedRemainingSec(effectiveRemainingSec);
      setIsPaused(true);
    } else {
      setIsPaused(false);
      setPausedRemainingSec(null);
    }
  };

  // Reset timer to full duration
  const resetTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPaused(true);
    setPausedRemainingSec(taskTiming.totalDurationSec);
  };

  // Start task early from countdown or manual trigger
  const handleStartTaskEarly = (task: Task) => {
    const durSec = Math.max(60, (task.durationMinutes || 15) * 60);
    setManualSession({
      taskId: task.id,
      startedAtSeconds: nowSeconds,
      durationSeconds: durSec,
    });
    setExplicitTaskId(task.id);
    setIsPaused(false);
    setPausedRemainingSec(null);
    onSelectNextTask(task);

    try {
      retroAudio.resume();
      retroAudio.playBubblePop('pop', 1.0);
    } catch {}
  };

  // Complete current task and advance routine
  const handleCompleteCurrentTask = () => {
    if (!currentTask) return;

    try {
      retroAudio.resume();
      retroAudio.playBubblePop('pop', 1.0);
    } catch {}

    const finishedTask = currentTask;
    const secondsSaved = effectiveRemainingSec;

    // Record time saved & mark task complete in App state
    onCompleteTask(finishedTask.id, secondsSaved);
    if (onRecordTimeSaved) {
      onRecordTimeSaved({
        taskId: finishedTask.id,
        taskTitle: finishedTask.title,
        secondsSaved,
      });
    }

    // Reset manual session
    setManualSession(null);
    setIsPaused(false);
    setPausedRemainingSec(null);

    // If there is a next task in the routine, advance to it
    if (nextTaskInRoutine) {
      setExplicitTaskId(nextTaskInRoutine.id);
      onSelectNextTask(nextTaskInRoutine);

      const savedMsg = secondsSaved > 0 ? `Saved ${formatSecondsToSavedDisplay(secondsSaved)}! ` : '';
      setToastMessage(`✓ ${finishedTask.title} complete! ${savedMsg}Continuing with ${nextTaskInRoutine.title}`);
    } else {
      setExplicitTaskId(null);
      setToastMessage(`🎉 All scheduled tasks completed!`);
    }

    setIsCompletedToast(true);
    setTimeout(() => setIsCompletedToast(false), 3500);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between px-6 pt-5 pb-24 max-w-md mx-auto w-full select-none min-h-[calc(100vh-80px)]">
      {/* CASE 1: ALL TASKS COMPLETED */}
      {flowState === 'all_done' && (
        <div className="flex-1 flex flex-col items-center justify-center w-full my-auto space-y-6 text-center">
          <div className="w-20 h-20 rounded-full bg-[#eaf5ec] border border-[#cbe5d0] flex items-center justify-center text-[#2d5a3f] shadow-xs">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-[#1e293b] tracking-tight">
              All Tasks Completed
            </h2>
            <p className="text-sm text-[#64748b] mt-1.5 max-w-xs mx-auto">
              No tasks left in your queue! Add more tasks in Daily Plan or load a routine to start flowing.
            </p>
          </div>
          {onNavigateToDailyPlan && (
            <button
              type="button"
              onClick={onNavigateToDailyPlan}
              className="py-3 px-6 rounded-2xl bg-[#8da9c4] hover:bg-[#7d99b4] text-white font-semibold text-sm shadow-xs transition-all cursor-pointer active:scale-95"
            >
              Open Daily Plan
            </button>
          )}
        </div>
      )}

      {/* CASE 2: NO CURRENT TASK HAPPENING -> COUNTING DOWN TO WHEN NEXT TASK STARTS */}
      {flowState === 'countdown_to_next' && targetNextTask && (
        <div className="flex-1 flex flex-col items-center justify-between w-full">
          <div className="flex-1 flex flex-col items-center justify-center w-full my-auto space-y-7">
            {/* Countdown digital display */}
            <div className="text-center pt-2">
              <div className="text-6xl sm:text-7xl font-extrabold text-[#2c3e50] tracking-tight font-sans">
                {formattedCountdownTime}
              </div>
              <div className="text-[11px] sm:text-xs font-bold tracking-widest text-[#8da9c4] uppercase mt-2 flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>STARTS AT {targetNextTask.startTime}</span>
              </div>
            </div>

            {/* Circular meter counting down to next task */}
            <div 
              onClick={() => handleStartTaskEarly(targetNextTask)}
              className="relative flex items-center justify-center cursor-pointer group my-2"
              title="Tap to start this task early"
            >
              <svg className="w-72 h-72 sm:w-80 sm:h-80" viewBox="0 0 280 280">
                {/* Background ring */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke="#ede8df"
                  strokeWidth="14"
                  fill="transparent"
                />

                {/* Progress ring to start */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke="#8da9c4"
                  strokeWidth="14"
                  strokeDasharray={2 * Math.PI * radius}
                  strokeDashoffset={2 * Math.PI * radius * (1 - activeProgressRatio)}
                  strokeLinecap="round"
                  fill="transparent"
                  className="-rotate-90 origin-center transition-all duration-300 opacity-25"
                />

                {/* Small indicator dot on the circular ring */}
                <circle
                  cx={dotX}
                  cy={dotY}
                  r="7"
                  fill="#8da9c4"
                  className="transition-all duration-300 shadow-sm"
                />
              </svg>

              {/* Next task preview in center */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 pointer-events-none text-center">
                <span className="text-[11px] font-extrabold tracking-widest text-[#8da9c4] uppercase mb-1">
                  UP NEXT
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold text-[#2c3e50] tracking-tight truncate max-w-[200px]">
                  {targetNextTask.title}
                </h2>
                <span className="text-xs text-[#64748b] mt-1.5 font-medium">
                  {targetNextTask.durationMinutes} min session
                </span>
              </div>
            </div>

            {/* Helper status text */}
            <p className="text-xs text-[#64748b] text-center max-w-xs">
              No task is scheduled right now. The meter is counting down to your next session.
            </p>
          </div>

          {/* Bottom Section: Starts in banner + Start early button */}
          <div className="w-full space-y-3 pt-4">
            <div className="bg-[#eaf1f8] rounded-2xl p-4 sm:p-5 border border-[#d8e4f0] text-left w-full shadow-2xs">
              <div className="text-lg sm:text-xl font-bold text-[#2c3e50] tracking-tight">
                Starts in {formatSecondsToSavedDisplay(secondsUntilNextStart)}
              </div>
              <div className="text-sm text-[#64748b] mt-0.5 truncate">
                Routine continues with {targetNextTask.title}.
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleStartTaskEarly(targetNextTask)}
              className="w-full py-4 rounded-2xl bg-[#8da9c4] hover:bg-[#7d99b4] active:scale-[0.99] text-white font-semibold text-base flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start task now</span>
            </button>
          </div>
        </div>
      )}

      {/* CASE 3: ACTIVE TASK IN PROGRESS (Real-Time Synchronized to User's Clock) */}
      {flowState === 'active_task' && currentTask && (() => {
        const pStyle = getPriorityColorStyle(currentTask.priority, currentTheme);
        const activeAccentColor = currentTask.priority && currentTask.priority !== 'None' ? pStyle.bg : '#8da9c4';

        return (
          <div className="flex-1 flex flex-col items-center justify-between w-full">
            {/* Main Flow Pomodoro Container */}
            <div className="flex-1 flex flex-col items-center justify-center w-full my-auto space-y-7">
              {/* Digital Time & Subtitle matching video */}
              <div className="text-center pt-2">
                <div 
                  onClick={toggleRun}
                  className="text-6xl sm:text-7xl font-extrabold tracking-tight font-sans cursor-pointer hover:opacity-90 active:scale-95 transition-all"
                  style={{ color: currentTheme?.textColor || '#2c3e50' }}
                  title={isPaused ? 'Tap to resume' : 'Tap to pause'}
                >
                  {formattedActiveTime}
                </div>
                <div className="text-[11px] sm:text-xs font-bold tracking-widest text-[#94a3b8] uppercase mt-2">
                  {currentTask.routineName 
                    ? `ROUTINE: ${currentTask.routineName.toUpperCase()}`
                    : 'ROUTINE CONTINUES'
                  }
                </div>
              </div>

              {/* Circular Clock Ring matching video */}
              <div 
                onClick={toggleRun}
                className="relative flex items-center justify-center cursor-pointer group my-2"
                title={isPaused ? 'Tap circle to resume' : 'Tap circle to pause'}
              >
                <svg className="w-72 h-72 sm:w-80 sm:h-80" viewBox="0 0 280 280">
                  {/* Background neutral ring */}
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke="#ede8df"
                    strokeWidth="14"
                    fill="transparent"
                  />

                  {/* Active progress arc */}
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={activeAccentColor}
                    strokeWidth="14"
                    strokeDasharray={2 * Math.PI * radius}
                    strokeDashoffset={2 * Math.PI * radius * (1 - activeProgressRatio)}
                    strokeLinecap="round"
                    fill="transparent"
                    className="-rotate-90 origin-center transition-all duration-300 opacity-25"
                  />

                  {/* Small colored indicator dot on the circular ring */}
                  <circle
                    cx={dotX}
                    cy={dotY}
                    r="7"
                    fill={activeAccentColor}
                    className="transition-all duration-300 shadow-sm"
                  />
                </svg>

                {/* Active task title in the center of the ring */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 pointer-events-none">
                  <h2 
                    className="text-3xl sm:text-4xl font-bold tracking-tight text-center truncate max-w-[200px]"
                    style={{ color: currentTheme?.textColor || '#2c3e50' }}
                  >
                    {currentTask.title}
                  </h2>
                  {currentTask.priority && currentTask.priority !== 'None' && (
                    <span 
                      style={{
                        backgroundColor: pStyle.bg,
                        color: pStyle.text,
                        borderColor: pStyle.border,
                      }}
                      className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border shadow-2xs mt-2"
                    >
                      {currentTask.priority}
                    </span>
                  )}
                  {isPaused && (
                    <span 
                      className="text-xs font-bold mt-2 tracking-wide uppercase"
                      style={{ color: activeAccentColor }}
                    >
                      PAUSED
                    </span>
                  )}
                </div>
              </div>

              {/* Subtle timer play/reset controls */}
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={toggleRun}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#ede8df] hover:bg-[#e2dcd0] text-[#2c3e50] text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-2xs"
                >
                  {!isPaused ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Resume</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={resetTimer}
                  className="p-1.5 rounded-full bg-[#ede8df] hover:bg-[#e2dcd0] text-[#64748b] hover:text-[#2c3e50] text-xs transition-all cursor-pointer active:scale-90 shadow-2xs"
                  title="Reset timer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Bottom Section: Saved Time Banner + Complete Task Button */}
            <div className="w-full space-y-3 pt-4">
              {/* Saved Time Banner matching video */}
              <div className="bg-[#eaf1f8] rounded-2xl p-4 sm:p-5 border border-[#d8e4f0] text-left w-full shadow-2xs">
                <div className="text-lg sm:text-xl font-bold text-[#2c3e50] tracking-tight">
                  Saved {savedTimeLabel}
                </div>
                <div className="text-sm text-[#64748b] mt-0.5 truncate">
                  {nextTaskInRoutine 
                    ? `Routine continues with ${nextTaskInRoutine.title}.`
                    : 'This is the final task in this session.'
                  }
                </div>
              </div>

              {/* Complete Task Button matching video */}
              <button
                type="button"
                onClick={handleCompleteCurrentTask}
                className="w-full py-4 rounded-2xl bg-[#8da9c4] hover:bg-[#7d99b4] active:scale-[0.99] text-white font-semibold text-base flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Check className="w-5 h-5 stroke-[2.5]" />
                <span>Complete task</span>
              </button>

              {isCompletedToast && toastMessage && (
                <div className="text-center text-xs font-bold text-[#2d5a3f] bg-[#eaf5ec] border border-[#cbe5d0] py-2 px-3 rounded-xl animate-in fade-in">
                  {toastMessage}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
