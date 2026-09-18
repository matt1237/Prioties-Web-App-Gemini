import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarModalProps {
  isOpen: boolean;
  initialDateStr?: string; // YYYY-MM-DD
  onSelectDate: (dateIso: string, formattedLabel: string) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const CalendarModal: React.FC<CalendarModalProps> = ({
  isOpen,
  initialDateStr = '2026-09-19',
  onSelectDate,
  onClose,
}) => {
  // Parse initial date
  const parseDate = (dStr: string) => {
    try {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    } catch {
      // fallback
    }
    return new Date();
  };

  const parsed = parseDate(initialDateStr);
  const [viewYear, setViewYear] = useState<number>(parsed.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(parsed.getMonth());
  const [selectedDay, setSelectedDay] = useState<number>(parsed.getDate());

  if (!isOpen) return null;

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleConfirm = () => {
    const finalDate = new Date(viewYear, viewMonth, selectedDay);
    const yyyy = finalDate.getFullYear();
    const mm = String(finalDate.getMonth() + 1).padStart(2, '0');
    const dd = String(finalDate.getDate()).padStart(2, '0');
    const isoStr = `${yyyy}-${mm}-${dd}`;

    // e.g. "Sat, September 19, 2026"
    const weekday = finalDate.toLocaleDateString('en-US', { weekday: 'short' });
    const month = MONTH_NAMES[finalDate.getMonth()];
    const label = `${weekday}, ${month} ${finalDate.getDate()}, ${yyyy}`;

    onSelectDate(isoStr, label);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-[#d8edd9] select-none animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <h3 className="text-sm font-semibold text-[#6e8a75] mb-3">
          Select Date
        </h3>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 text-[#2d5a3f] hover:bg-[#edf7ee] rounded-full transition-all"
            aria-label="Previous Month"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          <span className="text-base font-bold text-[#1b4332]">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 text-[#2d5a3f] hover:bg-[#edf7ee] rounded-full transition-all"
            aria-label="Next Month"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Weekday Headers S M T W T F S */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {WEEKDAY_NAMES.map((d, i) => (
            <div key={i} className="text-xs font-semibold text-[#8a9e91] py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="w-9 h-9" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const isSelected = dayNum === selectedDay;
            const now = new Date();
            const isToday = viewYear === now.getFullYear() && viewMonth === now.getMonth() && dayNum === now.getDate();

            return (
              <button
                key={`day-${dayNum}`}
                type="button"
                onClick={() => setSelectedDay(dayNum)}
                className={`w-9 h-9 mx-auto flex items-center justify-center rounded-full text-sm font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#0284c7] text-white font-bold shadow-sm'
                    : isToday
                    ? 'border-2 border-[#0284c7] text-[#0284c7] font-bold bg-[#f0f9ff]'
                    : 'text-[#1b4332] hover:bg-[#edf7ee]'
                }`}
              >
                {dayNum}
              </button>
            );
          })}
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-6 mt-6 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-bold text-[#6e8a75] hover:text-[#1b4332] px-3 py-1.5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="text-sm font-bold text-[#0284c7] hover:text-[#0369a1] px-3 py-1.5 transition-colors cursor-pointer"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
