import React, { useRef, useState, useEffect, useCallback } from 'react';

interface ColorPickerFieldProps {
  color: string;
  onChange: (hex: string) => void;
}

// Helper: Convert HSV to Hex
export function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) => {
    const val = Math.max(0, Math.min(255, Math.round((n + m) * 255)));
    return val.toString(16).padStart(2, '0');
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// Helper: Convert Hex to HSV
export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) {
    return { h: 0, s: 1, v: 1 };
  }

  const r = (parseInt(clean.substring(0, 2), 16) || 0) / 255;
  const g = (parseInt(clean.substring(2, 4), 16) || 0) / 255;
  const b = (parseInt(clean.substring(4, 6), 16) || 0) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    if (max === r) {
      h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    } else if (max === g) {
      h = ((b - r) / d + 2) * 60;
    } else {
      h = ((r - g) / d + 4) * 60;
    }
  }

  return { h: Math.round(h), s, v };
}

export const ColorPickerField: React.FC<ColorPickerFieldProps> = ({ color, onChange }) => {
  const [hsv, setHsv] = useState(() => hexToHsv(color));
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;

  const satValRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const isDraggingSatVal = useRef(false);
  const isDraggingHue = useRef(false);

  // Sync internal state when external color prop changes significantly
  useEffect(() => {
    const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);
    if (currentHex.toUpperCase() !== color.toUpperCase()) {
      const nextHsv = hexToHsv(color);
      setHsv(nextHsv);
      hsvRef.current = nextHsv;
    }
  }, [color]);

  const updateSatValFromPoint = useCallback(
    (clientX: number, clientY: number) => {
      const el = satValRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));

      const s = Math.min(1, Math.max(0, x / rect.width));
      const v = Math.min(1, Math.max(0, 1 - y / rect.height));

      const next = { ...hsvRef.current, s, v };
      setHsv(next);
      hsvRef.current = next;
      onChange(hsvToHex(next.h, next.s, next.v));
    },
    [onChange]
  );

  const updateHueFromPoint = useCallback(
    (clientX: number) => {
      const el = hueRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const ratio = x / rect.width;
      const h = Math.round(Math.min(360, Math.max(0, ratio * 360)));

      const next = { ...hsvRef.current, h };
      setHsv(next);
      hsvRef.current = next;
      onChange(hsvToHex(next.h, next.s, next.v));
    },
    [onChange]
  );

  // Saturation / Value Pointer Handlers
  const handleSatValPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingSatVal.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateSatValFromPoint(e.clientX, e.clientY);
  };

  const handleSatValPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSatVal.current) return;
    updateSatValFromPoint(e.clientX, e.clientY);
  };

  const handleSatValPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingSatVal.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
  };

  // Hue Slider Pointer Handlers
  const handleHuePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingHue.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateHueFromPoint(e.clientX);
  };

  const handleHuePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingHue.current) return;
    updateHueFromPoint(e.clientX);
  };

  const handleHuePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingHue.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
  };

  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);

  return (
    <div className="pt-2 pb-3 px-1 animate-in fade-in zoom-in-95 duration-150 select-none">
      {/* Hex display on top right matching exact video representation */}
      <div className="flex justify-end mb-2">
        <span className="text-xs sm:text-sm font-semibold tracking-wider text-[#475569] uppercase font-mono">
          {currentHex}
        </span>
      </div>

      {/* 2D Saturation / Value Canvas */}
      <div
        ref={satValRef}
        onPointerDown={handleSatValPointerDown}
        onPointerMove={handleSatValPointerMove}
        onPointerUp={handleSatValPointerUp}
        onPointerCancel={handleSatValPointerUp}
        style={{
          backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
          backgroundImage: `
            linear-gradient(to top, #000, transparent),
            linear-gradient(to right, #fff, transparent)
          `,
        }}
        className="relative w-full h-36 sm:h-40 rounded-2xl cursor-crosshair overflow-hidden shadow-inner touch-none border border-black/10"
      >
        {/* Selector Thumb */}
        <div
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
          }}
          className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.5)] pointer-events-none transition-transform"
        />
      </div>

      {/* Rainbow Hue Slider Strip */}
      <div
        ref={hueRef}
        onPointerDown={handleHuePointerDown}
        onPointerMove={handleHuePointerMove}
        onPointerUp={handleHuePointerUp}
        onPointerCancel={handleHuePointerUp}
        style={{
          background:
            'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
        }}
        className="relative w-full h-5 mt-3.5 rounded-full cursor-pointer touch-none shadow-inner border border-black/10"
      >
        {/* Hue Thumb Selector */}
        <div
          style={{
            left: `${(hsv.h / 360) * 100}%`,
            backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
          }}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-white shadow-md pointer-events-none"
        />
      </div>
    </div>
  );
};
