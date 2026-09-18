import React from 'react';
import { Menu, Star, X } from 'lucide-react';
import { ViewType, PlanTimeframe, ThemeConfig } from '../types';
import { retroAudio } from '../utils/retroAudio';

interface HeaderProps {
  currentView: ViewType;
  onOpenMenu: () => void;
  onStartGuide: () => void;
  isGuideActive: boolean;
  onSkipGuide: () => void;
  planTimeframe?: PlanTimeframe;
  weekDateLabel?: string;
  monthDateLabel?: string;
  onJumpToToday?: () => void;
  currentTheme?: ThemeConfig;
}

const VIEW_TITLES: Record<ViewType, string> = {
  'daily-plan': 'Daily',
  'priorities': 'Priorities',
  'dedications': 'Dedications',
  'keywords': 'Keywords',
  'routines': 'Routines',
  'flow': 'Flow',
  'all-done': 'All Done',
  'widget': 'Widget',
  'settings': 'Settings',
};

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onOpenMenu,
  onStartGuide,
  isGuideActive,
  onSkipGuide,
  planTimeframe = 'Day',
  weekDateLabel = 'Sep 13 – 19',
  monthDateLabel = 'September 2026',
  onJumpToToday,
  currentTheme,
}) => {
  // Compute displayed title
  let displayTitle = VIEW_TITLES[currentView];
  const isMonthView = currentView === 'daily-plan' && planTimeframe === 'Month';
  
  if (currentView === 'daily-plan' && planTimeframe === 'Week') {
    displayTitle = weekDateLabel;
  } else if (isMonthView) {
    displayTitle = monthDateLabel;
  }

  const headerBg = currentTheme?.bgColor || '#FAF8F3';
  const headerTextColor = currentTheme?.textColor || '#2c3e50';

  return (
    <header 
      style={{ 
        backgroundColor: headerBg,
        color: headerTextColor,
        borderBottomColor: 'rgba(0, 0, 0, 0.08)',
      }}
      className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b transition-colors duration-200"
    >
      <div className="flex items-center gap-3">
        <button
          id="menu-btn"
          onClick={onOpenMenu}
          aria-label="Open Navigation Menu"
          style={{ color: headerTextColor }}
          className="p-2 -ml-1 active:scale-95 rounded-xl transition-all cursor-pointer hover:bg-black/5"
        >
          <Menu className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
        </button>

        <div className="flex flex-col">
          <h1
            id="header-title"
            style={{ color: headerTextColor }}
            className="text-2xl sm:text-3xl font-bold font-display tracking-tight select-none leading-tight"
          >
            {displayTitle}
          </h1>
          {currentView === 'routines' && (
            <p className="text-[13px] opacity-75 font-normal tracking-normal -mt-0.5" style={{ color: headerTextColor }}>
              Stack keywords into repeatable plans
            </p>
          )}
          {currentView === 'keywords' && (
            <p className="text-[13px] opacity-75 font-normal tracking-normal -mt-0.5" style={{ color: headerTextColor }}>
              Task defaults you can reuse in your Daily Plan
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Today quick jump in Week view */}
        {currentView === 'daily-plan' && planTimeframe === 'Week' && onJumpToToday && (
          <button
            type="button"
            onClick={onJumpToToday}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0284c7] bg-[#e0f2fe]/80 hover:bg-[#e0f2fe] border border-[#bae6fd] rounded-full shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <span>Today</span>
            <Star className="w-3.5 h-3.5 fill-[#0284c7]/20 text-[#0284c7]" />
          </button>
        )}

        {/* Skip button when guide tutorial is actively running */}
        {isGuideActive && (
          <button
            id="skip-guide-btn"
            onClick={onSkipGuide}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold tracking-wide text-[#2d5a3f] bg-white/80 hover:bg-white border border-[#c2e2c8] rounded-full shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <span>Skip</span>
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Star in the top right: Visible on pages, tapping opens/replays the tutorial */}
        <button
          id="header-guide-star-btn"
          onClick={() => {
            retroAudio.resume();
            retroAudio.playStarSparkle();
            if (isGuideActive) {
              onSkipGuide();
            } else {
              onStartGuide();
            }
          }}
          title={isGuideActive ? 'Close Tutorial Guide' : 'Replay Tutorial Guide'}
          aria-label={isGuideActive ? 'Close Tutorial Guide' : 'Replay Tutorial Guide'}
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-2xs border border-black/10 text-[#64748b] hover:text-[#1e293b] bg-white/70 hover:bg-white"
        >
          <Star
            className={`w-5 h-5 transition-transform ${
              isGuideActive
                ? 'fill-[#52b788] text-[#2d5a3f] scale-110'
                : 'fill-[#52b788]/25 stroke-[1.8] text-[#40916c] hover:scale-105'
            }`}
          />
        </button>
      </div>
    </header>
  );
};
