import React from 'react';
import { CheckCircle2, RotateCcw, Award, Calendar, Sparkles, Trash2 } from 'lucide-react';
import { Task, ThemeConfig } from '../types';
import { getPriorityColorStyle } from '../utils/priorityColors';

interface AllDoneViewProps {
  completedTasks: Task[];
  currentTheme?: ThemeConfig;
  onUndoComplete: (taskId: string) => void;
  onClearHistory: () => void;
}

export const AllDoneView: React.FC<AllDoneViewProps> = ({
  completedTasks,
  currentTheme,
  onUndoComplete,
  onClearHistory,
}) => {
  return (
    <div className="flex-1 flex flex-col px-4 pt-2 pb-24 max-w-2xl mx-auto w-full">
      {/* Header Info */}
      <div className="flex items-center justify-between p-4 bg-white/80 rounded-2xl border border-[#d8edd9] shadow-xs mb-5">
        <div>
          <h3 className="text-base font-bold font-display text-[#1b4332] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#52b788]" />
            <span>Completed Priorities</span>
          </h3>
          <p className="text-xs text-[#52796f]">
            Give yourself credit for making steady progress.
          </p>
        </div>

        {completedTasks.length > 0 && (
          <button
            onClick={onClearHistory}
            className="text-xs font-semibold text-[#52796f] hover:text-[#dc2626] px-2.5 py-1 rounded-lg hover:bg-[#fee2e2]/50 transition-all"
          >
            Clear
          </button>
        )}
      </div>

      {completedTasks.length === 0 ? (
        <div className="py-20 text-center bg-white/40 rounded-3xl border border-dashed border-[#cbe5d0] p-6">
          <Award className="w-12 h-12 text-[#52b788] mx-auto mb-3 opacity-70" />
          <h4 className="text-base font-bold text-[#1b4332]">No completed tasks yet</h4>
          <p className="text-xs text-[#52796f] mt-1 max-w-xs mx-auto">
            Tasks and priorities you check off in your Daily Plan or Flow timer will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {completedTasks.map((task) => {
            const pStyle = getPriorityColorStyle(task.priority, currentTheme);
            return (
              <div
                key={task.id}
                className="bg-white/95 backdrop-blur-xs rounded-2xl p-4 border border-black/10 shadow-xs flex items-center justify-between hover:border-black/20 transition-all"
                style={task.priority && task.priority !== 'None' ? { borderLeftWidth: '4px', borderLeftColor: pStyle.bg } : undefined}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#eaf5ec] text-[#40916c] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 fill-[#52b788]/20" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-[#1b4332] truncate">
                      {task.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#52796f] mt-0.5">
                      {task.priority !== 'None' && (
                        <span 
                          style={{
                            backgroundColor: pStyle.bg,
                            color: pStyle.text,
                            borderColor: pStyle.border,
                          }}
                          className="font-bold text-[10px] px-2 py-0.5 rounded-full border shadow-2xs uppercase"
                        >
                          {task.priority}
                        </span>
                      )}
                      <span>• Completed on {task.completedAt || 'Today'}</span>
                    </div>
                  </div>
                </div>

              {/* Undo Button */}
              <button
                onClick={() => onUndoComplete(task.id)}
                title="Restore task to active plan"
                aria-label={`Undo ${task.title}`}
                className="p-2 text-[#40916c] hover:bg-[#eaf5ec] active:scale-90 rounded-xl transition-all"
              >
                <RotateCcw className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
