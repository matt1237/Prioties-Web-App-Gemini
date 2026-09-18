import React, { useState, useMemo } from 'react';
import { 
  Star, 
  Plus, 
  ChevronDown, 
  X, 
  EyeOff, 
  Eye, 
  Trash2 
} from 'lucide-react';
import { Dedication, Task, ThemeConfig } from '../types';

interface DedicationsViewProps {
  dedications: Dedication[];
  completedTasks?: Task[];
  currentTheme?: ThemeConfig;
  onAddDedication: (dedication: Omit<Dedication, 'id' | 'score'>) => void;
  onUpdateDedication?: (dedicationId: string, updates: Partial<Dedication>) => void;
  onDeleteDedication?: (dedicationId: string) => void;
}

type TimeframeOption = 'Daily' | 'Weekly' | 'Monthly' | '90 Days' | 'This Year';

export const DedicationsView: React.FC<DedicationsViewProps> = ({
  dedications,
  completedTasks = [],
  currentTheme,
  onAddDedication,
  onUpdateDedication,
  onDeleteDedication,
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('Weekly');
  const [isTimeframeMenuOpen, setIsTimeframeMenuOpen] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  // Add Dedication Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Edit Dedication Bottom Sheet State
  const [editingDedication, setEditingDedication] = useState<Dedication | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMultiplier, setEditMultiplier] = useState<string>('1');

  // Filter visible dedications (allow showing hidden via toggle if needed)
  const visibleDedications = useMemo(() => {
    return dedications.filter((d) => (showHidden ? true : !d.hidden));
  }, [dedications, showHidden]);

  // Calculate score for each dedication based on selected timeframe and point multiplier (base: 1 pt per completed task)
  const getDedicationScore = (dedication: Dedication): number => {
    const multiplier = typeof dedication.pointMultiplier === 'number' && !isNaN(dedication.pointMultiplier) 
      ? dedication.pointMultiplier 
      : 1;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Filter tasks completed for this dedication within timeframe
    const matchingCompleted = completedTasks.filter((t) => {
      if (t.dedicationId !== dedication.id) return false;
      if (!t.completed) return false;

      const taskDateStr = t.date || (t.completedAt ? new Date(t.completedAt).toISOString().split('T')[0] : todayStr);
      const taskDate = new Date(taskDateStr);

      if (timeframe === 'Daily') {
        return taskDateStr === todayStr;
      }
      if (timeframe === 'Weekly') {
        const diffMs = now.getTime() - taskDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }
      if (timeframe === 'Monthly') {
        const diffMs = now.getTime() - taskDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 31;
      }
      if (timeframe === '90 Days') {
        const diffMs = now.getTime() - taskDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 90;
      }
      if (timeframe === 'This Year') {
        return taskDate.getFullYear() === now.getFullYear();
      }
      return true;
    });

    const calculatedPoints = matchingCompleted.length * 1 * multiplier;
    // Fall back to accumulated dedication.score if completed task history is empty
    const rawScore = completedTasks.length > 0 ? calculatedPoints : (dedication.score || 0);
    return Math.round(rawScore * 10) / 10;
  };

  // Open Edit Modal
  const handleOpenEdit = (ded: Dedication) => {
    setEditingDedication(ded);
    setEditName(ded.name);
    setEditDescription(ded.description || '');
    setEditMultiplier(ded.pointMultiplier !== undefined ? String(ded.pointMultiplier) : '1');
  };

  // Save New Dedication
  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    onAddDedication({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      color: '#84a4cb',
      weeklyTarget: 10,
      pointMultiplier: 1,
    });

    setNewName('');
    setNewDescription('');
    setIsAddOpen(false);
  };

  // Save Edit Changes
  const handleSaveEdit = () => {
    if (!editingDedication || !editName.trim() || !onUpdateDedication) return;

    const parsedMult = parseFloat(editMultiplier);
    const validMultiplier = !isNaN(parsedMult) && parsedMult >= 0 ? parsedMult : 1;

    onUpdateDedication(editingDedication.id, {
      name: editName.trim(),
      description: editDescription.trim() || undefined,
      pointMultiplier: validMultiplier,
    });

    setEditingDedication(null);
  };

  // Toggle Hide Dedication
  const handleToggleHide = () => {
    if (!editingDedication || !onUpdateDedication) return;
    onUpdateDedication(editingDedication.id, {
      hidden: !editingDedication.hidden,
    });
    setEditingDedication(null);
  };

  // Delete Dedication
  const handleDeleteDedication = () => {
    if (!editingDedication || !onDeleteDedication) return;
    onDeleteDedication(editingDedication.id);
    setEditingDedication(null);
  };

  return (
    <div className="flex-1 flex flex-col w-full min-h-[calc(100vh-65px)] relative pb-28 select-none transition-colors duration-200">
      {/* Subheader / Table Header Row */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-black/10">
        <span className="text-[15px] font-semibold text-[#2c3e50] tracking-tight" style={{ color: currentTheme?.textColor }}>
          Dedication
        </span>

        <div className="flex items-center gap-6 sm:gap-10">
          <span className="text-[15px] font-semibold text-[#2c3e50] w-10 text-center" style={{ color: currentTheme?.textColor }}>
            Score
          </span>

          {/* Timeframe Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsTimeframeMenuOpen(!isTimeframeMenuOpen)}
              className="flex items-center gap-1 text-[15px] font-medium text-[#2c3e50] hover:text-[#0f172a] active:scale-95 transition-all cursor-pointer py-1"
              style={{ color: currentTheme?.textColor }}
            >
              <span>{timeframe}</span>
              <ChevronDown className="w-3.5 h-3.5 stroke-[2.2] opacity-70" />
            </button>

            {isTimeframeMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-40 bg-white rounded-2xl shadow-xl border border-[#ebe7df] py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                {(['Daily', 'Weekly', 'Monthly', '90 Days', 'This Year'] as TimeframeOption[]).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setTimeframe(opt);
                      setIsTimeframeMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-[#f8fafc] transition-colors cursor-pointer ${
                      timeframe === opt ? 'text-[#2563eb] bg-[#eff6ff]' : 'text-[#334155]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {visibleDedications.length === 0 ? (
        /* Empty State matching screenshot & video */
        <div className="flex-1 flex flex-col items-center justify-center py-24 px-6 text-center animate-in fade-in duration-150">
          <div className="w-16 h-16 rounded-full border border-[#cbd5e1] flex items-center justify-center bg-white/40 mb-4 shadow-2xs">
            <Star className="w-7 h-7 text-[#94a3b8] stroke-[1.8]" />
          </div>
          <h3 className="text-lg font-bold text-[#2c3e50] tracking-tight">
            No dedications yet
          </h3>
          <p className="text-sm text-[#64748b] max-w-[280px] mt-2 leading-relaxed">
            Add a dedication to start tracking tasks toward your goals.
          </p>
        </div>
      ) : (
        /* Dedication items list */
        <div className="divide-y divide-[#ebe7df]/40">
          {visibleDedications.map((ded) => {
            const score = getDedicationScore(ded);
            return (
              <div
                key={ded.id}
                onClick={() => handleOpenEdit(ded)}
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-black/[0.02] active:bg-black/[0.04] transition-colors"
              >
                {/* Dedication Name & Description */}
                <div className="min-w-0 flex-1 pr-4">
                  <h4 className="text-[17px] font-bold text-[#1e293b] leading-tight truncate">
                    {ded.name}
                  </h4>
                  <p className="text-[13.5px] text-[#64748b] mt-1 truncate">
                    {ded.description || 'No description'}
                  </p>
                </div>

                {/* Score & Spacing aligned under Score & Timeframe headers */}
                <div className="flex items-center gap-6 sm:gap-10 shrink-0">
                  <div className="w-10 flex justify-center">
                    <div className="w-10 h-10 rounded-full bg-[#84a4cb] flex items-center justify-center text-white font-bold text-[15px] shadow-2xs">
                      {score}
                    </div>
                  </div>
                  {/* Empty placeholder spacer matching width of dropdown button */}
                  <div className="w-16 sm:w-20" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button (+) matching Priorities page & video */}
      <button
        id="dedication-add-fab"
        type="button"
        onClick={() => setIsAddOpen(true)}
        aria-label="Add Dedication"
        className="fixed bottom-8 right-6 sm:bottom-10 sm:right-10 w-14 h-14 rounded-full bg-[#84a4cb] hover:bg-[#7496be] active:scale-95 text-white shadow-lg flex items-center justify-center transition-all z-40 cursor-pointer"
      >
        <Plus className="w-7 h-7 stroke-[2.2]" />
      </button>

      {/* Add Dedication Modal Dialog (video 00:01 - 00:07) */}
      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsAddOpen(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-[#1e293b] mb-6">
              Add Dedication
            </h3>

            <form onSubmit={handleSaveAdd} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Fitness, Reading..."
                  className="w-full text-base text-[#1e293b] border-b border-[#cbd5e1] focus:border-[#2563eb] pb-2 outline-none bg-transparent transition-colors placeholder:text-gray-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full text-base text-[#1e293b] border-b border-[#cbd5e1] focus:border-[#2563eb] pb-2 outline-none bg-transparent transition-colors placeholder:text-gray-300"
                />
              </div>

              <div className="flex items-center justify-end gap-5 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="text-sm font-semibold text-[#64748b] hover:text-[#1e293b] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim()}
                  className="text-sm font-semibold text-[#84a4cb] hover:text-[#5c82b1] disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Dedication Bottom Sheet / Modal (Screenshot 00:13) */}
      {editingDedication && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setEditingDedication(null)}
        >
          <div
            className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Name and Close button */}
            <div className="flex items-center justify-between pb-3">
              <h3 className="text-xl font-bold text-[#1e293b]">
                {editingDedication.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingDedication(null)}
                className="p-1 text-[#64748b] hover:text-[#1e293b] rounded-lg active:scale-90 transition-all cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5 stroke-[2.2]" />
              </button>
            </div>

            {/* Inputs: Name, Description, Point Multiplier */}
            <div className="space-y-5 pt-2">
              <div>
                <label className="block text-sm font-medium text-[#475569] mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-base text-[#1e293b] border-b border-[#cbd5e1] focus:border-[#2563eb] pb-1.5 outline-none bg-transparent transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#475569] mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full text-base text-[#1e293b] border-b border-[#cbd5e1] focus:border-[#2563eb] pb-1.5 outline-none bg-transparent transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#475569] mb-1">
                  Point Multiplier
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={editMultiplier}
                  onChange={(e) => setEditMultiplier(e.target.value)}
                  className="w-full text-base text-[#1e293b] border-b border-[#cbd5e1] focus:border-[#2563eb] pb-1.5 outline-none bg-transparent transition-colors"
                />
                <p className="text-xs text-[#64748b] mt-1.5">
                  Multiply completed tasks for scoring. Decimals supported.
                </p>
              </div>

              {/* Save Changes Button */}
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={!editName.trim()}
                className="w-full py-3.5 mt-2 rounded-xl bg-[#84a4cb] hover:bg-[#7496be] active:scale-[0.99] text-white font-semibold text-center transition-all shadow-xs disabled:opacity-40 cursor-pointer"
              >
                Save Changes
              </button>
            </div>

            {/* Lower Actions: Hide dedication & Delete dedication */}
            <div className="border-t border-[#f1f5f9] mt-6 pt-4 space-y-3.5">
              <button
                type="button"
                onClick={handleToggleHide}
                className="flex items-center gap-3 text-sm font-medium text-[#475569] hover:text-[#1e293b] w-full text-left py-1 cursor-pointer"
              >
                {editingDedication.hidden ? (
                  <>
                    <Eye className="w-5 h-5 text-[#475569]" />
                    <span>Unhide dedication</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-5 h-5 text-[#475569]" />
                    <span>Hide dedication</span>
                  </>
                )}
              </button>

              {onDeleteDedication && (
                <button
                  type="button"
                  onClick={handleDeleteDedication}
                  className="flex items-center gap-3 text-sm font-medium text-[#f87171] hover:text-[#ef4444] w-full text-left py-1 cursor-pointer"
                >
                  <Trash2 className="w-5 h-5 text-[#f87171]" />
                  <span>Delete dedication...</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
