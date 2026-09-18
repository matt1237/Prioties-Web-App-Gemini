import React, { useEffect } from 'react';
import { Trash2, Calendar, Repeat, X } from 'lucide-react';
import { Task } from '../types';

interface DeleteRepeatTaskModalProps {
  task: Task | null;
  followingCount: number;
  onDeleteOnlyThis: () => void;
  onDeleteAllFollowing: () => void;
  onClose: () => void;
}

export const DeleteRepeatTaskModal: React.FC<DeleteRepeatTaskModalProps> = ({
  task,
  followingCount,
  onDeleteOnlyThis,
  onDeleteAllFollowing,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!task) return null;

  // Format date display
  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return 'this date';
    const [y, m, d] = dateStr.split('-').map(Number);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formattedDate = formatDateDisplay(task.date);

  return (
    <div
      id="delete-repeat-task-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="delete-repeat-task-modal-card"
        className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 border border-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/70 shrink-0">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1e293b] leading-snug">
                Delete repeating task
              </h3>
              <p className="text-xs text-[#64748b]">
                {task.repeat ? `Repeats ${task.repeat.toLowerCase()}` : 'Recurring task'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#64748b] hover:text-[#1e293b] hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Task Info Pill */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
          <div className="text-sm font-semibold text-[#1e293b] truncate">
            {task.title}
          </div>
          <div className="flex items-center gap-2 text-xs text-[#64748b]">
            <span className="font-medium">{task.startTime}</span>
            <span>•</span>
            <span>{formattedDate}</span>
            {task.repeat && (
              <>
                <span>•</span>
                <span className="bg-[#84a4cb]/15 text-[#3b618f] font-medium px-2 py-0.5 rounded-md">
                  {task.repeat}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Question */}
        <p className="text-sm text-[#475569] leading-relaxed">
          This task is part of a repeat schedule. How would you like to delete it?
        </p>

        {/* Option Cards */}
        <div className="space-y-2.5">
          {/* Option 1: Just that one */}
          <button
            id="delete-repeat-task-only-btn"
            type="button"
            onClick={onDeleteOnlyThis}
            className="w-full text-left p-3.5 sm:p-4 rounded-2xl border border-slate-200 hover:border-[#84a4cb] hover:bg-slate-50/80 active:scale-[0.99] transition-all cursor-pointer flex items-start gap-3.5 group"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-[#84a4cb]/15 group-hover:text-[#3b618f] text-slate-600 flex items-center justify-center shrink-0 transition-colors">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-[#1e293b] group-hover:text-[#1e293b]">
                Delete this task only
              </div>
              <div className="text-xs text-[#64748b] mt-0.5 leading-normal">
                Only delete on {formattedDate}. All other repeat occurrences will stay.
              </div>
            </div>
          </button>

          {/* Option 2: All following */}
          <button
            id="delete-repeat-all-following-btn"
            type="button"
            onClick={onDeleteAllFollowing}
            className="w-full text-left p-3.5 sm:p-4 rounded-2xl border border-rose-200 bg-rose-50/30 hover:bg-rose-50 hover:border-rose-300 active:scale-[0.99] transition-all cursor-pointer flex items-start gap-3.5 group"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 group-hover:bg-rose-200/80 transition-colors">
              <Trash2 className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-rose-700 flex items-center gap-1.5 flex-wrap">
                <span>Delete all following repeat tasks</span>
                {followingCount > 0 && (
                  <span className="text-[11px] font-semibold bg-rose-200/70 text-rose-800 px-2 py-0.5 rounded-full">
                    +{followingCount} following
                  </span>
                )}
              </div>
              <div className="text-xs text-rose-600/90 mt-0.5 leading-normal">
                Delete this task and all upcoming repeat tasks from {formattedDate} onward.
              </div>
            </div>
          </button>
        </div>

        {/* Footer Cancel */}
        <div className="pt-1">
          <button
            id="delete-repeat-cancel-btn"
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#475569] font-semibold text-xs sm:text-sm transition-all cursor-pointer active:scale-98"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
