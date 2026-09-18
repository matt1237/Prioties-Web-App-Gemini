import React, { useState, useEffect } from 'react';
import { Clock, Plus, Minus } from 'lucide-react';
import { retroAudio } from '../utils/retroAudio';
import { parseDurationToMinutes } from '../utils/duration';

interface DurationClockPickerProps {
  valueMinutes: number;
  onChange: (minutes: number) => void;
  accentColor?: string; // e.g. '#84a4cb' or '#52b788'
  compact?: boolean;
}

export const DurationClockPicker: React.FC<DurationClockPickerProps> = ({
  valueMinutes,
  onChange,
  accentColor = '#84a4cb',
  compact = false,
}) => {
  // Clock constants
  const size = compact ? 190 : 220;
  const center = size / 2;
  const radius = compact ? 72 : 84;

  // Local manual text input state
  const [inputText, setInputText] = useState<string>(String(valueMinutes));

  useEffect(() => {
    setInputText(String(valueMinutes));
  }, [valueMinutes]);

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    const parsed = parseDurationToMinutes(val, -1);
    if (parsed > 0) {
      onChange(parsed);
    }
  };

  const handleManualBlur = () => {
    const parsed = parseDurationToMinutes(inputText, valueMinutes);
    setInputText(String(parsed));
    onChange(parsed);
  };

  // 12 increments around clock face: 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60
  const minuteNumbers = [60, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  // Quick preset pills
  const presets = [5, 10, 15, 20, 30, 45, 60, 90, 120];

  // Hand angle (0 deg is top / 60 or 0 min)
  const normalizedMin = valueMinutes % 60 === 0 && valueMinutes > 0 ? 60 : valueMinutes % 60;
  const handAngle = (normalizedMin / 60) * 360;
  const rad = (handAngle - 90) * (Math.PI / 180);
  const handX = center + radius * Math.cos(rad);
  const handY = center + radius * Math.sin(rad);

  const handleSelectMinutes = (mins: number) => {
    try {
      retroAudio.resume();
      retroAudio.playBoop(mins / 60);
    } catch {
      // Audio optional
    }
    setInputText(String(mins));
    onChange(mins);
  };

  const handleAdjust = (delta: number) => {
    const next = Math.max(5, valueMinutes + delta);
    handleSelectMinutes(next);
  };

  // Format label for display (e.g. "30 min" or "1 hr 30 min")
  const formatDisplay = (mins: number) => {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (m === 0) return `${h} ${h === 1 ? 'hr' : 'hrs'}`;
    return `${h}h ${m}m`;
  };

  return (
    <div className="w-full flex flex-col items-center select-none py-1">
      {/* Widget-style Clock Face Card */}
      <div className="relative flex flex-col items-center justify-center p-3 rounded-3xl bg-[#f4efe6]/80 border border-[#e5dfd5] shadow-xs">
        
        {/* Clock Dial */}
        <div
          style={{ width: `${size}px`, height: `${size}px` }}
          className="relative rounded-full bg-white shadow-inner flex items-center justify-center border border-[#e2ddd3]"
        >
          {/* Center Pin */}
          <div
            style={{ backgroundColor: accentColor }}
            className="absolute w-3 h-3 rounded-full z-20 pointer-events-none shadow-xs"
          />

          {/* Clock Hand Line */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            <line
              x1={center}
              y1={center}
              x2={handX}
              y2={handY}
              stroke={accentColor}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Outer pointer dot */}
            <circle
              cx={handX}
              cy={handY}
              r={compact ? "15" : "17"}
              fill={accentColor}
              opacity="0.25"
            />
          </svg>

          {/* Center Time Readout */}
          <div className="absolute z-0 flex flex-col items-center justify-center pointer-events-none">
            <span
              style={{ color: accentColor }}
              className="text-lg font-bold font-display tracking-tight leading-none"
            >
              {formatDisplay(valueMinutes)}
            </span>
          </div>

          {/* Numbers around the clock face - directly tappable buttons */}
          {minuteNumbers.map((num, idx) => {
            const angle = idx * 30; // 0 deg is 60/top, 30 deg is 5, 60 deg is 10...
            const theta = (angle - 90) * (Math.PI / 180);
            const x = center + radius * Math.cos(theta);
            const y = center + radius * Math.sin(theta);
            const isSelected = valueMinutes === num || (num === 60 && valueMinutes % 60 === 0 && valueMinutes > 0);

            return (
              <button
                key={`clock-min-${num}`}
                type="button"
                onClick={() => handleSelectMinutes(num)}
                aria-label={`${num} minutes`}
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  backgroundColor: isSelected ? accentColor : 'transparent',
                }}
                className={`absolute w-7 h-7 sm:w-8 sm:h-8 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-xs font-bold z-20 transition-all cursor-pointer active:scale-90 ${
                  isSelected
                    ? 'text-white shadow-md'
                    : 'text-[#334155] hover:bg-black/5 hover:text-[#0f172a]'
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>

        {/* Manual Input and Adjust Buttons (-5m / +5m) */}
        <div className="flex items-center justify-between w-full mt-2.5 px-2 gap-2">
          <button
            type="button"
            onClick={() => handleAdjust(-5)}
            aria-label="Subtract 5 minutes"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#475569] bg-white hover:bg-gray-50 border border-[#d8d3c8] rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <Minus className="w-3 h-3" />
            <span>5m</span>
          </button>

          {/* Manual Text Input Field */}
          <div className="flex items-center gap-1.5 bg-white border border-[#cbd5e1] focus-within:border-[#84a4cb] rounded-xl px-2.5 py-1 shadow-2xs">
            <span className="text-[11px] font-medium text-[#64748b]">Manual:</span>
            <input
              type="text"
              value={inputText}
              onChange={handleManualChange}
              onBlur={handleManualBlur}
              placeholder="min"
              aria-label="Enter minutes manually"
              className="w-10 text-center text-xs font-bold text-[#1e293b] outline-none bg-transparent"
            />
            <span className="text-[11px] font-semibold text-[#64748b]">min</span>
          </div>

          <button
            type="button"
            onClick={() => handleAdjust(5)}
            aria-label="Add 5 minutes"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#475569] bg-white hover:bg-gray-50 border border-[#d8d3c8] rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>5m</span>
          </button>
        </div>
      </div>

      {/* Quick Tap Preset Pills */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2.5 max-w-sm">
        {presets.map((p) => {
          const isSelected = valueMinutes === p;
          return (
            <button
              key={`preset-${p}`}
              type="button"
              onClick={() => handleSelectMinutes(p)}
              style={{
                backgroundColor: isSelected ? accentColor : undefined,
                borderColor: isSelected ? accentColor : undefined,
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-xl border transition-all cursor-pointer active:scale-95 ${
                isSelected
                  ? 'text-white shadow-2xs'
                  : 'bg-white text-[#475569] border-[#cbd5e1] hover:bg-gray-50'
              }`}
            >
              {p < 60 ? `${p} min` : p === 60 ? '1 hr' : `${p / 60} hrs`}
            </button>
          );
        })}
      </div>
    </div>
  );
};
