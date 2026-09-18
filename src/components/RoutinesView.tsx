import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  Plus, 
  X, 
  Check, 
  ChevronDown, 
  Clock, 
  Trash2, 
  ArrowUpDown,
  Pencil
} from 'lucide-react';
import { Routine, Keyword, PriorityLevel, ThemeConfig } from '../types';
import { getPriorityColorStyle } from '../utils/priorityColors';
import { parseDurationToMinutes } from '../utils/duration';

interface RoutinesViewProps {
  routines: Routine[];
  keywords: Keyword[];
  currentTheme?: ThemeConfig;
  onAddRoutine: (routine: Omit<Routine, 'id'>) => void;
  onUpdateRoutine?: (routine: Routine) => void;
  onDeleteRoutine?: (routineId: string) => void;
  onAddKeyword?: (keyword: Omit<Keyword, 'id'>) => void;
}

export const RoutinesView: React.FC<RoutinesViewProps> = ({
  routines,
  keywords,
  currentTheme,
  onAddRoutine,
  onUpdateRoutine,
  onDeleteRoutine,
  onAddKeyword,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [routineName, setRoutineName] = useState('');
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<string[]>([]);
  const [keywordSort, setKeywordSort] = useState<'Alphabetical' | 'Usage'>('Alphabetical');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Quick inline add keyword state (if user has no keywords yet)
  const [isQuickAddKeywordOpen, setIsQuickAddKeywordOpen] = useState(false);
  const [quickKeywordName, setQuickKeywordName] = useState('');
  const [quickKeywordDuration, setQuickKeywordDuration] = useState(30);

  // Open modal to create a new routine
  const handleOpenAdd = () => {
    setEditingRoutine(null);
    setRoutineName('');
    setSelectedKeywordIds([]);
    setIsModalOpen(true);
  };

  // Open modal to edit an existing routine
  const handleOpenEdit = (routine: Routine) => {
    setEditingRoutine(routine);
    setRoutineName(routine.name);

    // Map routine's tasks to corresponding keyword IDs
    const ids: string[] = [];
    routine.taskKeywords.forEach((tk) => {
      const match = keywords.find(
        (k) => k.id === tk.keywordId || k.name.toLowerCase() === tk.title.toLowerCase()
      );
      if (match && !ids.includes(match.id)) {
        ids.push(match.id);
      } else if (tk.keywordId && !ids.includes(tk.keywordId)) {
        ids.push(tk.keywordId);
      }
    });
    setSelectedKeywordIds(ids);
    setIsModalOpen(true);
  };

  // Sort keywords Alphabetically or by Usage
  const sortedKeywords = useMemo(() => {
    const list = [...keywords];
    if (keywordSort === 'Alphabetical') {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      return list.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    }
  }, [keywords, keywordSort]);

  // Preview total minutes of selected keywords
  const previewTotalMinutes = useMemo(() => {
    return selectedKeywordIds.reduce((sum, id) => {
      const kw = keywords.find((k) => k.id === id);
      return sum + (kw?.durationMinutes || 30);
    }, 0);
  }, [selectedKeywordIds, keywords]);

  // Toggle keyword selection (add or remove from routine)
  const handleToggleKeyword = (keywordId: string) => {
    setSelectedKeywordIds((prev) =>
      prev.includes(keywordId)
        ? prev.filter((id) => id !== keywordId)
        : [...prev, keywordId]
    );
  };

  // Handle Save Routine (Create or Edit)
  const handleSaveRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineName.trim() || selectedKeywordIds.length === 0) return;

    // Ordered list of selected keyword items
    const taskKeywords = selectedKeywordIds
      .map((id) => keywords.find((k) => k.id === id))
      .filter((k): k is Keyword => !!k)
      .map((k) => ({
        keywordId: k.id,
        title: k.name,
        durationMinutes: k.durationMinutes || 30,
        priority: k.priority || 'None',
      }));

    const totalMinutes = taskKeywords.reduce((sum, item) => sum + item.durationMinutes, 0);

    if (editingRoutine && onUpdateRoutine) {
      onUpdateRoutine({
        ...editingRoutine,
        name: routineName.trim(),
        taskKeywords,
        totalMinutes,
        points: taskKeywords.length,
      });
    } else {
      onAddRoutine({
        name: routineName.trim(),
        taskKeywords,
        totalMinutes,
        points: taskKeywords.length,
      });
    }

    setRoutineName('');
    setSelectedKeywordIds([]);
    setEditingRoutine(null);
    setIsModalOpen(false);
  };

  // Handle Quick Inline Keyword Creation
  const handleCreateQuickKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickKeywordName.trim() || !onAddKeyword) return;

    onAddKeyword({
      name: quickKeywordName.trim(),
      durationMinutes: quickKeywordDuration || 30,
      priority: 'None',
      usageCount: 0,
    });

    setQuickKeywordName('');
    setIsQuickAddKeywordOpen(false);
  };

  const isSaveDisabled = !routineName.trim() || selectedKeywordIds.length === 0;

  return (
    <div className="flex-1 flex flex-col w-full max-w-2xl mx-auto min-h-[calc(100vh-65px)] relative pb-28 select-none transition-colors duration-200">
      {/* Main Content Area */}
      {routines.length === 0 ? (
        /* Empty State matching Screenshot_20260917_203837_Priorities.jpg */
        <div className="flex-1 flex flex-col items-center justify-center py-28 px-6 text-center animate-in fade-in duration-150">
          <div className="w-18 h-18 rounded-full border border-[#cbd5e1] flex items-center justify-center bg-white/40 mb-4 shadow-2xs">
            <Layers className="w-8 h-8 text-[#94a3b8] stroke-[1.8]" />
          </div>
          <h3 className="text-xl font-bold text-[#2c3e50] tracking-tight" style={{ color: currentTheme?.textColor }}>
            No routines yet
          </h3>
          <p className="text-sm opacity-75 max-w-[300px] mt-2 leading-relaxed" style={{ color: currentTheme?.textColor }}>
            Combine keywords into a routine to see your repeatable plans.
          </p>
        </div>
      ) : (
        /* Routines list */
        <div className="p-4 sm:p-6 space-y-4 max-w-2xl mx-auto w-full">
          {routines.map((routine) => (
            <div
              key={routine.id}
              onClick={() => handleOpenEdit(routine)}
              className="bg-white/95 backdrop-blur-xs rounded-2xl p-5 border border-black/10 shadow-xs hover:shadow-md transition-all space-y-3.5 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-bold text-[#1e293b]">
                    {routine.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-[#64748b] mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-[#64748b]" />
                    <span>{routine.totalMinutes} min total</span>
                    <span>•</span>
                    <span>{routine.taskKeywords.length} tasks</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(routine)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#334155] text-xs font-semibold transition-all cursor-pointer active:scale-95"
                    title="Edit routine"
                  >
                    <Pencil className="w-3.5 h-3.5 text-[#64748b]" />
                    <span>Edit</span>
                  </button>

                  {onDeleteRoutine && (
                    <button
                      type="button"
                      onClick={() => onDeleteRoutine(routine.id)}
                      className="p-1.5 text-[#94a3b8] hover:text-[#ef4444] rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      title="Delete routine"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Task Keywords List preview */}
              <div className="flex flex-wrap gap-2 pt-1 border-t border-[#f1f5f9]">
                {routine.taskKeywords.map((item, idx) => {
                  const pStyle = item.priority && item.priority !== 'None' 
                    ? getPriorityColorStyle(item.priority, currentTheme) 
                    : null;
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#f8fafc] text-xs font-semibold text-[#334155] border border-[#e2e8f0]"
                    >
                      {pStyle && (
                        <span 
                          className="w-2 h-2 rounded-full shrink-0 shadow-2xs" 
                          style={{ backgroundColor: pStyle.bg }} 
                        />
                      )}
                      <span>{item.title}</span>
                      <span className="text-[10px] text-[#64748b]">({item.durationMinutes}m)</span>
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button (+) matching screenshot */}
      <button
        id="routine-add-fab"
        type="button"
        onClick={handleOpenAdd}
        aria-label="Add Routine"
        className="fixed bottom-8 right-6 sm:bottom-10 sm:right-10 w-14 h-14 rounded-full bg-[#84a4cb] hover:bg-[#7496be] active:scale-95 text-white shadow-lg flex items-center justify-center transition-all z-40 cursor-pointer"
      >
        <Plus className="w-7 h-7 stroke-[2.2]" />
      </button>

      {/* Add / Edit Routine Bottom Sheet Modal (matching Screenshot_20260917_203837_Priorities.jpg) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => {
            setIsModalOpen(false);
            setEditingRoutine(null);
          }}
        >
          <div
            className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Title, Description, and Close X button */}
            <div className="flex items-start justify-between pb-3">
              <div>
                <h3 className="text-xl font-bold text-[#1e293b]">
                  {editingRoutine ? 'Edit routine' : 'New routine'}
                </h3>
                <p className="text-[13.5px] text-[#64748b] mt-1">
                  {editingRoutine 
                    ? 'Add or remove saved keyword tasks to customize this routine.' 
                    : 'Choose the saved keywords to stack into this routine.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingRoutine(null);
                }}
                className="p-1 -mr-1 text-[#64748b] hover:text-[#1e293b] rounded-lg active:scale-90 transition-all cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5 stroke-[2.2]" />
              </button>
            </div>

            {/* Scrollable Form Content */}
            <form onSubmit={handleSaveRoutine} className="flex-1 overflow-y-auto space-y-6 pt-2 pb-4">
              {/* Routine Name Input */}
              <div>
                <label className="block text-xs font-normal text-[#64748b] mb-1">
                  Routine name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={routineName}
                  onChange={(e) => setRoutineName(e.target.value)}
                  placeholder="e.g. Morning start"
                  className="w-full text-base text-[#1e293b] border-b border-[#cbd5e1] focus:border-[#2563eb] pb-2 outline-none bg-transparent transition-colors placeholder:text-gray-300"
                />
              </div>

              {/* Keywords Section Header with Sort Selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-[#1e293b]">
                    Keywords {selectedKeywordIds.length > 0 && (
                      <span className="text-xs font-normal text-[#64748b] ml-1">
                        ({selectedKeywordIds.length} selected · {previewTotalMinutes}m)
                      </span>
                    )}
                  </h4>

                  {/* Sort: Alphabetically or by usage */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                      className="flex items-center gap-1.5 text-xs font-medium text-[#475569] hover:text-[#1e293b] py-1 px-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#64748b]" />
                      <span>Sort: {keywordSort === 'Alphabetical' ? 'Alphabetical' : 'By Usage'}</span>
                      <ChevronDown className="w-3 h-3 text-[#64748b]" />
                    </button>

                    {isSortDropdownOpen && (
                      <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-xl border border-[#ebe7df] py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                        <button
                          type="button"
                          onClick={() => {
                            setKeywordSort('Alphabetical');
                            setIsSortDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-gray-50 cursor-pointer ${
                            keywordSort === 'Alphabetical' ? 'text-[#2563eb] bg-[#eff6ff]' : 'text-[#334155]'
                          }`}
                        >
                          Alphabetical
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setKeywordSort('Usage');
                            setIsSortDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-gray-50 cursor-pointer ${
                            keywordSort === 'Usage' ? 'text-[#2563eb] bg-[#eff6ff]' : 'text-[#334155]'
                          }`}
                        >
                          By Usage
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Keywords List or Empty State */}
                {sortedKeywords.length === 0 ? (
                  <div className="p-5 rounded-2xl border border-dashed border-[#cbd5e1] bg-[#faf8f3] text-center space-y-3">
                    <p className="text-xs text-[#64748b]">
                      No keywords yet. Add keywords to stack them into routines.
                    </p>
                    {onAddKeyword && (
                      <button
                        type="button"
                        onClick={() => setIsQuickAddKeywordOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#84a4cb] hover:bg-[#7496be] text-white text-xs font-semibold shadow-xs cursor-pointer active:scale-95 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Add First Keyword</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {sortedKeywords.map((kw) => {
                      const isSelected = selectedKeywordIds.includes(kw.id);
                      return (
                        <div
                          key={kw.id}
                          onClick={() => handleToggleKeyword(kw.id)}
                          className={`border rounded-2xl p-4 bg-white flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] select-none ${
                            isSelected ? 'border-[#84a4cb] bg-[#f0f5fb]/50' : 'border-[#e2e8f0] hover:border-[#cbd5e1]'
                          }`}
                        >
                          <div>
                            <h5 className="text-[15px] font-semibold text-[#1e293b]">
                              {kw.name}
                            </h5>
                            <p className="text-[12.5px] text-[#64748b] mt-0.5">
                              {kw.durationMinutes || 30} min · {kw.priority && kw.priority !== 'None' ? `${kw.priority} priority` : 'No priority'}
                              {keywordSort === 'Usage' && kw.usageCount !== undefined && (
                                <span className="ml-1 text-[11px] text-[#94a3b8]">(Used {kw.usageCount}x)</span>
                              )}
                            </p>
                          </div>

                          {/* Selection Circle indicator matching Screenshot 2 */}
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? 'border-[#84a4cb] bg-[#84a4cb] text-white'
                                : 'border-[#94a3b8] bg-transparent'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Inline Keyword Creator Dialog if clicked */}
              {isQuickAddKeywordOpen && (
                <div className="p-4 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] space-y-3 animate-in fade-in duration-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1e293b]">Create New Keyword</span>
                    <button
                      type="button"
                      onClick={() => setIsQuickAddKeywordOpen(false)}
                      className="text-xs text-[#64748b] hover:text-[#1e293b]"
                    >
                      Cancel
                    </button>
                  </div>
                  <input
                    type="text"
                    value={quickKeywordName}
                    onChange={(e) => setQuickKeywordName(e.target.value)}
                    placeholder="Keyword name (e.g. Shower, Reading)"
                    className="w-full text-sm bg-white border border-[#cbd5e1] rounded-xl p-2 outline-none focus:border-[#2563eb]"
                  />
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-[#64748b] mr-1">Duration:</span>
                      {[15, 30, 45, 60].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setQuickKeywordDuration(mins)}
                          className={`px-2 py-0.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                            quickKeywordDuration === mins
                              ? 'bg-[#84a4cb] text-white border-[#84a4cb]'
                              : 'bg-white text-[#475569] border-[#cbd5e1] hover:bg-gray-50'
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                      <div className="flex items-center gap-1.5 bg-white border border-[#cbd5e1] rounded-lg px-2 py-0.5 ml-1">
                        <input
                          type="text"
                          value={quickKeywordDuration}
                          onChange={(e) => {
                            const parsed = parseDurationToMinutes(e.target.value, -1);
                            if (parsed > 0) setQuickKeywordDuration(parsed);
                          }}
                          placeholder="min"
                          className="w-10 text-xs text-center font-bold text-[#1e293b] outline-none"
                          aria-label="Custom minutes"
                        />
                        <span className="text-[11px] text-[#64748b]">min</span>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleCreateQuickKeyword}
                        disabled={!quickKeywordName.trim()}
                        className="px-3 py-1.5 rounded-xl bg-[#84a4cb] text-white text-xs font-bold disabled:opacity-40 shadow-xs active:scale-95 cursor-pointer"
                      >
                        Save Keyword
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Routine Button matching Screenshot 2 */}
              <button
                type="submit"
                disabled={isSaveDisabled}
                className={`w-full py-3.5 rounded-2xl font-semibold text-center transition-all shadow-xs ${
                  isSaveDisabled
                    ? 'bg-[#ede8df] text-[#9ca3af] cursor-not-allowed'
                    : 'bg-[#84a4cb] hover:bg-[#7496be] active:scale-[0.99] text-white cursor-pointer'
                }`}
              >
                {editingRoutine ? 'Save Changes' : 'Save Routine'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
