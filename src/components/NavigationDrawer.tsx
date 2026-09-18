import React from 'react';
import { 
  Calendar, 
  List, 
  Star, 
  Bookmark, 
  Layers, 
  Clock, 
  CheckCircle2, 
  Sunrise, 
  Settings 
} from 'lucide-react';
import { ViewType, ThemeConfig } from '../types';
import { getBorderColor, isDarkTheme } from '../utils/priorityColors';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: ViewType;
  onSelectView: (view: ViewType) => void;
  onStartGuide?: () => void;
  currentTheme?: ThemeConfig;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  currentView,
  onSelectView,
  currentTheme,
}) => {
  if (!isOpen) return null;

  const isDark = isDarkTheme(currentTheme);
  const solidDrawerBg = isDark ? (currentTheme?.bgColor || '#18181b') : (currentTheme?.cardBg || currentTheme?.bgColor || '#FAF8F3');
  const headerBg = currentTheme?.primaryColor || (isDark ? '#27272a' : '#84a4cb');
  const textColor = currentTheme?.textColor || (isDark ? '#f4f4f5' : '#1e293b');
  const borderColor = getBorderColor(currentTheme);

  // Items in exact order as in Screenshot_20260917_204333_Priorities.jpg
  const navItems: { id: ViewType; label: string; icon: React.ElementType }[] = [
    { id: 'daily-plan', label: 'Daily Plan', icon: Calendar },
    { id: 'priorities', label: 'Priorities', icon: List },
    { id: 'dedications', label: 'Dedications', icon: Star },
    { id: 'keywords', label: 'Keywords', icon: Bookmark },
    { id: 'routines', label: 'Routines', icon: Layers },
    { id: 'flow', label: 'Flow', icon: Clock },
    { id: 'all-done', label: 'All Done', icon: CheckCircle2 },
    { id: 'widget', label: 'Widget', icon: Sunrise },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="fixed inset-0 z-50 flex select-none">
      {/* Dimmed backdrop - solid semi-transparent black overlay without blur filter */}
      <div 
        className="fixed inset-0 bg-black/60 transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Drawer Container - fully opaque solid panel */}
      <div 
        style={{
          backgroundColor: solidDrawerBg,
          borderColor,
          color: textColor,
        }}
        className="relative z-20 w-[290px] sm:w-[320px] max-w-[85vw] h-full shadow-2xl flex flex-col justify-between border-r bg-[#FAF8F3] dark:bg-zinc-900 opacity-100 animate-in slide-in-from-left duration-200"
      >
        <div className="flex-1 overflow-y-auto">
          {/* Header Banner */}
          <div 
            style={{ backgroundColor: headerBg }}
            className="px-6 py-5 sm:py-6 shadow-xs bg-[#84a4cb]"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Menu
            </h2>
          </div>

          {/* Navigation Items list */}
          <nav className="py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              const activeBg = `${headerBg}25`;
              const itemColor = isActive ? headerBg : textColor;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectView(item.id);
                    onClose();
                  }}
                  style={{
                    backgroundColor: isActive ? activeBg : 'transparent',
                  }}
                  className="w-full flex items-center gap-4 px-6 py-4 text-left transition-colors cursor-pointer hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
                >
                  <Icon
                    style={{
                      color: itemColor,
                    }}
                    className="w-[22px] h-[22px] shrink-0 stroke-[1.9]"
                  />
                  <span
                    style={{
                      color: itemColor,
                    }}
                    className={`text-[16px] tracking-tight ${
                      isActive ? 'font-semibold' : 'font-medium'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
};
