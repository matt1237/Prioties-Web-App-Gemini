import React, { useState } from 'react';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Clock, 
  Trash2, 
  Tag,
  Calendar,
  Repeat
} from 'lucide-react';
import { Task, Dedication, Keyword, Routine, PlanTimeframe, PriorityLevel, ThemeConfig } from '../types';
import { getPriorityColorStyle, getSurfaceBg, getBorderColor } from '../utils/priorityColors';
import { NewTaskCard } from './NewTaskCard';
import { EditTaskModal } from './EditTaskModal';
import { WeeklyPlanView } from './WeeklyPlanView';
import { MonthlyPlanView } from './MonthlyPlanView';
import { formatLocalDateToIso } from '../utils/time';

interface DailyPlanViewProps {
  tasks: Task[];
  dedications: Dedication[];
  keywords: Keyword[];
  routines?: Routine[];
  currentTheme?: ThemeConfig;
  timeframe?: PlanTimeframe;
  onChangeTimeframe?: (tf: PlanTimeframe) => void;
  onToggleCompleteTask: (taskId: string) => void;
  onAddTask: (newTask: Omit<Task, 'id' | 'completed'> & { date?: string }) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
  onStartFlowWithTask?: (task: Task) => void;
  onAddKeyword?: (kw: Omit<Keyword, 'id'>) => void;
  onApplyRoutine?: (routine: Routine, date?: string, startTime?: string) => void;
  onMonthYearChange?: (label: string) => void;
}

