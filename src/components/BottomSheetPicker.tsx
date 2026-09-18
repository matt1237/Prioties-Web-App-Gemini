import React from 'react';
import { Check } from 'lucide-react';

export interface PickerOption {
  label: string;
  value: string;
}

interface BottomSheetPickerProps {
  isOpen: boolean;
  title: string;
  options: PickerOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export const BottomSheetPicker: React.FC<BottomSheetPickerProps> = ({
  isOpen,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/45 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl p-6 w-full max-w-lg mx-auto shadow-2xl border-t border-[#d8edd9] animate-in slide-in-from-bottom-8 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <h3 className="text-lg font-bold text-[#1b4332] mb-3">
          {title}
        </h3>

        {/* Options List */}
        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          {options.map((opt) => {
            const isSelected = opt.value === selectedValue;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onSelect(opt.value);
                  onClose();
                }}
                className="w-full flex items-center justify-between py-3 px-2 rounded-xl text-left hover:bg-[#edf7ee] transition-colors cursor-pointer group"
              >
                <span
                  className={`text-base ${
                    isSelected
                      ? 'font-bold text-[#1b4332]'
                      : 'text-[#4b5563] group-hover:text-[#1b4332]'
                  }`}
                >
                  {opt.label}
                </span>

                {isSelected && (
                  <Check className="w-5 h-5 text-[#0284c7] stroke-[2.5]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Cancel Button */}
        <div className="pt-4 mt-2 border-t border-[#f0f4f1] text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-base font-semibold text-[#6e8a75] hover:text-[#1b4332] transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
