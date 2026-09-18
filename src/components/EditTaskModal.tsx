import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronDown, Trash2 } from 'lucide-react';
import { Dedication, PriorityLevel, Task } from '../types';
import { CalendarModal } from './CalendarModal';
import { TimePickerModal } from './TimePickerModal';
import { BottomSheetPicker, PickerOption } from './BottomSheetPicker';
import { DurationClockPicker } from './DurationClockPicker';
import { parseDurationToMinutes, formatDurationDisplay } from '../utils/duration';

interface EditTaskModalProps {
  task: Task;
  dedications?: Dedication[];
  onSave: (updatedFields: Partial<Task>) => void;
  onDelete?: (taskId: string) => void;
  onClose: () => void;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  task,
  dedications = [],
  onSave,
  onDelete,
  onClose,
}) => {
  const [title, setTitle] = useState(task.title);
  const [selectedDateIso, setSelectedDateIso] = useState(task.date || new Date().toISOString().split('T')[0]);

  // Format initial date label e.g. "Thu, September 17, 2026"
  const getFormattedDateLabel = (dateStr?: string) => {
    try {
      if (dateStr) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
          const month = d.toLocaleDateString('en-US', { month: 'long' });
          return `${weekday}, ${month} ${d.getDate()}, ${d.getFullYear()}`;
        }
      }
    } catch {
      // fallback
    }
    const today = new Date();
    const weekday = today.toLocaleDateString('en-US', { weekday: 'short' });
    const month = today.toLocaleDateString('en-US', { month: 'long' });
    return `${weekday}, ${month} ${today.getDate()}, ${today.getFullYear()}`;
  };

  const [dateLabel, setDateLabel] = useState(getFormattedDateLabel(task.date));
  const [startTime, setStartTime] = useState(task.startTime || '9:00 AM');
  const [endTime, setEndTime] = useState(task.endTime || '9:30 AM');
  const [lengthInput, setLengthInput] = useState<string>(formatDurationDisplay(task.durationMinutes || 30));
  const [durationMinutes, setDurationMinutes] = useState<number>(task.durationMinutes || 30);
  const [priority, setPriority] = useState<PriorityLevel>(task.priority || 'None');
  const [dedicationId, setDedicationId] = useState<string>(task.dedicationId || '');
  const [repeat, setRepeat] = useState<Task['repeat']>(task.repeat || 'None');
  const [autoPromotePriority, setAutoPromotePriority] = useState<Task['autoPromotePriority']>(task.autoPromotePriority || 'Off');

  // Modals state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isDurationClockOpen, setIsDurationClockOpen] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<'start' | 'end' | null>(null);
  const [activeBottomSheet, setActiveBottomSheet] = useState<'priority' | 'dedication' | 'repeat' | 'autoPromote' | null>(null);

  // Time conversion helpers
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

  // Handle Length text input changes
  const handleLengthChange = (val: string) => {
    setLengthInput(val);
    const trimmed = val.trim();
    if (!trimmed) return;

    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      const total = h * 60 + m;
      if (total > 0) {
        setDurationMinutes(total);
        setEndTime(formatMinutesToTime(parseTimeToMinutes(startTime) + total));
      }
    } else {
      const mins = parseInt(trimmed, 10);
      if (!isNaN(mins) && mins > 0) {
        setDurationMinutes(mins);
        setEndTime(formatMinutesToTime(parseTimeToMinutes(startTime) + mins));
      }
    }
  };

  // Handle start time selection
  const handleSelectStartTime = (timeStr: string) => {
    setStartTime(timeStr);
    setEndTime(formatMinutesToTime(parseTimeToMinutes(timeStr) + durationMinutes));
  };

  // Handle end time selection
  const handleSelectEndTime = (timeStr: string) => {
    setEndTime(timeStr);
    const startMins = parseTimeToMinutes(startTime);
    const endMins = parseTimeToMinutes(timeStr);
    const diff = (endMins - startMins + 1440) % 1440;
    if (diff > 0) {
      setDurationMinutes(diff);
      setLengthInput(String(diff));
    }
  };

  const handleSave = () => {
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      date: selectedDateIso,
      startTime,
      endTime,
      durationMinutes,
      priority,
      dedicationId: dedicationId || undefined,
      repeat,
      autoPromotePriority,
    });
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(task.id);
      onClose();
    }
  };

  // Dedication label for display
  const currentDedicationName = useMemo(() => {
    if (!dedicationId) return 'None';
    const found = dedications.find((d) => d.id === dedicationId);
    return found ? found.name : 'None';
  }, [dedicationId, dedications]);

  // Options for bottom sheet pickers
  const priorityOptions: PickerOption[] = [
    { label: 'High', value: 'High' },
    { label: 'Medium', value: 'Medium' },
    { label: 'Low', value: 'Low' },
    { label: 'None', value: 'None' },
  ];

  const dedicationOptions: PickerOption[] = [
    { label: 'None', value: '' },
    ...dedications.map((d) => ({ label: d.name, value: d.id })),
  ];

  const repeatOptions: PickerOption[] = [
    { label: 'None', value: 'None' },
    { label: 'Daily', value: 'Daily' },
    { label: 'Weekdays', value: 'Weekdays' },
    { label: 'Weekends', value: 'Weekends' },
    { label: 'Weekly', value: 'Weekly' },
    { label: 'Monthly', value: 'Monthly' },
  ];

  const autoPromoteOptions: PickerOption[] = [
    { label: 'Off', value: 'Off' },
    { label: 'After 1 day', value: 'After 1 day' },
    { label: 'After 2 days', value: 'After 2 days' },
    { label: 'After 3 days', value: 'After 3 days' },
    { label: 'After 1 week', value: 'After 1 week' },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#fbf9f4] w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#ece7de] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-[15px] font-medium text-[#64748b] hover:text-[#1e293b] active:scale-95 transition-all cursor-pointer py-1"
          >
            Cancel
          </button>
          <h3 className="text-[17px] font-bold text-[#1e293b]">
            Edit Task
          </h3>
          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim()}
            className={`text-[15px] font-semibold transition-all cursor-pointer py-1 ${
              !title.trim()
                ? 'text-[#cbd5e1] cursor-not-allowed'
                : 'text-[#84a4cb] hover:text-[#6f92bb] active:scale-95'
            }`}
          >
            Save
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Main Form Fields (White Card) */}
          <div className="bg-white rounded-2xl p-5 border border-[#ebe7df] shadow-2xs space-y-4">
            {/* Task or Saved Routine */}
            <div>
              <label className="block text-xs text-[#64748b] mb-1">
                Task or Saved Routine
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                className="w-full text-base font-normal text-[#1e293b] border-b border-[#cbd5e1] focus:border-[#84a4cb] pb-2 outline-none bg-transparent transition-colors"
              />
            </div>

            {/* Scheduled Date */}
            <div
              onClick={() => setIsCalendarOpen(true)}
              className="cursor-pointer group"
            >
              <label className="block text-xs text-[#64748b] mb-1">
                Scheduled Date
              </label>
              <div className="flex items-center justify-between border-b border-[#cbd5e1] pb-2 group-hover:border-[#84a4cb] transition-colors">
                <span className="text-base text-[#1e293b]">{dateLabel}</span>
                <CalendarIcon className="w-5 h-5 text-[#64748b] stroke-[1.8]" />
              </div>
            </div>

            {/* Start Time */}
            <div
              onClick={() => setTimePickerTarget('start')}
              className="cursor-pointer group"
            >
              <label className="block text-xs text-[#64748b] mb-1">
                Start Time
              </label>
              <div className="flex items-center justify-between border-b border-[#cbd5e1] pb-2 group-hover:border-[#84a4cb] transition-colors">
                <span className="text-base text-[#1e293b]">{startTime}</span>
                <Clock className="w-5 h-5 text-[#64748b] stroke-[1.8]" />
              </div>
            </div>

            {/* Length (HH:MM or minutes) - Widget Style Clock */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs text-[#64748b]">
                  Length (HH:MM or minutes)
                </label>
                <button
                  type="button"
                  onClick={() => setIsDurationClockOpen(!isDurationClockOpen)}
                  className="text-xs font-semibold text-[#84a4cb] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{isDurationClockOpen ? 'Close Clock' : 'Tap Clock to Set'}</span>
                </button>
              </div>
              <div className="flex items-center justify-between border-b border-[#cbd5e1] focus-within:border-[#84a4cb] transition-colors pb-1">
                <input
                  type="text"
                  value={lengthInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLengthInput(val);
                    const parsed = parseDurationToMinutes(val, -1);
                    if (parsed > 0) {
                      setDurationMinutes(parsed);
                      // Update end time dynamically as well!
                      const startMin = parseTimeToMinutes(startTime);
                      setEndTime(formatMinutesToTime(startMin + parsed));
                    }
                  }}
                  onBlur={() => {
                    const parsed = parseDurationToMinutes(lengthInput, durationMinutes);
                    setDurationMinutes(parsed);
                    setLengthInput(formatDurationDisplay(parsed));
                    const startMin = parseTimeToMinutes(startTime);
                    setEndTime(formatMinutesToTime(startMin + parsed));
                  }}
                  placeholder="e.g. 15, 30 min, 1:30"
                  className="w-full text-base text-[#1e293b] outline-none bg-transparent font-medium"
                  aria-label="Task length in minutes or HH:MM"
                />
                <button
                  type="button"
                  onClick={() => setIsDurationClockOpen(!isDurationClockOpen)}
                  title={isDurationClockOpen ? 'Close visual clock' : 'Open visual clock to set time'}
                  aria-label="Toggle duration clock widget"
                  className="p-1.5 text-[#64748b] hover:text-[#84a4cb] rounded-lg transition-colors cursor-pointer"
                >
                  <Clock className="w-5 h-5 stroke-[1.8]" />
                </button>
              </div>

              {isDurationClockOpen && (
                <div className="mt-2.5 p-2 bg-[#faf8f3] rounded-2xl border border-[#ebe7df]">
                  <DurationClockPicker
                    valueMinutes={durationMinutes}
                    onChange={(mins) => {
                      setDurationMinutes(mins);
                      setLengthInput(formatDurationDisplay(mins));
                      const startMin = parseTimeToMinutes(startTime);
                      setEndTime(formatMinutesToTime(startMin + mins));
                    }}
                    accentColor="#84a4cb"
                    compact={true}
                  />
                </div>
              )}
            </div>

            {/* End Time */}
            <div
              onClick={() => setTimePickerTarget('end')}
              className="cursor-pointer group"
            >
              <label className="block text-xs text-[#64748b] mb-1">
                End Time
              </label>
              <div className="flex items-center justify-between border-b border-[#cbd5e1] pb-2 group-hover:border-[#84a4cb] transition-colors">
                <span className="text-base text-[#1e293b]">{endTime}</span>
                <Clock className="w-5 h-5 text-[#64748b] stroke-[1.8]" />
              </div>
            </div>

            {/* Priority */}
            <div
              onClick={() => setActiveBottomSheet('priority')}
              className="cursor-pointer group"
            >
              <label className="block text-xs text-[#64748b] mb-1">
                Priority
              </label>
              <div className="flex items-center justify-between border-b border-[#cbd5e1] pb-2 group-hover:border-[#84a4cb] transition-colors">
                <span className="text-base text-[#1e293b]">{priority}</span>
                <ChevronDown className="w-5 h-5 text-[#64748b] stroke-[1.8]" />
              </div>
            </div>

            {/* Dedication */}
            <div
              onClick={() => setActiveBottomSheet('dedication')}
              className="cursor-pointer group"
            >
              <label className="block text-xs text-[#64748b] mb-1">
                Dedication
              </label>
              <div className="flex items-center justify-between border-b border-[#cbd5e1] pb-2 group-hover:border-[#84a4cb] transition-colors">
                <span className="text-base text-[#1e293b]">{currentDedicationName}</span>
                <ChevronDown className="w-5 h-5 text-[#64748b] stroke-[1.8]" />
              </div>
            </div>
          </div>

          {/* Secondary Card (Repeat & Auto-Promote Priority) */}
          <div className="bg-white rounded-2xl p-5 border border-[#ebe7df] shadow-2xs space-y-4">
            {/* Repeat */}
            <div
              onClick={() => setActiveBottomSheet('repeat')}
              className="cursor-pointer group"
            >
              <label className="block text-xs text-[#64748b] mb-1">
                Repeat
              </label>
              <div className="flex items-center justify-between border-b border-[#cbd5e1] pb-2 group-hover:border-[#84a4cb] transition-colors">
                <span className="text-base text-[#1e293b]">{repeat}</span>
                <ChevronDown className="w-5 h-5 text-[#64748b] stroke-[1.8]" />
              </div>
            </div>

            {/* Auto-Promote Priority */}
            <div
              onClick={() => setActiveBottomSheet('autoPromote')}
              className="cursor-pointer group"
            >
              <label className="block text-xs text-[#64748b] mb-1">
                Auto-Promote Priority
              </label>
              <div className="flex items-center justify-between border-b border-[#cbd5e1] pb-2 group-hover:border-[#84a4cb] transition-colors">
                <span className="text-base text-[#1e293b]">{autoPromotePriority}</span>
                <ChevronDown className="w-5 h-5 text-[#64748b] stroke-[1.8]" />
              </div>
            </div>
          </div>

          {/* Delete Task Button */}
          {onDelete && (
            <div className="pt-2 pb-4 flex justify-center">
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-2 text-base font-normal text-[#dc2626] hover:text-[#b91c1c] active:scale-95 transition-all cursor-pointer py-2 px-4 rounded-xl hover:bg-red-50/50"
              >
                <Trash2 className="w-5 h-5 text-[#dc2626] stroke-[1.8]" />
                <span>Delete Task</span>
              </button>
            </div>
          )}
        </div>

        {/* Sub-modals */}
        {/* Calendar Picker Modal */}
        <CalendarModal
          isOpen={isCalendarOpen}
          initialDateStr={selectedDateIso}
          onSelectDate={(dateIso, formatted) => {
            setSelectedDateIso(dateIso);
            setDateLabel(formatted);
          }}
          onClose={() => setIsCalendarOpen(false)}
        />

        {/* Time Picker Modal */}
        {timePickerTarget && (
          <TimePickerModal
            isOpen={!!timePickerTarget}
            initialTime={timePickerTarget === 'start' ? startTime : endTime}
            onSelectTime={(timeStr) => {
              if (timePickerTarget === 'start') {
                handleSelectStartTime(timeStr);
              } else {
                handleSelectEndTime(timeStr);
              }
            }}
            onClose={() => setTimePickerTarget(null)}
          />
        )}

        {/* Bottom Sheet Dropdown Pickers */}
        <BottomSheetPicker
          isOpen={activeBottomSheet === 'priority'}
          title="Select Priority"
          options={priorityOptions}
          selectedValue={priority}
          onSelect={(val) => setPriority(val as PriorityLevel)}
          onClose={() => setActiveBottomSheet(null)}
        />

        <BottomSheetPicker
          isOpen={activeBottomSheet === 'dedication'}
          title="Select Dedication"
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
    </div>
  );
};