export const DailyPlanView: React.FC<DailyPlanViewProps> = ({
  tasks,
  dedications,
  keywords,
  routines = [],
  currentTheme,
  timeframe: externalTimeframe,
  onChangeTimeframe,
  onToggleCompleteTask,
  onAddTask,
  onDeleteTask,
  onUpdateTask,
  onStartFlowWithTask,
  onAddKeyword,
  onApplyRoutine,
  onMonthYearChange,
}) => {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [internalTimeframe, setInternalTimeframe] = useState<PlanTimeframe>('Day');
  const timeframe = externalTimeframe !== undefined ? externalTimeframe : internalTimeframe;

  const setTimeframe = (tf: PlanTimeframe) => {
    if (onChangeTimeframe) {
      onChangeTimeframe(tf);
    }
    setInternalTimeframe(tf);
  };
  const [currentDateIndex, setCurrentDateIndex] = useState<number>(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Helper to get formatted human date label
  const getDateLabel = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const dateFormatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const fullDateFormatted = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    if (offset === 0) return `Today, ${dateFormatted}`;
    if (offset === -1) return `Yesterday, ${dateFormatted}`;
    if (offset === 1) return `Tomorrow, ${dateFormatted}`;
    return fullDateFormatted;
  };

  // Helper to compute full date label e.g. "Sat, September 19, 2026"
  const getFullFormattedDate = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const month = d.toLocaleDateString('en-US', { month: 'long' });
    return `${weekday}, ${month} ${d.getDate()}, ${d.getFullYear()}`;
  };

  // Helper to compute target date string YYYY-MM-DD for a given day offset
  const getTargetDateStr = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return formatLocalDateToIso(d);
  };

  const selectedDateStr = getTargetDateStr(currentDateIndex);
  const todayDateStr = getTargetDateStr(0);

  // Filter tasks strictly for the selected date
  const currentDayTasks = tasks.filter((task) => {
    if (currentDateIndex === 0) {
      // Today: matches selected date or initial sample date fallback '2026-09-17'
      return (
        task.date === selectedDateStr ||
        (!task.date && selectedDateStr === todayDateStr) ||
        task.date === '2026-09-17'
      );
    }
    // Any other day: ONLY tasks created specifically for this date
    return task.date === selectedDateStr;
  });

  // Open modal and pre-calculate next start time following the last task
  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);
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
      date: taskData.date || selectedDateStr,
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

  const getDedication = (id?: string) => dedications.find((d) => d.id === id);
  const surfaceBg = getSurfaceBg(currentTheme);
  const borderColor = getBorderColor(currentTheme);

  return (
    <div className={`flex-1 flex flex-col px-4 pt-2 pb-24 mx-auto w-full transition-colors duration-200 ${timeframe === 'Week' ? 'max-w-4xl' : 'max-w-2xl'}`}>
      {/* Timeframe Selector [Day | Week | Month] */}
      <div 
        id="timeframe-selector"
        style={{ borderColor }}
        className="w-full flex p-1 rounded-2xl mb-4 shadow-2xs transition-colors bg-black/5 border"
      >
        {(['Day', 'Week', 'Month'] as PlanTimeframe[]).map((tab) => {
          const isActive = timeframe === tab;
          return (
            <button
              key={tab}
              onClick={() => setTimeframe(tab)}
              style={isActive ? { 
                backgroundColor: surfaceBg, 
                color: currentTheme?.textColor,
                borderColor 
              } : { color: currentTheme?.textColor }}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer border ${
                isActive
                  ? 'shadow-xs font-bold'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Date Navigation Strip (Shown for Day view) */}
      {timeframe === 'Day' && (
        <div className="flex items-center justify-between mb-4 px-1">
          <button
            onClick={() => setCurrentDateIndex((prev) => prev - 1)}
            aria-label="Previous Day"
            style={{
              backgroundColor: surfaceBg,
              borderColor,
              color: currentTheme?.textColor || '#1b4332',
            }}
            className="p-2.5 border rounded-full hover:opacity-85 active:scale-90 transition-all shadow-xs cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <div 
              className="text-lg font-bold font-display tracking-tight"
              style={{ color: currentTheme?.textColor || '#1b4332' }}
            >
              {getDateLabel(currentDateIndex)}
            </div>
            <div 
              className="text-xs font-medium"
              style={{ color: currentTheme?.textColor || '#52796f', opacity: 0.8 }}
            >
              {currentDayTasks.filter((t) => !t.completed).length} active tasks •{' '}
              {currentDayTasks.reduce(
                (sum, t) => sum + (t.completed ? 0 : t.durationMinutes),
                0
              )}{' '}
              min total
            </div>
          </div>

          <button
            onClick={() => setCurrentDateIndex((prev) => prev + 1)}
            aria-label="Next Day"
            style={{
              backgroundColor: surfaceBg,
              borderColor,
              color: currentTheme?.textColor || '#1b4332',
            }}
            className="p-2.5 border rounded-full hover:opacity-85 active:scale-90 transition-all shadow-xs cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main Content based on timeframe */}
      {timeframe === 'Day' && (
        <div className="space-y-3">
          {currentDayTasks.length === 0 ? (
            /* Clean empty state with surface offset background */
            <div 
              style={{
                backgroundColor: surfaceBg,
                borderColor,
              }}
              className="rounded-2xl p-8 border border-dashed text-center flex flex-col items-center justify-center space-y-2.5 my-2"
            >
              <div 
                style={{ backgroundColor: `${currentTheme?.primaryColor || '#84a4cb'}20`, color: currentTheme?.primaryColor || '#84a4cb' }}
                className="w-12 h-12 rounded-full flex items-center justify-center mb-0.5"
              >
                <Calendar className="w-6 h-6 stroke-[1.8]" />
              </div>
              <div className="space-y-1">
                <p 
                  className="text-sm font-bold"
                  style={{ color: currentTheme?.textColor || '#1b4332' }}
                >
                  No tasks scheduled for {getDateLabel(currentDateIndex)}
                </p>
                <p 
                  className="text-xs"
                  style={{ color: currentTheme?.textColor || '#6e8a75', opacity: 0.75 }}
                >
                  Tap the + button to add a task
                </p>
              </div>
            </div>
          ) : (
            currentDayTasks.map((task) => {
              const ded = getDedication(task.dedicationId);
              const pStyle = getPriorityColorStyle(task.priority, currentTheme);
              const isPriority = task.priority && task.priority !== 'None';
              
              const cardBg = isPriority ? pStyle.bg : surfaceBg;
              const cardBorder = isPriority ? pStyle.border : borderColor;
              const cardTextColor = isPriority ? pStyle.text : (currentTheme?.textColor || '#1b4332');

              return (
                <div
                  key={task.id}
                  style={{
                    backgroundColor: cardBg,
                    borderColor: cardBorder,
                    color: cardTextColor,
                  }}
                  className={`group relative rounded-2xl p-4 border transition-all duration-200 shadow-xs hover:shadow-md ${
                    task.completed ? 'opacity-65' : ''
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Circular Complete Checkbox */}
                    <button
                      onClick={() => onToggleCompleteTask(task.id)}
                      title={task.completed ? 'Mark incomplete' : 'Complete task'}
                      aria-label={`Mark ${task.title} as ${task.completed ? 'incomplete' : 'completed'}`}
                      style={{
                        borderColor: isPriority ? pStyle.text : (task.completed ? '#52b788' : borderColor),
                        color: isPriority ? pStyle.text : '#ffffff',
                        backgroundColor: task.completed
                          ? (isPriority ? 'transparent' : '#52b788')
                          : (isPriority ? 'rgba(255, 255, 255, 0.25)' : 'transparent'),
                      }}
                      className="w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all shrink-0 active:scale-90 cursor-pointer"
                    >
                      {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>

                    {/* Task Info */}
                    <div 
                      onClick={() => setEditingTask(task)}
                      className="flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <h4 
                          style={{ color: cardTextColor }}
                          className={`text-base font-bold truncate ${
                            task.completed ? 'line-through opacity-70' : ''
                          }`}
                        >
                          {task.title}
                        </h4>

                        {/* Priority Badge color-coded with theme */}
                        {isPriority && (
                          <span
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.35)',
                              color: cardTextColor,
                              borderColor: pStyle.border,
                            }}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border shadow-2xs"
                          >
                            {task.priority}
                          </span>
                        )}

                        {/* Aging Indicator if present */}
                        {task.agingDays && task.agingDays > 0 ? (
                          <span className="text-[10px] font-semibold text-[#c2410c] bg-[#ffedd5] px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            +{task.agingDays}d aging
                          </span>
                        ) : null}

                        {/* Repeat Indicator if present */}
                        {task.repeat && task.repeat !== 'None' && (
                          <span 
                            style={{
                              backgroundColor: isPriority ? 'rgba(255, 255, 255, 0.3)' : 'rgba(132, 164, 203, 0.2)',
                              color: cardTextColor,
                            }}
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-md flex items-center gap-1"
                          >
                            <Repeat className="w-2.5 h-2.5" />
                            <span>{task.repeat}</span>
                          </span>
                        )}
                      </div>

                      {/* Time and Dedication Subline */}
                      <div 
                        style={{ color: cardTextColor, opacity: 0.85 }}
                        className="flex items-center gap-3 text-xs mt-1"
                      >
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5 opacity-80" />
                          {task.startTime} - {task.endTime} ({task.durationMinutes}m)
                        </span>

                        {ded && (
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                            style={{ 
                              backgroundColor: `${ded.color}25`, 
                              color: ded.color,
                              border: `1px solid ${ded.color}45`
                            }}
                          >
                            <Tag className="w-3 h-3" />
                            {ded.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        title="Delete task"
                        style={{ color: cardTextColor }}
                        className="p-2 opacity-60 hover:opacity-100 hover:bg-black/10 rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Week View: Full Color-Coded Weekly Timeline Grid */}
      {timeframe === 'Week' && (
        <WeeklyPlanView
          tasks={tasks}
          dedications={dedications}
          keywords={keywords}
          routines={routines}
          currentTheme={currentTheme}
          onToggleCompleteTask={onToggleCompleteTask}
          onAddTask={onAddTask}
          onDeleteTask={onDeleteTask}
          onAddKeyword={onAddKeyword}
          onSelectDayForDailyView={(dateStr) => {
            const [y, m, d] = dateStr.split('-').map(Number);
            const target = new Date(y, m - 1, d);
            const today = new Date();
            const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const diffDays = Math.round((target.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
            setCurrentDateIndex(diffDays);
          }}
        />
      )}

      {timeframe === 'Month' && (
        <MonthlyPlanView
          tasks={tasks}
          dedications={dedications}
          keywords={keywords}
          routines={routines}
          currentTheme={currentTheme}
          currentYear={new Date().getFullYear()}
          currentMonth={new Date().getMonth()}
          initialSelectedDateStr={selectedDateStr}
          onToggleCompleteTask={onToggleCompleteTask}
          onAddTask={onAddTask}
          onDeleteTask={onDeleteTask}
          onMonthChange={(year, month) => {
            const MONTH_NAMES = [
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'
            ];
            if (onMonthYearChange) {
              onMonthYearChange(`${MONTH_NAMES[month]} ${year}`);
            }
          }}
          onSelectDay={(dateStr) => {
            const [y, m, d] = dateStr.split('-').map(Number);
            const target = new Date(y, m - 1, d);
            const today = new Date();
            const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const diffDays = Math.round((target.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
            setCurrentDateIndex(diffDays);
          }}
        />
      )}

      {/* Floating Action Button (+) for Day view */}
      {timeframe === 'Day' && (
        <button
          id="add-task-fab"
          onClick={handleOpenAddModal}
          aria-label="Add Task"
          className="fixed bottom-6 right-6 z-30 w-14 h-14 bg-[#52b788] hover:bg-[#40916c] active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg transition-colors cursor-pointer"
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>
      )}

      {/* Full-Page New Task View matching the video exactly */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#fbf9f4] overflow-y-auto px-4 py-3 sm:py-6 animate-in fade-in duration-150">
          <NewTaskCard
            onSave={handleSaveNewTask}
            onCancel={() => setIsAddModalOpen(false)}
            onApplyRoutine={onApplyRoutine}
            dedications={dedications}
            keywords={keywords}
            routines={routines}
            initialStartTime={
              currentDayTasks.length > 0
                ? currentDayTasks[currentDayTasks.length - 1].endTime
                : '9:00 AM'
            }
            initialDuration={15}
            initialDateStr={selectedDateStr}
            targetDateLabel={getFullFormattedDate(currentDateIndex)}
          />
        </div>
      )}
      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          dedications={dedications}
          onSave={(updates) => {
            if (onUpdateTask) {
              onUpdateTask(editingTask.id, updates);
            }
            setEditingTask(null);
          }}
          onDelete={(taskId) => {
            onDeleteTask(taskId);
            setEditingTask(null);
          }}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
};
