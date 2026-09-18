import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Sparkles, X } from 'lucide-react';
import { GUIDE_STEPS } from '../data/initialData';
import { ViewType, PlanTimeframe } from '../types';
import { retroAudio, RetroSoundStyle } from '../utils/retroAudio';

interface InteractiveGuideProps {
  currentStepIndex: number;
  onNextStep: () => void;
  onPrevStep: () => void;
  onFinishGuide: () => void;
  onSelectView: (view: ViewType) => void;
  onSelectPlanTimeframe?: (timeframe: PlanTimeframe) => void;
}

export const InteractiveGuide: React.FC<InteractiveGuideProps> = ({
  currentStepIndex,
  onNextStep,
  onPrevStep,
  onFinishGuide,
  onSelectView,
  onSelectPlanTimeframe,
}) => {
  const stepData = GUIDE_STEPS[currentStepIndex];
  const fullText = stepData?.text || '';

  const [displayedLength, setDisplayedLength] = useState<number>(0);
  const [isTypingComplete, setIsTypingComplete] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => retroAudio.getIsMuted());
  const [soundStyle, setSoundStyle] = useState<RetroSoundStyle>(() => retroAudio.getSoundStyle());
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(() => retroAudio.isAudioReady());
  const timerRef = useRef<number | null>(null);

  // Sync view to step's target view & ensure Day timeframe for daily-plan steps
  useEffect(() => {
    if (stepData?.targetView) {
      onSelectView(stepData.targetView);
      if (stepData.targetView === 'daily-plan' && onSelectPlanTimeframe) {
        onSelectPlanTimeframe('Day');
      }
    }
  }, [currentStepIndex, stepData?.targetView, onSelectView, onSelectPlanTimeframe]);

  // Handle typewriter typing with retro 16-bit sound synthesis
  useEffect(() => {
    setDisplayedLength(0);
    setIsTypingComplete(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    let charIndex = 0;
    timerRef.current = window.setInterval(() => {
      charIndex += 1;
      setDisplayedLength(charIndex);

      // Play authentic SNES / Sega wobble/worble for incoming character
      const nextChar = fullText[charIndex - 1];
      if (nextChar) {
        retroAudio.playCharacterWobble(nextChar, charIndex);
      }

      if (charIndex >= fullText.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsTypingComplete(true);
      }
    }, 32); // authentic retro pacing

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentStepIndex, fullText]);

  // Unlock audio context on user interaction
  const ensureAudioUnlocked = () => {
    retroAudio.resume().then((ready) => {
      if (ready) setIsAudioUnlocked(true);
    });
  };

  // Toggle Mute / Unmute
  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    ensureAudioUnlocked();
    const muted = retroAudio.toggleMute();
    setIsMuted(muted);
  };

  // Switch sound style (SNES -> Sega -> Vintage)
  const handleCycleSoundStyle = (e: React.MouseEvent) => {
    e.stopPropagation();
    ensureAudioUnlocked();
    const styles: RetroSoundStyle[] = ['snes', 'sega', 'vintage'];
    const nextIdx = (styles.indexOf(soundStyle) + 1) % styles.length;
    const nextStyle = styles[nextIdx];
    retroAudio.setSoundStyle(nextStyle);
    setSoundStyle(nextStyle);
    // Play quick sample preview
    retroAudio.playCharacterWobble('E', 1);
  };

  // Handle tap on dialogue card
  const handleCardClick = (e: React.MouseEvent) => {
    // Avoid double trigger if clicking directly on buttons
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    ensureAudioUnlocked();

    if (!isTypingComplete) {
      // Reveal immediately and play retro whoosh
      if (timerRef.current) clearInterval(timerRef.current);
      setDisplayedLength(fullText.length);
      setIsTypingComplete(true);
      retroAudio.playRevealWhoosh();
    } else {
      // Proceed to next step with chime
      retroAudio.playAdvanceChime();
      if (currentStepIndex < GUIDE_STEPS.length - 1) {
        onNextStep();
      } else {
        onFinishGuide();
      }
    }
  };

  // Compute spotlight element bounding rect
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const updateRect = () => {
      if (!stepData?.spotlightSelector) {
        setSpotlightRect(null);
        return;
      }
      const el = document.querySelector(stepData.spotlightSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setSpotlightRect(rect);
      } else {
        setSpotlightRect(null);
      }
    };

    updateRect();
    const timeout = setTimeout(updateRect, 100);
    window.addEventListener('resize', updateRect);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateRect);
    };
  }, [currentStepIndex, stepData?.spotlightSelector]);

  if (!stepData) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* Dimmed backdrop */}
      <div className="absolute inset-0 bg-[#0e1f14]/45 backdrop-blur-[1px] pointer-events-auto" />

      {/* Top Right Skip Button */}
      <div className="fixed top-4 right-4 sm:top-5 sm:right-6 pointer-events-auto z-50">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            retroAudio.playAdvanceChime();
            onFinishGuide();
          }}
          id="tutorial-skip-btn"
          aria-label="Skip Tutorial"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 hover:bg-white text-[#1b4332] text-xs sm:text-sm font-bold shadow-md border border-[#cbe5d0] active:scale-95 transition-all cursor-pointer backdrop-blur-xs"
        >
          <span>Skip</span>
          <X className="w-4 h-4 text-[#52796f] stroke-[2.5]" />
        </button>
      </div>

      {/* Target Spotlight Highlight Ring */}
      {spotlightRect && (
        <div
          className="absolute z-40 pointer-events-none rounded-2xl transition-all duration-300 ease-out"
          style={{
            top: `${Math.max(0, spotlightRect.top - 6)}px`,
            left: `${Math.max(0, spotlightRect.left - 6)}px`,
            width: `${spotlightRect.width + 12}px`,
            height: `${spotlightRect.height + 12}px`,
            boxShadow: '0 0 0 9999px rgba(14, 31, 20, 0.45), 0 0 20px 4px rgba(116, 198, 157, 0.65)',
            border: '2.5px dashed #52b788',
            backgroundColor: 'transparent',
          }}
        >
          {/* Subtle glowing animated ring */}
          <div className="absolute inset-0 rounded-2xl ring-2 ring-[#74c69d]/80 animate-ping opacity-30" />
        </div>
      )}

      {/* Dialogue Card Container (Positioned bottom of screen) */}
      <div className="absolute bottom-6 inset-x-0 mx-auto w-full max-w-lg px-4 pointer-events-auto z-50">
        <div
          id="guide-dialogue-card"
          onClick={handleCardClick}
          className="relative bg-white rounded-2xl p-5 shadow-2xl border border-[#d8edd9] cursor-pointer select-none transition-all active:scale-[0.99] overflow-hidden"
        >
          {/* Top Row: Guide Step Badge, Sound Mode & Title */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#edf5ee] gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-[#40916c] bg-[#eaf5ec] px-2.5 py-0.5 rounded-full">
                GUIDE {stepData.step}/{GUIDE_STEPS.length}
              </span>

              {/* Retro Sound Style Switcher */}
              <button
                type="button"
                onClick={handleCycleSoundStyle}
                title={`Click to switch sound style (Current: ${soundStyle.toUpperCase()})`}
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#edf7ee] hover:bg-[#d8edd9] text-[#2d5a3f] border border-[#c2e2c8] transition-all"
              >
                <Sparkles className="w-3 h-3 text-[#40916c]" />
                <span>
                  {soundStyle === 'snes' ? 'SNES Wobble' : soundStyle === 'sega' ? 'Sega Warble' : '8-Bit Pip'}
                </span>
              </button>

              {/* Active Audio Waveform Indicator */}
              {!isTypingComplete && !isMuted && (
                <span className="flex items-end gap-0.5 h-3 ml-0.5" title="Speaking voice synthesizer">
                  <span className="w-1 h-2 bg-[#40916c] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-3 bg-[#52b788] rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
                  <span className="w-1 h-1.5 bg-[#40916c] rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold font-display text-[#1b4332] truncate max-w-[130px] sm:max-w-none">
                {stepData.title}
              </h3>

              {/* Sound Mute/Unmute Button */}
              <button
                type="button"
                onClick={handleToggleMute}
                title={isMuted ? 'Unmute retro voice' : 'Mute retro voice'}
                className="p-1 rounded-full text-[#52796f] hover:text-[#1b4332] hover:bg-[#edf7ee] transition-all"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-[#8a9e91]" />
                ) : (
                  <Volume2 className="w-4 h-4 text-[#40916c]" />
                )}
              </button>

              {/* Skip Button inside Dialogue Card */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  retroAudio.playAdvanceChime();
                  onFinishGuide();
                }}
                title="Skip Tutorial"
                className="text-[11px] font-bold text-[#52796f] hover:text-[#1b4332] px-2 py-0.5 rounded-md hover:bg-[#edf7ee] transition-all"
              >
                Skip
              </button>
            </div>
          </div>

          {/* Typewriter message content */}
          <div className="min-h-[72px] flex items-start">
            <p className="text-sm font-medium text-[#2d4d38] leading-relaxed">
              {fullText.slice(0, displayedLength)}
              {!isTypingComplete && (
                <span className="inline-block w-1.5 h-4 ml-0.5 bg-[#40916c] animate-pulse align-middle" />
              )}
            </p>
          </div>

          {/* Bottom helper prompt */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-[#52796f] font-medium pt-2 border-t border-[#f0f7f1]">
            <span className="flex items-center gap-1.5">
              {!isTypingComplete
                ? 'Tap to reveal the whole message'
                : 'Tap again or use the arrows to move'}
              {!isAudioUnlocked && !isMuted && (
                <span className="text-[#40916c] font-semibold text-[10px] bg-[#eaf5ec] px-1.5 py-0.5 rounded">
                  (Tap to activate sound)
                </span>
              )}
            </span>
            <span className="text-[#40916c] font-semibold">
              {currentStepIndex + 1} of {GUIDE_STEPS.length}
            </span>
          </div>

          {/* Left Arrow Button */}
          {currentStepIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                ensureAudioUnlocked();
                retroAudio.playAdvanceChime();
                onPrevStep();
              }}
              title="Previous Step"
              aria-label="Previous step"
              className={`absolute left-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-[#edf7ee] text-[#2d5a3f] hover:bg-[#d8edd9] active:scale-90 transition-all ${
                isTypingComplete ? 'animate-bounce' : 'opacity-80'
              }`}
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}

          {/* Right Arrow Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              ensureAudioUnlocked();
              retroAudio.playAdvanceChime();
              if (currentStepIndex < GUIDE_STEPS.length - 1) {
                onNextStep();
              } else {
                onFinishGuide();
              }
            }}
            title="Next Step"
            aria-label="Next step"
            className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-[#edf7ee] text-[#2d5a3f] hover:bg-[#d8edd9] active:scale-90 transition-all ${
              isTypingComplete ? 'animate-bounce' : 'opacity-80'
            }`}
          >
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
