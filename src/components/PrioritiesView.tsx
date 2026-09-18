import React, { useState, useMemo } from 'react';
import { 
  MoreVertical, 
  Plus, 
  Clock, 
  Check, 
  ChevronDown,
  ChevronUp,
  Trash2,
  Calendar as CalendarIcon,
  Tag
} from 'lucide-react';
import { Task, PriorityLevel, Dedication, Keyword, Routine, ThemeConfig } from '../types';
import { getPriorityColorStyle, getSurfaceBg, getBorderColor } from '../utils/priorityColors';
import { formatLocalDateToIso } from '../utils/time';
import { NewTaskCard } from './NewTaskCard';
import { EditTaskModal } from './EditTaskModal';

interface PrioritiesViewProps {
  tasks: Task[];
  dedications?: Dedication[];
  keywords?: Keyword[];
  routines?: Routine[];
  currentTheme?: ThemeConfig;
  onToggleCompleteTask: (taskId: string) => void;
  onAddTask: (task: Omit<Task, 'id' | 'completed'>) => void;
  onDeleteTask?: (taskId: string) => void;
  onUpdateTaskPriority: (taskId: string, priority: PriorityLevel) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
}

export const PrioritiesView: React.FC<PrioritiesViewProps> = ({
  tasks,
  dedications = [],
  keywords = [],
  routines = [],
  currentTheme,
  onToggleCompleteTask,
  onAddTask,
  onDeleteTask,
  onUpdateTaskPriority,
  onUpdateTask,
}) => {
  const [sortBy, setSortBy] = useState<'Priority' | 'Time' | 'Aging' | 'Title'>('Priority');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Accordion states: default to expanded (showing ChevronUp as seen in screenshot)
  const [isHighExpanded, setIsHighExpanded] = useState(true);
  const [isMediumExpanded, setIsMediumExpanded] = useState(true);
  const [isLowExpanded, setIsLowExpanded] = useState(true);

  // Filter tasks by priority and sort
  const sortTasks = (list: Task[]) => {
    return [...list].sort((a, b) => {
      if (sortBy === 'Title') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'Time') {
        return a.startTime.localeCompare(b.startTime);
      }
      if (sortBy === 'Aging') {
        return (b.agingDays || 0) - (a.agingDays || 0);
      }
      return 0;
    });
  };

  const surfaceBg = getSurfaceBg(currentTheme);
  const borderColor = getBorderColor(currentTheme);

  const highTasks = useMemo(() => sortTasks(tasks.filter(t => t.priority === 'High' && !t.completed)), [tasks, sortBy]);
  const mediumTasks = useMemo(() => sortTasks(tasks.filter(t => t.priority === 'Medium' && !t.completed)), [tasks, sortBy]);
  const lowTasks = useMemo(() => sortTasks(tasks.filter(t => t.priority === 'Low' && !t.completed)), [tasks, sortBy]);

  const renderTaskItem = (task: Task) => {
    const todayStr = formatLocalDateToIso();
    const isToday = task.date === todayStr || !task.date || task.date === '2026-09-17';
    const dateDisplay = isToday ? 'Today' : task.date;

    const pStyle = getPriorityColorStyle(task.priority, currentTheme);

    return (
      <div
        key={task.id}
        onClick={() => setEditingTask(task)}
        style={{
          backgroundColor: pStyle.bg,
          color: pStyle.text,
          borderColor: pStyle.border,
        }}
        className="rounded-2xl p-4 border shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3 cursor-pointer group"
      >
        <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompleteTask(task.id);
            }}
            style={{
              borderColor: pStyle.text,
              color: pStyle.text,
              backgroundColor: task.completed ? 'transparent' : 'rgba(255, 255, 255, 0.25)',
            }}
            className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 active:scale-90 transition-all cursor-pointer mt-0.5 sm:mt-0"
          >
            {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 
                style={{ color: pStyle.text }}
                className="text-[16.5px] font-bold truncate"
              >
                {task.title}
              </h4>
              {task.priority && task.priority !== 'None' && (
                <span
                  style={{
                    backgroundColor: pStyle.border,
                    color: pStyle.text,
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                  }}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border shadow-2xs shrink-0 opacity-90"
                >
                  {task.priority}
                </span>
              )}
            </div>
            <div style={{ color: pStyle.text, opacity: 0.85 }} className="text-xs mt-0.5 font-medium">
              {task.startTime} - {task.endTime}
            </div>
            <div style={{ color: pStyle.text, opacity: 0.75 }} className="text-xs mt-0.5 font-medium">
              {dateDisplay}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      className="flex-1 flex flex-col w-full min-h-[calc(100vh-65px)] relative pb-28 select-none transition-colors duration-200"
      style={{
        backgroundColor: currentTheme?.bgColor,
        color: currentTheme?.textColor,
      }}
    >
      {/* Subheader / Toolbar Row */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h2 
          style={{ color: currentTheme?.textColor }}
          className="text-[19px] font-bold tracking-tight"
        >
          Priorities
        </h2>

        <div className="flex items-center gap-3 relative">
          {/* Sort Menu Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsSortMenuOpen(!isSortMenuOpen);
                setIsMoreMenuOpen(false);
              }}
              style={{
                backgroundColor: surfaceBg,
                borderColor: borderColor,
                color: currentTheme?.textColor,
              }}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl border shadow-2xs cursor-pointer active:scale-95 transition-all"
            >
              <span>Sort: {sortBy}</span>
              <ChevronDown className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>

            {isSortMenuOpen && (
              <div 
                style={{
                  backgroundColor: surfaceBg,
                  borderColor: borderColor,
                  color: currentTheme?.textColor,
                }}
                className="absolute right-0 top-full mt-1.5 w-36 rounded-2xl shadow-xl border py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100"
              >
                {(['Priority', 'Time', 'Aging', 'Title'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setSortBy(option);
                      setIsSortMenuOpen(false);
                    }}
                    style={{ color: currentTheme?.textColor }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold cursor-pointer hover:opacity-80 ${
                      sortBy === option ? 'font-bold opacity-100' : 'opacity-70'
                    }`}
                  >
                    Sort: {option}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Three dots menu button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsMoreMenuOpen(!isMoreMenuOpen);
                setIsSortMenuOpen(false);
              }}
              style={{ color: currentTheme?.textColor }}
              className="p-1 rounded-lg active:scale-90 transition-all cursor-pointer hover:opacity-75"
              aria-label="More Options"
            >
              <MoreVertical className="w-5 h-5 stroke-[2]" />
            </button>

            {isMoreMenuOpen && (
              <div 
                style={{
                  backgroundColor: surfaceBg,
                  borderColor: borderColor,
                  color: currentTheme?.textColor,
                }}
                className="absolute right-0 top-full mt-1.5 w-40 rounded-2xl shadow-xl border py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100"
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsHighExpanded(true);
                    setIsMediumExpanded(true);
                    setIsLowExpanded(true);
                    setIsMoreMenuOpen(false);
                  }}
                  style={{ color: currentTheme?.textColor }}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold hover:opacity-75 cursor-pointer"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsHighExpanded(false);
                    setIsMediumExpanded(false);
                    setIsLowExpanded(false);
                    setIsMoreMenuOpen(false);
                  }}
                  style={{ color: currentTheme?.textColor }}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold hover:opacity-75 cursor-pointer"
                >
                  Collapse All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(true);
                    setIsMoreMenuOpen(false);
                  }}
                  style={{ color: currentTheme?.textColor }}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold hover:opacity-75 cursor-pointer"
                >
                  Add New Task
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Priority Accordion Sections */}
      <div className="pt-2">
        {/* High Section */}
        <div>
          <div
            onClick={() => setIsHighExpanded(!isHighExpanded)}
            className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:opacity-85 active:opacity-70 transition-opacity"
          >
            <div className="flex items-center gap-2.5">
              <span 
                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs border border-black/10" 
                style={{ backgroundColor: getPriorityColorStyle('High', currentTheme).bg }} 
              />
              <span className="text-[17px] font-semibold" style={{ color: currentTheme?.textColor }}>
                High
              </span>
            </div>
            {isHighExpanded ? (
              <ChevronUp className="w-5 h-5 stroke-[2.2]" style={{ color: currentTheme?.textColor }} />
            ) : (
              <ChevronDown className="w-5 h-5 stroke-[2.2]" style={{ color: currentTheme?.textColor }} />
            )}
          </div>
          {isHighExpanded && highTasks.length > 0 && (
            <div className="px-5 pb-3 pt-1 space-y-2.5 animate-in fade-in duration-150">
              {highTasks.map(renderTaskItem)}
            </div>
          )}
        </div>

        {/* Medium Section */}
        <div>
          <div
            onClick={() => setIsMediumExpanded(!isMediumExpanded)}
            className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:opacity-85 active:opacity-70 transition-opacity"
          >
            <div className="flex items-center gap-2.5">
              <span 
                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs border border-black/10" 
                style={{ backgroundColor: getPriorityColorStyle('Medium', currentTheme).bg }} 
              />
              <span className="text-[17px] font-semibold" style={{ color: currentTheme?.textColor }}>
                Medium
              </span>
            </div>
            {isMediumExpanded ? (
              <ChevronUp className="w-5 h-5 stroke-[2.2]" style={{ color: currentTheme?.textColor }} />
            ) : (
              <ChevronDown className="w-5 h-5 stroke-[2.2]" style={{ color: currentTheme?.textColor }} />
            )}
          </div>
          {isMediumExpanded && mediumTasks.length > 0 && (
            <div className="px-5 pb-3 pt-1 space-y-2.5 animate-in fade-in duration-150">
              {mediumTasks.map(renderTaskItem)}
            </div>
          )}
        </div>

        {/* Low Section */}
        <div>
          <div
            onClick={() => setIsLowExpanded(!isLowExpanded)}
            className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:opacity-85 active:opacity-70 transition-opacity"
          >
            <div className="flex items-center gap-2.5">
              <span 
                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs border border-black/10" 
                style={{ backgroundColor: getPriorityColorStyle('Low', currentTheme).bg }} 
              />
              <span className="text-[17px] font-semibold" style={{ color: currentTheme?.textColor }}>
                Low
              </span>
            </div>
            {isLowExpanded ? (
              <ChevronUp className="w-5 h-5 stroke-[2.2]" style={{ color: currentTheme?.textColor }} />
            ) : (
              <ChevronDown className="w-5 h-5 stroke-[2.2]" style={{ color: currentTheme?.textColor }} />
            )}
          </div>
          {isLowExpanded && lowTasks.length > 0 && (
            <div className="px-5 pb-3 pt-1 space-y-2.5 animate-in fade-in duration-150">
              {lowTasks.map(renderTaskItem)}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button (+) */}
      <button
        id="priorities-add-fab"
        type="button"
        onClick={() => setIsAddModalOpen(true)}
        aria-label="Add Priority Task"
        style={{
          backgroundColor: currentTheme?.primaryColor || '#000000',
          color: currentTheme?.bgColor || '#ffffff',
        }}
        className="fixed bottom-8 right-6 sm:bottom-10 sm:right-10 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all z-40 cursor-pointer active:scale-95"
      >
        <Plus className="w-7 h-7 stroke-[2.2]" />
      </button>

      {/* Edit Task Modal overlay */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          dedications={dedications}
          onSave={(updates) => {
            if (onUpdateTask) {
              onUpdateTask(editingTask.id, updates);
            } else if (updates.priority && updates.priority !== editingTask.priority) {
              onUpdateTaskPriority(editingTask.id, updates.priority);
            }
            setEditingTask(null);
          }}
          onDelete={(taskId) => {
            if (onDeleteTask) {
              onDeleteTask(taskId);
            }
            setEditingTask(null);
          }}
          onClose={() => setEditingTask(null)}
        />
      )}

      {/* Add Task Modal overlay */}
      {isAddModalOpen && (
        <div 
          style={{ backgroundColor: currentTheme?.bgColor }}
          className="fixed inset-0 z-50 overflow-y-auto px-4 py-3 sm:py-6 animate-in fade-in duration-150"
        >
          <NewTaskCard
            initialDateStr={new Date().toISOString().split('T')[0]}
            targetDateLabel="Today"
            dedications={dedications}
            keywords={keywords}
            routines={routines}
            currentTheme={currentTheme}
            onCancel={() => setIsAddModalOpen(false)}
            onSave={(taskData) => {
              onAddTask({
                ...taskData,
                date: taskData.date || new Date().toISOString().split('T')[0],
              });
              setIsAddModalOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
};
