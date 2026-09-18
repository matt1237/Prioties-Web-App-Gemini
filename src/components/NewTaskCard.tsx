import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronDown, Repeat } from 'lucide-react';
import { Dedication, Keyword, PriorityLevel, Routine, Task, ThemeConfig } from '../types';
import { CalendarModal } from './CalendarModal';
import { TimePickerModal } from './TimePickerModal';
import { BottomSheetPicker, PickerOption } from './BottomSheetPicker';
import { DurationClockPicker } from './DurationClockPicker';
import { parseDurationToMinutes, formatDurationDisplay } from '../utils/duration';

interface NewTaskCardProps {
  onSave: (taskData: {
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
  }) => void;
  onCancel: () => void;
  onApplyRoutine?: (routine: Routine, date?: string, startTime?: string) => void;
  dedications: Dedication[];
  keywords?: Keyword[];
  routines?: Routine[];
  initialStartTime?: string;
  initialDuration?: number;
  initialDateStr?: string;
  targetDateLabel?: string;
  currentTheme?: ThemeConfig;
}

export const NewTaskCard: React.FC<NewTaskCardProps> = ({
  onSave,
  onCancel,
  onApplyRoutine,
  dedications,
  keywords = [],
  routines = [],
  initialStartTime = '9:00 AM',
  initialDuration = 15,
  initialDateStr = '2026-09-19',
  targetDateLabel = 'Sat, September 19, 2026',
  currentTheme,
}) => {
  const [title, setTitle] = useState('');
  const [selectedDateIso, setSelectedDateIso] = useState(initialDateStr);
  const [dateLabel, setDateLabel] = useState(targetDateLabel);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [lengthInput, setLengthInput] = useState<string>(formatDurationDisplay(initialDuration));
  const [durationMinutes, setDurationMinutes] = useState<number>(initialDuration);
  const [priority, setPriority] = useState<PriorityLevel>('None');
  const [dedicationId, setDedicationId] = useState<string>('');
  const [saveAsKeyword, setSaveAsKeyword] = useState(false);
  const [repeat, setRepeat] = useState<Task['repeat']>('None');
  const [autoPromotePriority, setAutoPromotePriority] = useState<Task['autoPromotePriority']>('Off');

  // Modals state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isDurationClockOpen, setIsDurationClockOpen] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<'start' | 'end' | null>(null);
  const [activeBottomSheet, setActiveBottomSheet] = useState<'priority' | 'dedication' | 'repeat' | 'autoPromote' | null>(null);

  // Time calculation helpers
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

  const formatMinutesToTime = (totalMinutes: number): string => {
    let h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  // Compute end time based on start time + duration
  const endTime = useMemo(() => {
    const startMin = parseTimeToMinutes(startTime);
    return formatMinutesToTime(startMin + durationMinutes);
  }, [startTime, durationMinutes]);

  // Handle Length text input changes (accepts "90" or "1:30")
  const handleLengthChange = (val: string) => {
    setLengthInput(val);
    const trimmed = val.trim();
    if (!trimmed) return;

    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      const total = h * 60 + m;
      if (total > 0) setDurationMinutes(total);
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num > 0) {
        setDurationMinutes(num);
      }
    }
  };

  // Keyword / Routine Auto-Fill Suggestions
  const suggestions = useMemo(() => {
    const q = title.trim().toLowerCase();
    if (!q) return [];

    const matchedKw = keywords
      .filter((k) => k.name.toLowerCase().includes(q))
      .map((k) => ({
        type: 'keyword' as const,
        id: k.id,
        name: k.name,
        durationMinutes: k.durationMinutes,
        priority: k.priority,
        dedicationId: k.dedicationId,
        routine: undefined as Routine | undefined,
      }));

    const matchedRt = routines
      .filter((r) => r.name.toLowerCase().includes(q))
      .map((r) => ({
        type: 'routine' as const,
        id: r.id,
        name: r.name,
        durationMinutes: r.totalMinutes,
        priority: 'None' as PriorityLevel,
        dedicationId: undefined,
        routine: r,
      }));

    return [...matchedKw, ...matchedRt].slice(0, 6);
  }, [title, keywords, routines]);

  const handleSelectSuggestion = (s: {
    type: 'keyword' | 'routine';
    name: string;
    durationMinutes: number;
    priority: PriorityLevel;
    dedicationId?: string;
    routine?: Routine;
  }) => {
    if (s.type === 'routine' && s.routine && onApplyRoutine) {
      onApplyRoutine(s.routine, selectedDateIso, startTime);
      onCancel();
      return;
    }

    setTitle(s.name);
    setDurationMinutes(s.durationMinutes);
    setLengthInput(String(s.durationMinutes));
    setPriority(s.priority);
    if (s.dedicationId) setDedicationId(s.dedicationId);
  };

  // Save handler
  const handleSave = () => {
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      startTime,
      endTime,
      durationMinutes,
      priority,
      dedicationId: dedicationId || undefined,
      repeat,
      autoPromotePriority,
      saveAsKeyword,
      date: selectedDateIso,
    });
  };

  // Options for BottomSheetPickers
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

  const repeatOptions: PickerOption[] = [
    { label: 'None', value: 'None' },
    { label: 'Daily', value: 'Daily' },
    { label: 'Weekly', value: 'Weekly' },
    { label: 'Selected days', value: 'Selected days' },
  ];

  const autoPromoteOptions: PickerOption[] = [
    { label: 'Off', value: 'Off' },
    { label: '1 day', value: '1 day' },
    { label: '3 days', value: '3 days' },
    { label: '7 days', value: '7 days' },
    { label: 'Custom...', value: 'Custom...' },
  ];

  const selectedDedicationName =
    dedications.find((d) => d.id === dedicationId)?.name || 'None';

  return (
    <div className="w-full max-w-lg mx-auto pb-12 select-none">
      {/* Top Header Bar: Cancel | New Task | Save */}
      <div className="flex items-center justify-between py-3 px-1 mb-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-base font-bold text-[#52b788] hover:text-[#40916c] transition-colors cursor-pointer"
        >
          Cancel
        </button>

        <h2 className="text-xl font-bold font-display text-[#2d6a4f]">
          New Task
        </h2>

        <button
          type="button"
          onClick={handleSave}
          disabled={!title.trim()}
          className={`text-base font-bold transition-colors cursor-pointer ${
            title.trim()
              ? 'text-[#52b788] hover:text-[#40916c]'
              : 'text-[#a8d5b1] cursor-not-allowed opacity-60'
          }`}
        >
          Save
        </button>
      </div>

      {/* Card 1: Main Task Fields */}
      <div className="bg-white/95 rounded-2xl p-5 border border-[#cbe5d0] shadow-xs space-y-4">
        {/* Task or Saved Routine Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#52b788]">
            Task or Saved Routine
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. go to the gym or morning start"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#cbe5d0] focus:border-[#52b788] focus:ring-1 focus:ring-[#52b788] outline-none text-base text-[#1b4332] placeholder:text-[#9bb3a1] bg-white transition-all"
          />

          {/* Auto-fill Keyword / Routine Suggestions (Only shown when typing and matching) */}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 animate-in fade-in duration-150">
              {suggestions.map((s) => (
                <button
                  key={`${s.type}-${s.name}`}
                  type="button"
                  onClick={() => handleSelectSuggestion(s)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer active:scale-95 transition-all shadow-2xs ${
                    s.type === 'routine'
                      ? 'border-[#84a4cb]/50 bg-[#f0f4f8] text-[#2c4c6e] hover:bg-[#e2ebf4]'
                      : 'border-[#b7e2be] bg-[#f0f9f2] text-[#2d5a3f] hover:bg-[#d8edd9]'
                  }`}
                >
                  {s.type === 'routine' && <Repeat className="w-3 h-3 text-[#507ea8]" />}
                  <span>{s.name}</span>
                  {s.type === 'routine' && s.routine && (
                    <span className="text-[10px] text-[#64748b]">
                      ({s.routine.taskKeywords.length} tasks)
                    </span>
                  )}
                  {s.type === 'keyword' && (
                    <span className="text-[10px] text-[#52796f]">
                      ({s.durationMinutes}m)
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scheduled Date Row */}
        <div
          onClick={() => setIsCalendarOpen(true)}
          className="flex items-center justify-between py-2 border-b border-[#edf5ee] cursor-pointer group"
        >
          <div>
            <span className="block text-xs font-semibold text-[#52b788]">
              Scheduled Date
            </span>
            <span className="text-sm font-medium text-[#1b4332] group-hover:text-[#40916c] transition-colors">
              {dateLabel}
            </span>
          </div>
          <CalendarIcon className="w-5 h-5 text-[#a38b6d] stroke-[1.8]" />
        </div>

        {/* Start Time Row */}
        <div
          onClick={() => setTimePickerTarget('start')}
          className="flex items-center justify-between py-2 border-b border-[#edf5ee] cursor-pointer group"
        >
          <div>
            <span className="block text-xs font-semibold text-[#52b788]">
              Start Time
            </span>
            <span className="text-sm font-medium text-[#1b4332] group-hover:text-[#40916c] transition-colors">
              {startTime}
            </span>
          </div>
          <Clock className="w-5 h-5 text-[#a38b6d] stroke-[1.8]" />
        </div>

        {/* Length (HH:MM or minutes) Input with Widget Style Clock */}
        <div className="space-y-1 py-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-[#52b788]">
              Length (HH:MM or minutes)
            </label>
            <button
              type="button"
              onClick={() => setIsDurationClockOpen(!isDurationClockOpen)}
              className="text-xs font-bold text-[#52b788] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{isDurationClockOpen ? 'Close Clock' : 'Tap Clock to Set'}</span>
            </button>
          </div>

          <div className="relative flex items-center w-full rounded-xl border border-[#cbe5d0] bg-white focus-within:border-[#52b788] focus-within:ring-2 focus-within:ring-[#52b788]/20 transition-all">
            <input
              type="text"
              value={lengthInput}
              onChange={(e) => {
                const val = e.target.value;
                setLengthInput(val);
                const parsed = parseDurationToMinutes(val, -1);
                if (parsed > 0) {
                  setDurationMinutes(parsed);
                }
              }}
              onBlur={() => {
                const parsed = parseDurationToMinutes(lengthInput, durationMinutes);
                setDurationMinutes(parsed);
                setLengthInput(formatDurationDisplay(parsed));
              }}
              placeholder="e.g. 15, 30 min, 1:30"
              className="w-full px-3.5 py-2.5 text-sm font-semibold text-[#1b4332] outline-none bg-transparent"
              aria-label="Task length in minutes or HH:MM"
            />
            <button
              type="button"
              onClick={() => setIsDurationClockOpen(!isDurationClockOpen)}
              title={isDurationClockOpen ? 'Close visual clock' : 'Open visual clock to set time'}
              aria-label="Toggle duration clock widget"
              className="p-2.5 mr-1 text-[#52b788] hover:text-[#40916c] hover:bg-[#f0f9f2] rounded-lg transition-colors cursor-pointer"
            >
              <Clock className="w-4 h-4" />
            </button>
          </div>

          {isDurationClockOpen && (
            <div className="mt-2 p-3 bg-[#f7fbf8] rounded-2xl border border-[#cbe5d0]">
              <DurationClockPicker
                valueMinutes={durationMinutes}
                onChange={(mins) => {
                  setDurationMinutes(mins);
                  setLengthInput(formatDurationDisplay(mins));
                }}
                accentColor="#52b788"
                compact={true}
              />
            </div>
          )}
        </div>

        {/* End Time Row */}
        <div
          onClick={() => setTimePickerTarget('end')}
          className="flex items-center justify-between py-2 border-b border-[#edf5ee] cursor-pointer group"
        >
          <div>
            <span className="block text-xs font-semibold text-[#52b788]">
              End Time
            </span>
            <span className="text-sm font-medium text-[#1b4332] group-hover:text-[#40916c] transition-colors">
              {endTime}
            </span>
          </div>
          <Clock className="w-5 h-5 text-[#a38b6d] stroke-[1.8]" />
        </div>

        {/* Priority Selector Row */}
        <div
          onClick={() => setActiveBottomSheet('priority')}
          className="flex items-center justify-between py-2 border-b border-[#edf5ee] cursor-pointer group"
        >
          <div>
            <span className="block text-xs font-semibold text-[#52b788]">
              Priority
            </span>
            <span className="text-sm font-medium text-[#1b4332] group-hover:text-[#40916c] transition-colors">
              {priority === 'None' ? 'No priority' : priority}
            </span>
          </div>
          <ChevronDown className="w-5 h-5 text-[#6e8a75] stroke-[2]" />
        </div>

        {/* Dedication Selector Row */}
        <div
          onClick={() => setActiveBottomSheet('dedication')}
          className="flex items-center justify-between py-2 border-b border-[#edf5ee] cursor-pointer group"
        >
          <div>
            <span className="block text-xs font-semibold text-[#52b788]">
              Dedication
            </span>
            <span className="text-sm font-medium text-[#1b4332] group-hover:text-[#40916c] transition-colors">
              {selectedDedicationName}
            </span>
          </div>
          <ChevronDown className="w-5 h-5 text-[#6e8a75] stroke-[2]" />
        </div>

        {/* Save as keyword Toggle Row */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm font-medium text-[#1b4332]">
            Save as keyword
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={saveAsKeyword}
            onClick={() => setSaveAsKeyword(!saveAsKeyword)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
              saveAsKeyword ? 'bg-[#52b788]' : 'bg-[#d1d5db]'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out translate-y-0.5 ${
                saveAsKeyword ? 'translate-x-5.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Card 2: Repeat & Auto-Promote */}
      <div className="bg-white/95 rounded-2xl p-5 border border-[#cbe5d0] shadow-xs space-y-4 mt-4">
        {/* Repeat Row */}
        <div
          onClick={() => setActiveBottomSheet('repeat')}
          className="flex items-center justify-between py-2 border-b border-[#edf5ee] cursor-pointer group"
        >
          <div>
            <span className="block text-xs font-semibold text-[#52b788]">
              Repeat
            </span>
            <span className="text-sm font-medium text-[#1b4332] group-hover:text-[#40916c] transition-colors">
              {repeat || 'None'}
            </span>
          </div>
          <ChevronDown className="w-5 h-5 text-[#6e8a75] stroke-[2]" />
        </div>

        {/* Auto-Promote Priority Row */}
        <div
          onClick={() => setActiveBottomSheet('autoPromote')}
          className="flex items-center justify-between py-2 cursor-pointer group"
        >
          <div>
            <span className="block text-xs font-semibold text-[#52b788]">
              Auto-Promote Priority
            </span>
            <span className="text-sm font-medium text-[#1b4332] group-hover:text-[#40916c] transition-colors">
              {autoPromotePriority || 'Off'}
            </span>
          </div>
          <ChevronDown className="w-5 h-5 text-[#6e8a75] stroke-[2]" />
        </div>
      </div>

      {/* Calendar Modal */}
      <CalendarModal
        isOpen={isCalendarOpen}
        initialDateStr={selectedDateIso}
        onSelectDate={(iso, label) => {
          setSelectedDateIso(iso);
          setDateLabel(label);
        }}
        onClose={() => setIsCalendarOpen(false)}
      />

      {/* Time Picker Modal (for Start Time or End Time) */}
      <TimePickerModal
        isOpen={timePickerTarget !== null}
        initialTime={timePickerTarget === 'end' ? endTime : startTime}
        onSelectTime={(newTime) => {
          if (timePickerTarget === 'start') {
            setStartTime(newTime);
          } else if (timePickerTarget === 'end') {
            // End time chosen: recompute duration minutes
            const startMin = parseTimeToMinutes(startTime);
            let endMin = parseTimeToMinutes(newTime);
            if (endMin < startMin) endMin += 24 * 60; // next day
            const diff = endMin - startMin;
            if (diff > 0) {
              setDurationMinutes(diff);
              setLengthInput(String(diff));
            }
          }
        }}
        onClose={() => setTimePickerTarget(null)}
      />

      {/* Bottom Sheet Pickers */}
      <BottomSheetPicker
        isOpen={activeBottomSheet === 'priority'}
        title="Priority"
        options={priorityOptions}
        selectedValue={priority}
        onSelect={(val) => setPriority(val as PriorityLevel)}
        onClose={() => setActiveBottomSheet(null)}
      />

      <BottomSheetPicker
        isOpen={activeBottomSheet === 'dedication'}
        title="Dedication"
        options={dedicationOptions}
        selectedValue={dedicationId}
        onSelect={(val) => setDedicationId(val)}
        onClose={() => setActiveBottomSheet(null)}
      />

      <BottomSheetPicker
        isOpen={activeBottomSheet === 'repeat'}
        title="Repeat"
        options={repeatOptions}
        selectedValue={repeat || 'None'}
        onSelect={(val) => setRepeat(val as Task['repeat'])}
        onClose={() => setActiveBottomSheet(null)}
      />

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
