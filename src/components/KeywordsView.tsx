import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Clock, 
  Pencil,
  X,
  Star,
  ChevronDown
} from 'lucide-react';
import { Keyword, Dedication, PriorityLevel, Task, ThemeConfig } from '../types';
import { BottomSheetPicker, PickerOption } from './BottomSheetPicker';
import { DurationClockPicker } from './DurationClockPicker';
import { getPriorityColorStyle } from '../utils/priorityColors';
import { parseDurationToMinutes, formatDurationDisplay } from '../utils/duration';

interface KeywordsViewProps {
  keywords: Keyword[];
  dedications?: Dedication[];
  currentTheme?: ThemeConfig;
  onAddKeyword: (keyword: Omit<Keyword, 'id'>) => void;
  onUpdateKeyword?: (keywordId: string, updates: Partial<Keyword>) => void;
  onDeleteKeyword?: (keywordId: string) => void;
}

export const KeywordsView: React.FC<KeywordsViewProps> = ({
  keywords,
  dedications = [],
  currentTheme,
  onAddKeyword,
  onUpdateKeyword,
  onDeleteKeyword,
}) => {
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<Keyword | null>(null);

  // Form field state
  const [name, setName] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [lengthInput, setLengthInput] = useState('30');
  const [priority, setPriority] = useState<PriorityLevel>('None');
  const [dedicationId, setDedicationId] = useState<string>('');
  const [autoPromotePriority, setAutoPromotePriority] = useState<Task['autoPromotePriority']>('Off');
  const [isClockWidgetOpen, setIsClockWidgetOpen] = useState(false);

  // Bottom sheet pickers
  const [activeBottomSheet, setActiveBottomSheet] = useState<'priority' | 'dedication' | 'autoPromote' | null>(null);

  // Open modal for new keyword
  const handleOpenNew = () => {
    setEditingKeyword(null);
    setName('');
    setDurationMinutes(30);
    setLengthInput(formatDurationDisplay(30));
    setPriority('None');
    setDedicationId('');
    setAutoPromotePriority('Off');
    setIsClockWidgetOpen(false);
    setIsModalOpen(true);
  };

  // Open modal for editing existing keyword
  const handleOpenEdit = (kw: Keyword) => {
    setEditingKeyword(kw);
    setName(kw.name);
    setDurationMinutes(kw.durationMinutes || 30);
    setLengthInput(formatDurationDisplay(kw.durationMinutes || 30));
    setPriority(kw.priority || 'None');
    setDedicationId(kw.dedicationId || '');
    setAutoPromotePriority(kw.autoPromotePriority || 'Off');
    setIsClockWidgetOpen(false);
    setIsModalOpen(true);
  };

  const handleLengthChange = (val: string) => {
    setLengthInput(val);
    const parsed = parseDurationToMinutes(val, -1);
    if (parsed > 0) {
      setDurationMinutes(parsed);
    }
  };

  const handleLengthBlur = () => {
    const parsed = parseDurationToMinutes(lengthInput, durationMinutes);
    setDurationMinutes(parsed);
    setLengthInput(formatDurationDisplay(parsed));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalDuration = Math.max(1, durationMinutes || parseInt(lengthInput, 10) || 30);

    if (editingKeyword && onUpdateKeyword) {
      onUpdateKeyword(editingKeyword.id, {
        name: name.trim(),
        durationMinutes: finalDuration,
        priority,
        dedicationId: dedicationId || undefined,
        autoPromotePriority,
      });
    } else {
      onAddKeyword({
        name: name.trim(),
        durationMinutes: finalDuration,
        priority,
        dedicationId: dedicationId || undefined,
        autoPromotePriority,
        usageCount: 0,
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (editingKeyword && onDeleteKeyword) {
      onDeleteKeyword(editingKeyword.id);
      setIsModalOpen(false);
    }
  };

  // Options for pickers
  const priorityOptions: PickerOption[] = [
    { label: 'No priority', value: 'None' },
    { label: 'Low', value: 'Low' },
    { label: 'Medium', value: 'Medium' },
    { label: 'High', value: 'High' },
  ];

  const dedicationOptions: PickerOption[] = [
    { label: 'None', value: '' },
    ...dedications.map((d) => ({ label: d.name, value: d.id })),
  ];

  const autoPromoteOptions: PickerOption[] = [
    { label: 'Off', value: 'Off' },
    { label: 'After 1 day', value: 'After 1 day' },
    { label: 'After 2 days', value: 'After 2 days' },
    { label: 'After 3 days', value: 'After 3 days' },
    { label: 'After 1 week', value: 'After 1 week' },
  ];

  const currentDedicationLabel = dedicationId
    ? dedications.find((d) => d.id === dedicationId)?.name || 'None'
    : 'None';

  const isSaveDisabled = !name.trim();

  return (
    <div className="flex-1 flex flex-col w-full max-w-2xl mx-auto min-h-[calc(100vh-65px)] relative pb-28 select-none transition-colors duration-200">
      {/* Content Area */}
      <div className="px-4 pt-4 sm:px-6 sm:pt-6 w-full">
        {/* Section Heading & Subtitle */}
        <h2 className="text-2xl font-bold text-[#2c3e50] tracking-tight" style={{ color: currentTheme?.textColor }}>
          Keywords
        </h2>
        <p className="text-[15px] opacity-75 mt-1" style={{ color: currentTheme?.textColor }}>
          Task defaults you can reuse in your Daily Plan.
        </p>

        {/* Empty State or Keyword List */}
        {keywords.length === 0 ? (
          <p className="text-[15px] opacity-60 mt-8 select-none" style={{ color: currentTheme?.textColor }}>
            No saved task keywords yet.
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            {keywords.map((kw) => {
              const pStyle = getPriorityColorStyle(kw.priority, currentTheme);
              return (
                <div
                  key={kw.id}
                  onClick={() => handleOpenEdit(kw)}
                  className="bg-white/95 backdrop-blur-xs rounded-2xl p-4 sm:p-5 border border-black/10 shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-3 cursor-pointer group"
                  style={kw.priority && kw.priority !== 'None' ? { borderLeftWidth: '4px', borderLeftColor: pStyle.bg } : undefined}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[16.5px] font-bold text-[#1e293b] group-hover:text-[#8da9c4] transition-colors truncate">
                        {kw.name}
                      </h4>
                      {kw.priority && kw.priority !== 'None' && (
                        <span 
                          style={{
                            backgroundColor: pStyle.bg,
                            color: pStyle.text,
                            borderColor: pStyle.border,
                          }}
                          className="px-2 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs shrink-0"
                        >
                          {kw.priority}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#64748b] mt-1">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-[#64748b]" />
                        {kw.durationMinutes} min
                      </span>
                      {kw.dedicationId && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[#475569]">
                          <Star className="w-3 h-3 text-[#84a4cb]" />
                          {dedications.find((d) => d.id === kw.dedicationId)?.name || 'Dedication'}
                        </span>
                      </>
                    )}
                    {kw.usageCount !== undefined && kw.usageCount > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-[#94a3b8]">Used {kw.usageCount}x</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(kw)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#334155] text-xs font-semibold transition-all cursor-pointer active:scale-95"
                    title="Edit keyword"
                  >
                    <Pencil className="w-3.5 h-3.5 text-[#64748b]" />
                    <span>Edit</span>
                  </button>

                  {onDeleteKeyword && (
                    <button
                      type="button"
                      onClick={() => onDeleteKeyword(kw.id)}
                      className="p-1.5 text-[#94a3b8] hover:text-[#ef4444] rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                      title="Delete keyword"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button (+) */}
      <button
        id="keyword-add-fab"
        type="button"
        onClick={handleOpenNew}
        aria-label="Add task keyword"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#8da9c4] hover:bg-[#7d99b4] active:scale-95 text-white shadow-lg flex items-center justify-center transition-all z-30 cursor-pointer"
      >
        <Plus className="w-7 h-7 stroke-[2.2]" />
      </button>

      {/* Edit / New Keyword Modal (Exact match to Screenshot_20260917_224323_Priorities.jpg) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 sm:p-7 shadow-2xl max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#1e293b]">
                  {editingKeyword ? 'Edit keyword' : 'New keyword'}
                </h3>
                <p className="text-[14px] text-[#94a3b8] mt-1">
                  These defaults apply when you reuse it.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 -mr-1 text-[#64748b] hover:text-[#1e293b] rounded-lg active:scale-90 transition-all cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5 stroke-[2]" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-5 pt-5 pb-2">
              {/* Field 1: Keyword */}
              <div>
                <label className="block text-xs font-normal text-[#94a3b8] mb-1">
                  Keyword
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Shower"
                  className="w-full text-base font-normal text-[#1e293b] border-b border-[#cbd5e1] focus:border-[#8da9c4] pb-2 outline-none bg-transparent transition-colors"
                />
              </div>

              {/* Field 2: Length in minutes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-normal text-[#94a3b8]">
                    Length in minutes
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsClockWidgetOpen(!isClockWidgetOpen)}
                    className="text-xs font-medium text-[#8da9c4] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{isClockWidgetOpen ? 'Hide clock' : 'Clock widget'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={lengthInput}
                  onChange={(e) => handleLengthChange(e.target.value)}
                  onBlur={handleLengthBlur}
                  placeholder="e.g. 15, 30 min, 1:30"
                  className="w-full text-base font-normal text-[#1e293b] border-b border-[#cbd5e1] focus:border-[#8da9c4] pb-2 outline-none bg-transparent transition-colors"
                />

                {/* Optional clock widget dial if toggled */}
                {isClockWidgetOpen && (
                  <div className="mt-3 p-2.5 bg-[#faf8f3] rounded-2xl border border-[#ebe7df]">
                    <DurationClockPicker
                      valueMinutes={durationMinutes}
                      onChange={(mins) => {
                        setDurationMinutes(mins);
                        setLengthInput(formatDurationDisplay(mins));
                      }}
                      accentColor="#8da9c4"
                      compact={true}
                    />
                  </div>
                )}
              </div>

              {/* Field 3: Priority */}
              <div
                onClick={() => setActiveBottomSheet('priority')}
                className="cursor-pointer group"
              >
                <label className="block text-xs font-normal text-[#94a3b8] mb-1">
                  Priority
                </label>
                <div className="flex items-center justify-between border-b border-[#cbd5e1] pb-2 group-hover:border-[#8da9c4] transition-colors">
                  <span className="text-base text-[#1e293b]">
                    {priority === 'None' ? 'No priority' : priority}
                  </span>
                  <ChevronDown className="w-5 h-5 text-[#64748b] stroke-[1.8]" />
                </div>
              </div>

              {/* Field 4: Dedication */}
              <div
                onClick={() => setActiveBottomSheet('dedication')}
                className="cursor-pointer group"
              >
                <label className="block text-xs font-normal text-[#94a3b8] mb-1">
                  Dedication
                </label>
                <div className="flex items-center justify-between border-b border-[#cbd5e1] pb-2 group-hover:border-[#8da9c4] transition-colors">
                  <span className="text-base text-[#1e293b]">
                    {currentDedicationLabel}
                  </span>
                  <ChevronDown className="w-5 h-5 text-[#64748b] stroke-[1.8]" />
                </div>
              </div>

              {/* Field 5: Auto-Promote Priority */}
              <div
                onClick={() => setActiveBottomSheet('autoPromote')}
                className="cursor-pointer group"
              >
                <label className="block text-xs font-normal text-[#94a3b8] mb-1">
                  Auto-Promote Priority
                </label>
                <div className="flex items-center justify-between border-b border-[#cbd5e1] pb-2 group-hover:border-[#8da9c4] transition-colors">
                  <span className="text-base text-[#1e293b]">
                    {autoPromotePriority || 'Off'}
                  </span>
                  <ChevronDown className="w-5 h-5 text-[#64748b] stroke-[1.8]" />
                </div>
              </div>

              {/* Primary Action Button: Save Changes */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSaveDisabled}
                  className={`w-full py-3.5 rounded-2xl font-semibold text-center text-white transition-all shadow-xs ${
                    isSaveDisabled
                      ? 'bg-[#cbd5e1] text-white/70 cursor-not-allowed'
                      : 'bg-[#8da9c4] hover:bg-[#7d99b4] active:scale-[0.99] cursor-pointer'
                  }`}
                >
                  Save Changes
                </button>
              </div>

              {/* Delete remembered task button matching Screenshot_20260917_224323_Priorities.jpg */}
              {editingKeyword && onDeleteKeyword && (
                <div className="flex justify-center pt-1 pb-1">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex items-center justify-center gap-1.5 text-[#e07a7a] hover:text-[#d35f5f] text-sm font-medium transition-colors cursor-pointer py-1"
                  >
                    <Trash2 className="w-4 h-4 stroke-[1.8]" />
                    <span>Delete remembered task</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Priority Bottom Sheet Picker */}
      <BottomSheetPicker
        isOpen={activeBottomSheet === 'priority'}
        title="Select Priority"
        options={priorityOptions}
        selectedValue={priority}
        onSelect={(val) => setPriority(val as PriorityLevel)}
        onClose={() => setActiveBottomSheet(null)}
      />

      {/* Dedication Bottom Sheet Picker */}
      <BottomSheetPicker
        isOpen={activeBottomSheet === 'dedication'}
        title="Select Dedication"
        options={dedicationOptions}
        selectedValue={dedicationId}
        onSelect={(val) => setDedicationId(val)}
        onClose={() => setActiveBottomSheet(null)}
      />

      {/* Auto-Promote Bottom Sheet Picker */}
      <BottomSheetPicker
        isOpen={activeBottomSheet === 'autoPromote'}
        title="Auto-Promote Priority"
        options={autoPromoteOptions}
        selectedValue={autoPromotePriority || 'Off'}
        onSelect={(val) => setAutoPromotePriority(val as Task['autoPromotePriority'])}
        onClose={() => setActiveBottomSheet(null)}
      />
    </div>
  );
};
