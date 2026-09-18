import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Check, Trash2, Clock, Calendar as CalendarIcon, Tag } from 'lucide-react';
import { Task, Dedication, Keyword, Routine, PriorityLevel, ThemeConfig } from '../types';
import { getPriorityColorStyle, getSurfaceBg, getBorderColor } from '../utils/priorityColors';
import { NewTaskCard } from './NewTaskCard';

interface WeeklyPlanViewProps {
  tasks: Task[];
  dedications: Dedication[];
  keywords: Keyword[];
  routines?: Routine[];
  currentTheme?: ThemeConfig;
  onToggleCompleteTask: (taskId: string) => void;
  onAddTask: (newTask: Omit<Task, 'id' | 'completed'>) => void;
  onDeleteTask: (taskId: string) => void;
  onAddKeyword?: (kw: Omit<Keyword, 'id'>) => void;
  onSelectDayForDailyView?: (dateStr: string) => void;
}

const DAYS_OF_WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const HOUR_HEIGHT = 60; // 60px per hour => 1px per minute

export const WeeklyPlanView: React.FC<WeeklyPlanViewProps> = ({
  tasks,
  dedications,
  keywords,
  routines = [],
  currentTheme,
  onToggleCompleteTask,
  onAddTask,
  onDeleteTask,
  onAddKeyword,
  onSelectDayForDailyView,
}) => {
  // User's current clock updated periodically
  const [currentClock, setCurrentClock] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentClock(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Today's ISO string based strictly on user's real-time clock
  const todayIsoStr = useMemo(() => {
    const yyyy = currentClock.getFullYear();
    const mm = String(currentClock.getMonth() + 1).padStart(2, '0');
    const dd = String(currentClock.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, [currentClock]);

  // Week offset (0 = current week containing user's current clock)
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Selected day ISO string (defaults to today based on clock)
  const [selectedIsoStr, setSelectedIsoStr] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<string>(todayIsoStr);
  const [modalInitialDateLabel, setModalInitialDateLabel] = useState<string>('');
  const [modalInitialStartTime, setModalInitialStartTime] = useState<string>('9:00 AM');
  const [activeTaskDetails, setActiveTaskDetails] = useState<Task | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Compute the 7 days for the currently displayed week (Sunday to Saturday)
  const weekDays = useMemo(() => {
    // Current date based on system clock
    const now = new Date(currentClock);
    // Start of the week is Sunday
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = startOfWeek.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek + weekOffset * 7);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const isoStr = `${yyyy}-${mm}-${dd}`;

      const weekdayLabel = DAYS_OF_WEEK[d.getDay()];
      const dayNum = d.getDate();
      const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });

      // Highlight on the weekly view strictly follows which day it currently is based on user's time/clock!
      const isToday = isoStr === todayIsoStr;
      const isSelected = isoStr === selectedIsoStr;

      return {
        date: d,
        isoStr,
        weekdayLabel,
        dayNum,
        monthLabel,
        isSelected,
        isToday,
      };
    });
  }, [currentClock, todayIsoStr, weekOffset, selectedIsoStr]);

  // Helper to parse time string like "7:30 PM" to minutes from midnight
  const parseTimeToMinutes = (timeStr: string): number => {
    let h = 9;
    let m = 0;
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (match) {
      h = parseInt(match[1], 10);
      m = parseInt(match[2], 10);
      const ampm = match[3]?.toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
    }
    return h * 60 + m;
  };

  // Helper to format minutes to "7:30 PM"
  const formatMinutesToTime = (totalMinutes: number): string => {
    let h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  // Format full date label
  const getFullFormattedDate = (dateObj: Date): string => {
    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const month = dateObj.toLocaleDateString('en-US', { month: 'long' });
    return `${weekday}, ${month} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
  };

  // Auto-scroll to current time or evening hours (e.g. 5:00 PM) on initial render
  useEffect(() => {
    if (scrollContainerRef.current) {
      // Scroll to 5:00 PM (17 * 60 = 1020px) or center of late afternoon/evening
      const scrollPos = 16 * HOUR_HEIGHT; // 4 PM
      scrollContainerRef.current.scrollTop = scrollPos;
    }
  }, []);

  // Compute tasks for each day of the week
  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    weekDays.forEach((wd) => {
      map[wd.isoStr] = [];
    });

    tasks.forEach((t) => {
      let taskDate = t.date;
      if (!taskDate) {
        taskDate = todayIsoStr;
      }
      if (map[taskDate]) {
        map[taskDate].push(t);
      }
    });

    // Sort each day's tasks by start time
    Object.keys(map).forEach((dateKey) => {
      map[dateKey].sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
    });

    return map;
  }, [tasks, weekDays]);

  // Tasks for the selected day
  const selectedDayTasks = tasksByDay[selectedIsoStr] || [];

  // Handle FAB (+) click: Chain time to the end of the last task
  const handleOpenNewTask = (dateStr?: string, customStartMinutes?: number) => {
    const targetDateIso = dateStr || selectedIsoStr;
    const targetDayTasks = tasksByDay[targetDateIso] || [];

    let initialStart = formatMinutesToTime(currentTimeMinutes);
    if (customStartMinutes !== undefined) {
      initialStart = formatMinutesToTime(customStartMinutes);
    } else if (targetDayTasks.length > 0) {
      // Chain start time from last task's end time!
      initialStart = targetDayTasks[targetDayTasks.length - 1].endTime;
    } else {
      initialStart = formatMinutesToTime(currentTimeMinutes);
    }

    const dParts = targetDateIso.split('-');
    const dObj = new Date(parseInt(dParts[0], 10), parseInt(dParts[1], 10) - 1, parseInt(dParts[2], 10));

    setModalInitialDate(targetDateIso);
    setModalInitialDateLabel(getFullFormattedDate(dObj));
    setModalInitialStartTime(initialStart);
    setIsAddModalOpen(true);
  };

  // Handle clicking on an empty slot in the timeline
  const handleSlotClick = (dateStr: string, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    // Round to nearest 15 minutes
    const rawMinutes = Math.floor(offsetY / (HOUR_HEIGHT / 60));
    const snappedMinutes = Math.floor(rawMinutes / 15) * 15;
    handleOpenNewTask(dateStr, snappedMinutes);
  };

  const handleSaveNewTask = (taskData: {
    title: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    priority: PriorityLevel;
    dedicationId?: string;
    repeat?: Task['repeat'];
    autoPromotePriority?: Task['autoPromotePriority'];
    saveAsKeyword?: boolean;
    date?: string;
  }) => {
    onAddTask({
      title: taskData.title,
      startTime: taskData.startTime,
      endTime: taskData.endTime,
      durationMinutes: taskData.durationMinutes,
      priority: taskData.priority,
      dedicationId: taskData.dedicationId,
      repeat: taskData.repeat,
      autoPromotePriority: taskData.autoPromotePriority,
      date: taskData.date || modalInitialDate,
    });

    if (taskData.saveAsKeyword && onAddKeyword) {
      onAddKeyword({
        name: taskData.title,
        durationMinutes: taskData.durationMinutes,
        priority: taskData.priority,
        dedicationId: taskData.dedicationId,
      });
    }

    setIsAddModalOpen(false);
  };

  // Current time line position based on real user clock
  const currentTimeMinutes = currentClock.getHours() * 60 + currentClock.getMinutes();
  const currentTimeTop = (currentTimeMinutes / 60) * HOUR_HEIGHT;

  useEffect(() => {
    if (scrollContainerRef.current) {
      const scrollPos = Math.max(0, currentTimeTop - 2 * HOUR_HEIGHT);
      scrollContainerRef.current.scrollTop = scrollPos;
    }
  }, []);

  // 24 Hour labels
  const hours = Array.from({ length: 24 }, (_, i) => {
    let label = '12 AM';
    if (i === 0) label = '12 AM';
    else if (i < 12) label = `${i} AM`;
    else if (i === 12) label = '12 PM';
    else label = `${i - 12} PM`;
    return { hour: i, label };
  });

  const surfaceBg = getSurfaceBg(currentTheme);
  const borderColor = getBorderColor(currentTheme);

  return (
    <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto h-[calc(100vh-140px)] min-h-[540px] relative select-none">
      {/* Week Navigation Row with Prev / Next buttons and Date range */}
      <div 
        style={{
          backgroundColor: surfaceBg,
          borderColor,
          color: currentTheme?.textColor,
        }}
        className="flex items-center justify-between px-3 py-2 border-b shadow-2xs z-20"
      >
        <button
          type="button"
          onClick={() => {
            setWeekOffset((w) => w - 1);
          }}
          style={{ borderColor, color: currentTheme?.textColor }}
          className="p-1.5 sm:p-2 rounded-full hover:opacity-80 active:scale-95 transition-all cursor-pointer border"
          aria-label="Previous week"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-bold" style={{ color: currentTheme?.textColor }}>
            {weekDays[0].monthLabel} {weekDays[0].dayNum} – {weekDays[6].monthLabel !== weekDays[0].monthLabel ? `${weekDays[6].monthLabel} ` : ''}{weekDays[6].dayNum}, {weekDays[6].date.getFullYear()}
          </span>
          {weekOffset !== 0 && (
            <button
              type="button"
              onClick={() => {
                setWeekOffset(0);
                setSelectedIsoStr(todayIsoStr);
                if (scrollContainerRef.current) {
                  const scrollPos = Math.max(0, currentTimeTop - 2 * HOUR_HEIGHT);
                  scrollContainerRef.current.scrollTo({ top: scrollPos, behavior: 'smooth' });
                }
              }}
              style={{
                backgroundColor: `${currentTheme?.primaryColor || '#84a4cb'}25`,
                color: currentTheme?.primaryColor || '#3b618f',
              }}
              className="text-[11px] font-bold px-2 py-0.5 rounded-md hover:opacity-85 transition-colors cursor-pointer"
            >
              Today
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setWeekOffset((w) => w + 1);
          }}
          style={{ borderColor, color: currentTheme?.textColor }}
          className="p-1.5 sm:p-2 rounded-full hover:opacity-80 active:scale-95 transition-all cursor-pointer border"
          aria-label="Next week"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Week Day Header Strip - Perfectly aligned with the 7 timeline columns below */}
      <div 
        style={{
          backgroundColor: surfaceBg,
          borderColor,
        }}
        className="flex w-full border-b z-10 select-none"
      >
        {/* Left Spacer: Exact same width as the timeline hour labels column below */}
        <div 
          style={{
            backgroundColor: surfaceBg,
            borderColor,
          }}
          className="w-12 sm:w-16 shrink-0 border-r flex items-center justify-center text-[10px] opacity-60 font-medium" 
        />

        {/* 7 Days of Week Header: Exactly matched to grid-cols-7 */}
        <div className="flex-1 grid grid-cols-7">
          {weekDays.map((wd) => {
            return (
              <button
                key={wd.isoStr}
                type="button"
                onClick={() => {
                  setSelectedIsoStr(wd.isoStr);
                  if (onSelectDayForDailyView) {
                    onSelectDayForDailyView(wd.isoStr);
                  }
                }}
                style={{
                  borderLeft: `1px solid ${borderColor}`,
                  backgroundColor: wd.isSelected ? 'rgba(132, 164, 203, 0.15)' : 'transparent',
                }}
                className="flex flex-col items-center justify-center py-2 sm:py-2.5 transition-all cursor-pointer group hover:opacity-90"
              >
                <span 
                  style={{ color: currentTheme?.textColor, opacity: 0.7 }}
                  className="text-[10px] sm:text-xs font-bold tracking-wider uppercase"
                >
                  {wd.weekdayLabel}
                </span>

                {/* Day circle badge */}
                <div
                  style={
                    wd.isToday
                      ? { backgroundColor: currentTheme?.primaryColor || '#84a4cb', color: '#ffffff' }
                      : wd.isSelected
                      ? { backgroundColor: `${currentTheme?.primaryColor || '#84a4cb'}30`, color: currentTheme?.textColor }
                      : { color: currentTheme?.textColor }
                  }
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold mt-0.5 transition-all"
                >
                  {wd.dayNum}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Vertical Scrollable Hourly Calendar Grid */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth"
        style={{ 
          backgroundColor: currentTheme?.bgColor || '#ffffff',
          height: 'calc(100% - 110px)' 
        }}
      >
        <div className="relative w-full flex min-h-[1440px]" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
          {/* Left Hour Labels Column */}
          <div 
            style={{
              backgroundColor: surfaceBg,
              borderColor,
            }}
            className="w-12 sm:w-16 shrink-0 border-r select-none z-10"
          >
            {hours.map((h) => (
              <div
                key={`label-${h.hour}`}
                style={{ borderColor }}
                className="h-[60px] relative pr-2 text-right border-b"
              >
                <span 
                  style={{ color: currentTheme?.textColor, opacity: 0.75 }}
                  className={`text-[10px] sm:text-xs font-semibold relative block select-none ${
                    h.hour === 0 ? 'top-1' : '-top-2.5'
                  }`}
                >
                  {h.label}
                </span>
              </div>
            ))}
          </div>

          {/* 7 Columns Timeline Grid - Exactly aligned with Day Header */}
          <div className="flex-1 grid grid-cols-7 relative h-full">
            {/* 7 Columns (Sunday through Saturday) */}
            {weekDays.map((wd) => {
              const dayTasks = tasksByDay[wd.isoStr] || [];

              return (
                <div
                  key={`col-${wd.isoStr}`}
                  onClick={(e) => handleSlotClick(wd.isoStr, e)}
                  className={`relative h-full transition-colors cursor-pointer ${
                    wd.isToday ? 'bg-[#0284c7]/[0.035]' : 'hover:bg-black/[0.015]'
                  }`}
                >
                  {/* Horizontal Hour Lines rendered inside each column so no column lines are ever missing */}
                  <div className="absolute inset-0 pointer-events-none">
                    {hours.map((h) => (
                      <div
                        key={`line-${wd.isoStr}-${h.hour}`}
                        className="h-[60px] border-b border-[#e5e7eb]/80 w-full"
                      />
                    ))}
                  </div>

                  {/* Current Time Horizontal Red Line (On Today column) */}
                  {wd.isToday && (
                    <div
                      className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                      style={{ top: `${currentTimeTop}px` }}
                    >
                      <div className="w-2 h-2 rounded-full bg-[#ef4444] -ml-1 shrink-0 shadow-xs" />
                      <div className="h-[2px] w-full bg-[#ef4444]" />
                    </div>
                  )}

                  {/* Tasks rendered inside the column */}
                  {dayTasks.map((t) => {
                    const startMin = parseTimeToMinutes(t.startTime);
                    const topPx = (startMin / 60) * HOUR_HEIGHT;
                    // Ensure minimum height of 26px so text is never vertically sliced or clipped
                    const heightPx = Math.max(26, (t.durationMinutes / 60) * HOUR_HEIGHT);

                    // Get Color Code matching theme priority colors with ultra-high-contrast text
                    const colorStyle = getPriorityColorStyle(t.priority, currentTheme);

                    return (
                      <div
                        key={t.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTaskDetails(t);
                        }}
                        style={{
                          top: `${topPx}px`,
                          height: `${heightPx}px`,
                          backgroundColor: colorStyle.bg,
                          color: colorStyle.text,
                          borderColor: colorStyle.border,
                        }}
                        className={`absolute left-0.5 right-0.5 sm:left-1 sm:right-1 rounded-lg sm:rounded-xl border shadow-2xs z-10 overflow-hidden transition-all hover:brightness-95 hover:shadow-xs cursor-pointer ${
                          heightPx < 36 
                            ? 'px-1.5 py-0 flex items-center justify-start' 
                            : heightPx < 52 
                            ? 'px-1.5 py-1 flex flex-col justify-center' 
                            : 'px-2 py-1.5 flex flex-col justify-start'
                        } ${t.completed ? 'opacity-55 line-through' : ''}`}
                        title={`${t.title} (${t.startTime} - ${t.endTime}) - ${t.priority} Priority`}
                      >
                        <div className={`font-bold truncate select-none ${
                          heightPx < 36 
                            ? 'text-[11px] sm:text-xs leading-none w-full' 
                            : 'text-xs sm:text-sm leading-tight'
                        }`}>
                          {t.title}
                        </div>

                        {heightPx >= 36 && heightPx < 52 && (
                          <div className="text-[9px] sm:text-[10px] font-semibold opacity-85 truncate mt-0.5 leading-none select-none">
                            {t.startTime}
                          </div>
                        )}

                        {heightPx >= 52 && (
                          <div className="text-[10px] sm:text-[11px] font-semibold opacity-85 truncate mt-0.5 leading-tight select-none">
                            {t.startTime} – {t.endTime}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Action Button (+) matching video bottom right */}
      <button
        type="button"
        id="weekly-add-task-fab"
        onClick={() => handleOpenNewTask()}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-[#0284c7] hover:bg-[#0369a1] active:scale-95 text-white rounded-full shadow-xl flex items-center justify-center transition-all cursor-pointer group"
        aria-label="Add Task"
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>

      {/* Task Quick Inspector / Actions Popover Modal */}
      {activeTaskDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => setActiveTaskDetails(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-[#d8edd9] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-[#edf5ee]">
              <div>
                <span
                  style={{
                    backgroundColor: getPriorityColorStyle(activeTaskDetails.priority, currentTheme).bg,
                    color: getPriorityColorStyle(activeTaskDetails.priority, currentTheme).text,
                    borderColor: getPriorityColorStyle(activeTaskDetails.priority, currentTheme).border,
                  }}
                  className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border mb-1.5"
                >
                  {activeTaskDetails.priority === 'None' ? 'No priority' : `${activeTaskDetails.priority} Priority`}
                </span>
                <h3 className="text-lg font-bold text-[#1b4332]">
                  {activeTaskDetails.title}
                </h3>
              </div>
            </div>

            <div className="py-4 space-y-2 text-sm text-[#4b5563]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#6e8a75]" />
                <span>
                  {activeTaskDetails.startTime} – {activeTaskDetails.endTime} ({activeTaskDetails.durationMinutes} min)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#6e8a75]" />
                <span>{activeTaskDetails.date || todayIsoStr}</span>
              </div>
              {activeTaskDetails.dedicationId && (
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#6e8a75]" />
                  <span>
                    Dedication:{' '}
                    {dedications.find((d) => d.id === activeTaskDetails.dedicationId)?.name || 'General'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#edf5ee]">
              <button
                type="button"
                onClick={() => {
                  onDeleteTask(activeTaskDetails.id);
                  setActiveTaskDetails(null);
                }}
                className="flex items-center gap-1 text-xs font-bold text-[#dc2626] hover:text-[#b91c1c] px-3 py-2 rounded-xl hover:bg-[#fee2e2]/50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onToggleCompleteTask(activeTaskDetails.id);
                    setActiveTaskDetails(null);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTaskDetails.completed
                      ? 'bg-[#edf7ee] text-[#2d5a3f]'
                      : 'bg-[#52b788] text-white hover:bg-[#40916c]'
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{activeTaskDetails.completed ? 'Mark Incomplete' : 'Done'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTaskDetails(null)}
                  className="px-3 py-2 text-xs font-bold text-[#64748b] hover:text-[#1e293b] rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Task Full-Screen / Modal Card */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#fbf9f4] overflow-y-auto px-4 py-3 sm:py-6 animate-in fade-in duration-150">
          <NewTaskCard
            onSave={handleSaveNewTask}
            onCancel={() => setIsAddModalOpen(false)}
            dedications={dedications}
            keywords={keywords}
            routines={routines}
            initialStartTime={modalInitialStartTime}
            initialDuration={30}
            initialDateStr={modalInitialDate}
            targetDateLabel={modalInitialDateLabel}
          />
        </div>
      )}
    </div>
  );
};
