import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Info, Plus, Clock, Calendar as CalendarIcon, Tag, Trash2, Check } from 'lucide-react';
import { Task, Dedication, Keyword, Routine, ThemeConfig, PriorityLevel } from '../types';
import { getPriorityColorStyle, getSurfaceBg, getBorderColor } from '../utils/priorityColors';
import { formatLocalDateToIso } from '../utils/time';
import { NewTaskCard } from './NewTaskCard';

interface MonthlyPlanViewProps {
  tasks: Task[];
  dedications: Dedication[];
  keywords: Keyword[];
  routines?: Routine[];
  currentTheme?: ThemeConfig;
  currentYear?: number;
  currentMonth?: number; // 0-indexed: 8 is September
  initialSelectedDateStr?: string;
  onToggleCompleteTask: (taskId: string) => void;
  onAddTask: (newTask: Omit<Task, 'id' | 'completed'> & { date?: string }) => void;
  onDeleteTask: (taskId: string) => void;
  onSelectDay?: (dateStr: string) => void;
  onMonthChange?: (year: number, month: number) => void;
}

interface CalendarDay {
  dayNumber: number;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  year: number;
  month: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MonthlyPlanView: React.FC<MonthlyPlanViewProps> = ({
  tasks,
  dedications,
  keywords,
  routines = [],
  currentTheme,
  currentYear,
  currentMonth,
  initialSelectedDateStr,
  onToggleCompleteTask,
  onAddTask,
  onDeleteTask,
  onSelectDay,
  onMonthChange,
}) => {
  // Real-time tracking of current time so midnight rollover dynamically updates
  const [currentClock, setCurrentClock] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentClock(new Date());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Today's ISO date string based on user's local clock
  const todayDateStr = useMemo(() => formatLocalDateToIso(currentClock), [currentClock]);

  // View year and month default to the user's current clock or props
  const [viewYear, setViewYear] = useState<number>(() => currentYear ?? currentClock.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => currentMonth ?? currentClock.getMonth()); // 0-11
  
  // Default selected day: tracks user's current day (todayDateStr) or initialSelectedDateStr
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => initialSelectedDateStr || todayDateStr);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [activeTaskDetails, setActiveTaskDetails] = useState<Task | null>(null);

  // Sync with incoming props if they change
  useEffect(() => {
    if (currentYear !== undefined) setViewYear(currentYear);
    if (currentMonth !== undefined) setViewMonth(currentMonth);
  }, [currentYear, currentMonth]);

  useEffect(() => {
    if (initialSelectedDateStr) {
      setSelectedDateStr(initialSelectedDateStr);
    }
  }, [initialSelectedDateStr]);

