import React, { useState, useRef, useCallback } from 'react';

interface TimePickerModalProps {
  isOpen: boolean;
  initialTime?: string; // e.g. "9:00 AM"
  onSelectTime: (timeStr: string) => void;
  onClose: () => void;
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  isOpen,
  initialTime = '9:00 AM',
  onSelectTime,
  onClose,
}) => {
  // Parse initial time
  const parseTime = (str: string) => {
    let h = 9;
    let m = 0;
    let p: 'AM' | 'PM' = 'AM';
    const match = str.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (match) {
      h = parseInt(match[1], 10);
      m = parseInt(match[2], 10);
      if (match[3]) {
        p = match[3].toUpperCase() === 'PM' ? 'PM' : 'AM';
      }
    }
    return { hour: h, minute: m, period: p };
  };

  const parsed = parseTime(initialTime);
  const [hour, setHour] = useState<number>(parsed.hour);
  const [minute, setMinute] = useState<number>(parsed.minute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(parsed.period);
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');

  const dialRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Handle pointer down / move on the dial
  const handleDialInteraction = useCallback(
    (clientX: number, clientY: number, isFinalRelease = false) => {
      if (!dialRef.current) return;
      const rect = dialRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;

      // Angle in degrees from top (12 o'clock / 00 min)
      let theta = Math.atan2(dy, dx) * (180 / Math.PI);
      let angleFromTop = theta + 90;
      if (angleFromTop < 0) angleFromTop += 360;

      if (mode === 'hours') {
        // 360 degrees / 12 = 30 degrees per hour
        let selectedH = Math.round(angleFromTop / 30);
        if (selectedH === 0) selectedH = 12;
        if (selectedH > 12) selectedH = 1;
        setHour(selectedH);

        if (isFinalRelease) {
          // Auto advance to minutes
          setTimeout(() => {
            setMode('minutes');
          }, 180);
        }
      } else {
        // 360 degrees / 60 = 6 degrees per minute, rounded to 5 mins or nearest
        let rawMin = Math.round(angleFromTop / 6) % 60;
        // Snap to nearest 5 min if near
        const snapDiff = rawMin % 5;
        if (snapDiff <= 2) rawMin -= snapDiff;
        else rawMin += 5 - snapDiff;
        rawMin = rawMin % 60;
        setMinute(rawMin);
      }
    },
    [mode]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleDialInteraction(e.clientX, e.clientY, false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    handleDialInteraction(e.clientX, e.clientY, false);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    handleDialInteraction(e.clientX, e.clientY, true);
  };

  if (!isOpen) return null;

  const handleConfirm = () => {
    const formatted = `${hour}:${String(minute).padStart(2, '0')} ${period}`;
    onSelectTime(formatted);
    onClose();
  };

  // Clock constants
  const DIAL_RADIUS = 100; // px
  const CENTER = 120; // 240px diameter

  // Compute hand line end
  let currentAngle = 0;
  if (mode === 'hours') {
    currentAngle = (hour % 12) * 30; // 0 deg is 12 o'clock
  } else {
    currentAngle = minute * 6; // 0 deg is 00 min
  }
  const rad = (currentAngle - 90) * (Math.PI / 180);
  const handX = CENTER + DIAL_RADIUS * Math.cos(rad);
  const handY = CENTER + DIAL_RADIUS * Math.sin(rad);

  const hourNumbers = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minuteNumbers = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 w-full max-w-xs sm:max-w-sm shadow-2xl border border-[#d8edd9] select-none animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <h3 className="text-sm font-semibold text-[#6e8a75] mb-4">
          Select time
        </h3>

        {/* Digital Readout & AM/PM Controls */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {/* Hours Box */}
          <button
            type="button"
            onClick={() => setMode('hours')}
            className={`w-20 h-18 rounded-2xl flex items-center justify-center text-4xl font-bold transition-all cursor-pointer ${
              mode === 'hours'
                ? 'bg-[#e0f2fe] text-[#0284c7] ring-2 ring-[#38bdf8]/40'
                : 'bg-[#f4efe6] text-[#4b5563] hover:bg-[#eae3d6]'
            }`}
          >
            {hour}
          </button>

          {/* Colon */}
          <span className="text-3xl font-bold text-[#6b7280]">:</span>

          {/* Minutes Box */}
          <button
            type="button"
            onClick={() => setMode('minutes')}
            className={`w-20 h-18 rounded-2xl flex items-center justify-center text-4xl font-bold transition-all cursor-pointer ${
              mode === 'minutes'
                ? 'bg-[#e0f2fe] text-[#0284c7] ring-2 ring-[#38bdf8]/40'
                : 'bg-[#f4efe6] text-[#4b5563] hover:bg-[#eae3d6]'
            }`}
          >
            {String(minute).padStart(2, '0')}
          </button>

          {/* AM / PM Segmented Toggle */}
          <div className="flex flex-col border border-[#d1d5db] rounded-2xl overflow-hidden ml-1">
            <button
              type="button"
              onClick={() => setPeriod('AM')}
              className={`px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                period === 'AM'
                  ? 'bg-[#e0f2fe] text-[#0284c7]'
                  : 'bg-white text-[#6b7280] hover:bg-gray-50'
              }`}
            >
              AM
            </button>
            <div className="h-px bg-[#d1d5db]" />
            <button
              type="button"
              onClick={() => setPeriod('PM')}
              className={`px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                period === 'PM'
                  ? 'bg-[#e0f2fe] text-[#0284c7]'
                  : 'bg-white text-[#6b7280] hover:bg-gray-50'
              }`}
            >
              PM
            </button>
          </div>
        </div>

        {/* Circular Clock Dial */}
        <div className="flex justify-center my-2">
          <div
            ref={dialRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative w-[240px] h-[240px] rounded-full bg-[#f4efe6] shadow-inner touch-none cursor-pointer flex items-center justify-center"
          >
            {/* Center Pivot */}
            <div className="absolute w-2 h-2 rounded-full bg-[#0284c7] z-20 pointer-events-none" />

            {/* Hand Line */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              <line
                x1={CENTER}
                y1={CENTER}
                x2={handX}
                y2={handY}
                stroke="#0284c7"
                strokeWidth="2.5"
              />
              {/* Highlight Circle on selected item */}
              <circle
                cx={handX}
                cy={handY}
                r="18"
                fill="#0284c7"
              />
            </svg>

            {/* Numbers around dial - directly tappable */}
            {mode === 'hours'
              ? hourNumbers.map((num) => {
                  const angle = (num % 12) * 30;
                  const theta = (angle - 90) * (Math.PI / 180);
                  const x = CENTER + DIAL_RADIUS * Math.cos(theta);
                  const y = CENTER + DIAL_RADIUS * Math.sin(theta);
                  const isSelected = hour === num;

                  return (
                    <button
                      key={`hour-${num}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHour(num);
                        setTimeout(() => setMode('minutes'), 180);
                      }}
                      className={`absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-sm font-bold z-20 transition-all cursor-pointer active:scale-90 ${
                        isSelected ? 'text-white' : 'text-[#374151] hover:bg-black/5'
                      }`}
                      style={{ left: `${x}px`, top: `${y}px` }}
                    >
                      {num}
                    </button>
                  );
                })
              : minuteNumbers.map((num) => {
                  const angle = num * 6;
                  const theta = (angle - 90) * (Math.PI / 180);
                  const x = CENTER + DIAL_RADIUS * Math.cos(theta);
                  const y = CENTER + DIAL_RADIUS * Math.sin(theta);
                  const isSelected = minute === num;

                  return (
                    <button
                      key={`min-${num}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMinute(num);
                      }}
                      className={`absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-xs font-bold z-20 transition-all cursor-pointer active:scale-90 ${
                        isSelected ? 'text-white' : 'text-[#374151] hover:bg-black/5'
                      }`}
                      style={{ left: `${x}px`, top: `${y}px` }}
                    >
                      {String(num).padStart(2, '0')}
                    </button>
                  );
                })}
          </div>
        </div>

        {/* Quick tap minute presets when in minutes mode */}
        {mode === 'minutes' && (
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {[0, 15, 30, 45].map((m) => (
              <button
                key={`preset-min-${m}`}
                type="button"
                onClick={() => setMinute(m)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  minute === m
                    ? 'bg-[#e0f2fe] text-[#0284c7] ring-1 ring-[#38bdf8]'
                    : 'bg-[#f4efe6] text-[#4b5563] hover:bg-[#eae3d6]'
                }`}
              >
                :{String(m).padStart(2, '0')}
              </button>
            ))}
          </div>
        )}

        {/* Footer Action Buttons */}
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