  // Handle month navigation
  const handlePrevMonth = () => {
    let newMonth = viewMonth - 1;
    let newYear = viewYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    }
    setViewMonth(newMonth);
    setViewYear(newYear);
    if (onMonthChange) {
      onMonthChange(newYear, newMonth);
    }
  };

  const handleNextMonth = () => {
    let newMonth = viewMonth + 1;
    let newYear = viewYear;
    if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    setViewMonth(newMonth);
    setViewYear(newYear);
    if (onMonthChange) {
      onMonthChange(newYear, newMonth);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    const todayIso = formatLocalDateToIso(now);
    setSelectedDateStr(todayIso);
    if (onMonthChange) {
      onMonthChange(now.getFullYear(), now.getMonth());
    }
    if (onSelectDay) {
      onSelectDay(todayIso);
    }
  };

  // Generate 7-day Monday-based grid cells
  const calendarDays = useMemo<CalendarDay[]>(() => {
    const days: CalendarDay[] = [];

    // First day of current month
    const firstDayDate = new Date(viewYear, viewMonth, 1);
    // Sunday is 0, Monday is 1 ... Saturday is 6
    const firstDayOfWeek = firstDayDate.getDay();
    // Monday-based offset: Mon = 0, Tue = 1, ..., Sun = 6
    const startOffset = (firstDayOfWeek + 6) % 7;

    // Number of days in current month
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    // Days in previous month
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    // Previous month filler days
    for (let i = startOffset - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const mStr = String(prevMonth + 1).padStart(2, '0');
      const dStr = String(dNum).padStart(2, '0');
      const dateStr = `${prevYear}-${mStr}-${dStr}`;
      days.push({
        dayNumber: dNum,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayDateStr,
        year: prevYear,
        month: prevMonth,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(viewMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${viewYear}-${mStr}-${dStr}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayDateStr,
        year: viewYear,
        month: viewMonth,
      });
    }

    // Next month filler days to complete grid (multiples of 7: 35 or 42)
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let n = 1; n <= remaining; n++) {
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      const mStr = String(nextMonth + 1).padStart(2, '0');
      const dStr = String(n).padStart(2, '0');
      const dateStr = `${nextYear}-${mStr}-${dStr}`;
      days.push({
        dayNumber: n,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayDateStr,
        year: nextYear,
        month: nextMonth,
      });
    }

    return days;
  }, [viewYear, viewMonth, todayDateStr]);

  // Map tasks by date string
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((t) => {
      const d = t.date || todayDateStr;
      if (!map.has(d)) {
        map.set(d, []);
      }
      map.get(d)!.push(t);
    });
    return map;
  }, [tasks, todayDateStr]);

  // Selected date formatted label for NewTaskCard
  const targetDateFormatted = useMemo(() => {
    try {
      const [y, m, d] = selectedDateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }, [selectedDateStr]);

  // Priority dot color helper
  const getDotColor = (priority: PriorityLevel): string => {
    if (priority === 'High') {
      return currentTheme?.priorityColors?.high || '#ef4444';
    }
    if (priority === 'Medium') {
      return currentTheme?.priorityColors?.medium || '#eab308';
    }
    if (priority === 'Low') {
      return currentTheme?.priorityColors?.low || '#22c55e';
    }
    return '#94a3b8';
  };

  const surfaceBg = getSurfaceBg(currentTheme);
  const borderColor = getBorderColor(currentTheme);

  return (
    <div className="w-full flex-1 flex flex-col">
      {/* Navigation Row with Left and Right Arrows */}
      <div className="flex items-center justify-between px-2 mb-4">
        <button
          onClick={handlePrevMonth}
          aria-label="Previous Month"
          style={{
            backgroundColor: surfaceBg,
            borderColor,
            color: currentTheme?.textColor || '#4b5563',
          }}
          className="w-11 h-11 rounded-full border shadow-xs flex items-center justify-center hover:opacity-80 active:scale-95 transition-all cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
        </button>

        {/* Jump to Today button if navigated away from current month */}
        <div className="flex-1 flex justify-center">
          {(viewYear !== currentClock.getFullYear() || viewMonth !== currentClock.getMonth()) && (
            <button
              type="button"
              onClick={handleJumpToToday}
              style={{
                backgroundColor: surfaceBg,
                borderColor,
                color: currentTheme?.textColor || '#1b4332',
              }}
              className="px-3 py-1 rounded-full border text-xs font-semibold shadow-xs hover:opacity-85 active:scale-95 transition-all cursor-pointer"
            >
              Today
            </button>
          )}
        </div>

        <button
          onClick={handleNextMonth}
          aria-label="Next Month"
          style={{
            backgroundColor: surfaceBg,
            borderColor,
            color: currentTheme?.textColor || '#4b5563',
          }}
          className="w-11 h-11 rounded-full border shadow-xs flex items-center justify-center hover:opacity-80 active:scale-95 transition-all cursor-pointer"
        >
          <ChevronRight className="w-5 h-5 stroke-[2.2]" />
        </button>
      </div>

      {/* Weekday Column Headers starting on Monday */}
      <div className="grid grid-cols-7 mb-2 text-center">
        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((dayName) => (
          <div
            key={dayName}
            style={{ color: currentTheme?.textColor, opacity: 0.65 }}
            className="text-[11px] font-semibold tracking-wider"
          >
            {dayName}
          </div>
        ))}
      </div>

      {/* Calendar Grid matching screenshot */}
      <div 
        style={{ borderColor }}
        className="border-t border-l bg-transparent rounded-xs overflow-hidden"
      >
        <div className="grid grid-cols-7">
          {calendarDays.map((day) => {
            const isSelected = day.dateStr === selectedDateStr;
            const isToday = day.isToday;
            const dayTasks = tasksByDate.get(day.dateStr) || [];
            const taskCount = dayTasks.length;

            return (
              <div
                key={day.dateStr}
                onClick={() => {
                  setSelectedDateStr(day.dateStr);
                  if (onSelectDay) {
                    onSelectDay(day.dateStr);
                  }
                }}
                style={{
                  borderRight: `1px solid ${borderColor}`,
                  borderBottom: `1px solid ${borderColor}`,
                  backgroundColor: isSelected
                    ? 'rgba(132, 164, 203, 0.2)'
                    : isToday
                    ? 'rgba(82, 183, 136, 0.15)'
                    : 'transparent',
                }}
                className="min-h-[82px] sm:min-h-[92px] p-1.5 flex flex-col justify-start transition-all cursor-pointer select-none hover:bg-black/[0.03]"
              >
                {/* Header inside cell: Day number (circle badge if selected, ring badge if today) + Task count */}
                <div className="flex items-center justify-between">
                  {isSelected ? (
                    <div 
                      style={{ backgroundColor: currentTheme?.primaryColor || '#7da0c5' }}
                      className="w-6 h-6 rounded-full text-white flex items-center justify-center font-bold text-xs shadow-2xs"
                    >
                      {day.dayNumber}
                    </div>
                  ) : isToday ? (
                    <div 
                      style={{ 
                        borderColor: currentTheme?.primaryColor || '#7da0c5',
                        color: currentTheme?.textColor || '#1b4332',
                        backgroundColor: surfaceBg
                      }}
                      className="w-6 h-6 rounded-full border-2 flex items-center justify-center font-bold text-xs"
                    >
                      {day.dayNumber}
                    </div>
                  ) : (
                    <span
                      style={{ 
                        color: currentTheme?.textColor,
                        opacity: day.isCurrentMonth ? 1 : 0.4
                      }}
                      className="text-xs font-semibold pl-0.5"
                    >
                      {day.dayNumber}
                    </span>
                  )}

                  {/* Task count */}
                  {taskCount > 0 && (
                    <span 
                      style={{ color: currentTheme?.textColor, opacity: 0.6 }}
                      className="text-[11px] font-medium pr-0.5"
                    >
                      {taskCount}
                    </span>
                  )}
                </div>

                {/* Task list items inside cell with colored priority pills */}
                <div className="mt-1 space-y-0.5 overflow-hidden">
                  {dayTasks.slice(0, 3).map((task) => {
                    const pStyle = getPriorityColorStyle(task.priority, currentTheme);
                    const isPriority = task.priority && task.priority !== 'None';
                    return (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTaskDetails(task);
                        }}
                        style={isPriority ? {
                          backgroundColor: pStyle.bg,
                          color: pStyle.text,
                          borderColor: pStyle.border,
                        } : {
                          backgroundColor: surfaceBg,
                          color: currentTheme?.textColor,
                          borderColor,
                        }}
                        className="flex items-center gap-1 text-[10px] font-medium leading-tight truncate px-1.5 py-0.5 rounded-md border shadow-2xs cursor-pointer hover:opacity-85"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: isPriority ? pStyle.text : (currentTheme?.primaryColor || '#84a4cb') }}
                        />
                        <span className={`truncate ${task.completed ? 'line-through opacity-60' : ''}`}>{task.title}</span>
                      </div>
                    );
                  })}
                  {dayTasks.length > 3 && (
                    <div 
                      style={{ color: currentTheme?.textColor, opacity: 0.6 }}
                      className="text-[9px] font-medium pl-1"
                    >
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Info Note matching screenshot */}
      <div className="flex items-center justify-center gap-1.5 mt-5 text-[#8c877e] text-xs font-normal">
        <Info className="w-4 h-4 stroke-[1.8]" />
        <span>Select a day to add or review tasks</span>
      </div>

      {/* Floating Action Button (+) matching the screenshot in color and position */}
      <button
        id="monthly-add-task-fab"
        onClick={() => setIsAddModalOpen(true)}
        aria-label="Add Task"
        className="fixed bottom-6 right-6 z-30 w-14 h-14 bg-[#7da0c5] hover:bg-[#6c8fb8] active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg transition-all cursor-pointer"
      >
        <Plus className="w-7 h-7 stroke-[2.2]" />
      </button>

      {/* Task Details Popover Modal */}
      {activeTaskDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
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
                <span>{activeTaskDetails.date || selectedDateStr}</span>
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
                className="flex items-center gap-1 text-xs font-bold text-[#dc2626] hover:text-[#b91c1c] px-3 py-2 rounded-xl hover:bg-[#fee2e2]/50 transition-colors cursor-pointer"
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
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                  className="px-3 py-2 text-xs font-bold text-[#64748b] hover:text-[#1e293b] rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal / Full-Screen Popup */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#fbf9f4] overflow-y-auto px-4 py-3 sm:py-6 animate-in fade-in duration-150">
          <NewTaskCard
            initialDateStr={selectedDateStr}
            targetDateLabel={targetDateFormatted}
            dedications={dedications}
            keywords={keywords}
            routines={routines}
            onCancel={() => setIsAddModalOpen(false)}
            onSave={(taskData) => {
              onAddTask({
                ...taskData,
                date: taskData.date || selectedDateStr,
              });
              setIsAddModalOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
};
