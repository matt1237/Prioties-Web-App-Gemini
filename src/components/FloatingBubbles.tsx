import React, { useState, useEffect, useRef, useCallback } from 'react';
import { retroAudio } from '../utils/retroAudio';

export type BubbleDensity = 'calm' | 'normal' | 'bubbly';

interface Bubble {
  id: string;
  x: number; // percentage (5% to 92%)
  y: number; // current vertical position in % (105% bottom down to -15% top)
  size: number; // diameter in pixels (32px to 76px)
  speed: number; // upward speed in % per frame
  driftOffset: number; // horizontal sine drift amplitude
  driftSpeed: number; // sine wave frequency
  wobbleDelay: number; // staggered animation delay
  opacity: number; // gentle translucency (0.65 - 0.9)
  hueVariant: 'mint' | 'cyan' | 'lavender' | 'emerald';
  isPopping: boolean;
  popType?: 'pop' | 'bop' | 'book';
  popX?: number; // client pixel coordinates for particle burst
  popY?: number;
  icon?: 'star' | 'leaf' | 'sparkle' | null;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
}

interface PopEffect {
  id: string;
  x: number;
  y: number;
  size: number;
  type: 'pop' | 'bop' | 'book';
  particles: Particle[];
}

interface FloatingBubblesProps {
  enabled: boolean;
  density?: BubbleDensity;
  onBubblePopped?: (count: number) => void;
}

export const FloatingBubbles: React.FC<FloatingBubblesProps> = ({
  enabled,
  density = 'normal',
  onBubblePopped,
}) => {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [popEffects, setPopEffects] = useState<PopEffect[]>([]);
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const popCountRef = useRef<number>(
    (() => {
      try {
        const saved = localStorage.getItem('priorities_bubble_pop_count');
        return saved ? parseInt(saved, 10) : 0;
      } catch {
        return 0;
      }
    })()
  );

  const maxBubbles = density === 'calm' ? 5 : density === 'bubbly' ? 14 : 9;

  // Create a new bubble with random attributes
  const createBubble = useCallback(
    (initialY: number = 105): Bubble => {
      const id = 'bubble-' + Math.random().toString(36).substring(2, 9);
      const size = Math.floor(32 + Math.random() * 42); // 32px to 74px
      const x = Math.floor(6 + Math.random() * 88); // 6% to 94%
      // Speed: ~3% to 6% per second
      const speed = 2.8 + Math.random() * 3.2;
      const driftOffset = 15 + Math.random() * 25;
      const driftSpeed = 0.8 + Math.random() * 1.4;
      const wobbleDelay = Math.random() * 4;
      const opacity = 0.68 + Math.random() * 0.28;

      const hues: ('mint' | 'cyan' | 'lavender' | 'emerald')[] = [
        'mint',
        'emerald',
        'cyan',
        'lavender',
      ];
      const hueVariant = hues[Math.floor(Math.random() * hues.length)];

      // 25% chance to have a cute subtle floating icon inside
      const icons: ('star' | 'leaf' | 'sparkle' | null)[] = [null, null, 'star', 'sparkle', 'leaf'];
      const icon = icons[Math.floor(Math.random() * icons.length)];

      return {
        id,
        x,
        y: initialY,
        size,
        speed,
        driftOffset,
        driftSpeed,
        wobbleDelay,
        opacity,
        hueVariant,
        isPopping: false,
        icon,
      };
    },
    []
  );

  // Initialize bubbles spread across screen
  useEffect(() => {
    if (!enabled) {
      setBubbles([]);
      return;
    }

    // Seed bubbles at different vertical heights so they don't all appear at once
    const initialBubbles: Bubble[] = [];
    for (let i = 0; i < maxBubbles; i++) {
      const startY = 15 + (i * (90 / maxBubbles)) + (Math.random() * 10 - 5);
      initialBubbles.push(createBubble(startY));
    }
    setBubbles(initialBubbles);
  }, [enabled, maxBubbles, createBubble]);

  // Main animation loop to float bubbles upward
  useEffect(() => {
    if (!enabled) return;

    let isRunning = true;

    const animate = (time: number) => {
      if (!isRunning) return;
      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      setBubbles((prev) => {
        const next: Bubble[] = [];

        for (const b of prev) {
          // If popping, keep it in DOM as an invisible shield to absorb trailing click/touch events
          if (b.isPopping) {
            next.push(b);
            continue;
          }

          // Move up
          const newY = b.y - b.speed * delta;

          // If float off top of viewport (-15%), re-spawn at bottom (105%)
          if (newY < -15) {
            next.push(createBubble(106));
          } else {
            next.push({
              ...b,
              y: newY,
            });
          }
        }

        // Fill up to maxBubbles (only counting non-popping bubbles)
        const activeCount = next.filter((b) => !b.isPopping).length;
        if (activeCount < maxBubbles) {
          next.push(createBubble(104 + Math.random() * 12));
        }

        return next;
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      isRunning = false;
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [enabled, maxBubbles, createBubble]);

  // Handle popping a bubble
  const handlePopBubble = (
    bubble: Bubble,
    e: React.MouseEvent | React.TouchEvent | React.PointerEvent
  ) => {
    e.stopPropagation();
    if (e.cancelable) {
      e.preventDefault();
    }
    if (bubble.isPopping) return;

    // Get click coordinate
    let clientX = 0;
    let clientY = 0;
    if ('clientX' in e && typeof e.clientX === 'number' && e.clientX > 0) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else if ('touches' in e && (e as React.TouchEvent).touches && (e as React.TouchEvent).touches[0]) {
      clientX = (e as React.TouchEvent).touches[0].clientX;
      clientY = (e as React.TouchEvent).touches[0].clientY;
    }

    if (!clientX && !clientY && typeof window !== 'undefined') {
      clientX = (window.innerWidth * bubble.x) / 100;
      clientY = (window.innerHeight * bubble.y) / 100;
    }

    // Ensure audio engine is unlocked on tap
    retroAudio.resume();

    // Size ratio for audio pitch scaling (32px to 74px -> 0.7 to 1.4)
    const sizeRatio = bubble.size / 50;

    // Play synthesized "bop", "pop", or "book/blook" sound!
    const playedSound = retroAudio.playBubblePop('random', sizeRatio);

    // Create particles radiating outward
    const numParticles = 8;
    const particles: Particle[] = [];
    const colors =
      bubble.hueVariant === 'mint'
        ? ['#52b788', '#74c69d', '#b7e4c7', '#ffffff']
        : bubble.hueVariant === 'emerald'
        ? ['#2d6a4f', '#40916c', '#95d5b2', '#ffffff']
        : bubble.hueVariant === 'cyan'
        ? ['#3a86c8', '#70a9dc', '#d4e8f5', '#ffffff']
        : ['#8a6bb8', '#b39ddb', '#e8e0f5', '#ffffff'];

    for (let i = 0; i < numParticles; i++) {
      const angle = (i / numParticles) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
      const speed = 40 + Math.random() * 65;
      particles.push({
        id: 'p-' + i + '-' + Math.random(),
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 3.5,
      });
    }

    const newEffect: PopEffect = {
      id: 'effect-' + Math.random().toString(36).substring(2, 9),
      x: clientX,
      y: clientY,
      size: bubble.size,
      type: playedSound,
      particles,
    };

    setPopEffects((prev) => [...prev, newEffect]);

    // Remove pop effect after animation completes
    setTimeout(() => {
      setPopEffects((prev) => prev.filter((eff) => eff.id !== newEffect.id));
    }, 550);

    // Increment pop count
    const nextCount = popCountRef.current + 1;
    popCountRef.current = nextCount;
    try {
      localStorage.setItem('priorities_bubble_pop_count', String(nextCount));
    } catch {}
    if (onBubblePopped) {
      onBubblePopped(nextCount);
    }

    // Mark bubble as popping immediately (it turns invisible, but remains in DOM for 350ms as a shield)
    setBubbles((prev) =>
      prev.map((item) => (item.id === bubble.id ? { ...item, isPopping: true } : item))
    );

    // After gesture completion, cleanly remove the bubble from state
    setTimeout(() => {
      setBubbles((prev) => prev.filter((b) => b.id !== bubble.id));
    }, 350);
  };

  if (!enabled) return null;

  return (
    <div
      id="floating-bubbles-layer"
      aria-hidden="false"
      className="pointer-events-none fixed inset-0 z-25 overflow-hidden select-none"
    >
      {/* Floating Bubbles */}
      {bubbles.map((b) => {
        // Horizontal drift calculation using sine
        const timeSec = performance.now() / 1000;
        const drift = Math.sin(timeSec * b.driftSpeed + b.wobbleDelay) * b.driftOffset;

        // Visual gradients by hue
        const gradientClass =
          b.hueVariant === 'mint'
            ? 'from-white/75 via-[#52b788]/20 to-[#40916c]/35 border-[#74c69d]/45'
            : b.hueVariant === 'emerald'
            ? 'from-white/80 via-[#40916c]/25 to-[#2d6a4f]/40 border-[#52b788]/50'
            : b.hueVariant === 'cyan'
            ? 'from-white/80 via-[#3a86c8]/25 to-[#2b6cb0]/35 border-[#70a9dc]/50'
            : 'from-white/80 via-[#8a6bb8]/25 to-[#7554a6]/35 border-[#b39ddb]/50';

        const swallowEvent = (e: React.SyntheticEvent) => {
          e.stopPropagation();
          if ('cancelable' in e && (e as any).cancelable) {
            e.preventDefault();
          }
        };

        return (
          <div
            key={b.id}
            onPointerDown={(e) => handlePopBubble(b, e)}
            onTouchStart={(e) => handlePopBubble(b, e)}
            onTouchEnd={swallowEvent}
            onClick={(e) => handlePopBubble(b, e)}
            onMouseDown={swallowEvent}
            onMouseUp={swallowEvent}
            style={{
              left: `calc(${b.x}% + ${drift}px)`,
              top: `${b.y}%`,
              width: `${b.size}px`,
              height: `${b.size}px`,
              opacity: b.isPopping ? 0 : b.opacity,
              animationDelay: `${b.wobbleDelay}s`,
              pointerEvents: 'auto',
              touchAction: 'none',
            }}
            title="Tap to pop!"
            className={`pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-75 ${
              b.isPopping ? 'scale-125 opacity-0' : 'hover:scale-115 active:scale-90 animate-bubble-wobble'
            }`}
          >
            {/* The Outer Bubble Shell with Glassy Shimmer */}
            {!b.isPopping && (
              <div
                className={`relative w-full h-full rounded-full border shadow-sm backdrop-blur-[0.5px] bg-gradient-to-br ${gradientClass} transition-all`}
                style={{
                  boxShadow:
                    'inset 0 0 10px rgba(255, 255, 255, 0.55), 0 3px 12px rgba(82, 183, 136, 0.18)',
                }}
              >
                {/* Crescent Specular Glint Top-Left */}
                <div className="absolute top-[14%] left-[16%] w-[28%] h-[24%] rounded-full bg-white/75 blur-[0.4px] rotate-[-35deg]" />

                {/* Smaller Second Glint Bottom-Right */}
                <div className="absolute bottom-[16%] right-[18%] w-[15%] h-[15%] rounded-full bg-white/45 blur-[0.3px]" />

                {/* Optional playful floating icon inside */}
                {b.icon && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-60 text-white font-bold text-[10px] pointer-events-none">
                    {b.icon === 'star' && '✦'}
                    {b.icon === 'leaf' && '☘'}
                    {b.icon === 'sparkle' && '✧'}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Pop Burst & Particle Effects */}
      {popEffects.map((eff) => (
        <div
          key={eff.id}
          style={{ left: eff.x, top: eff.y }}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
        >
          {/* Shockwave Expanding Ring */}
          <div
            style={{
              width: `${eff.size * 1.3}px`,
              height: `${eff.size * 1.3}px`,
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#52b788]/60 animate-bubble-pop-ring"
          />

          {/* Flying Droplet Particles */}
          {eff.particles.map((p) => (
            <div
              key={p.id}
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                ['--tx' as string]: `${p.vx * 0.75}px`,
                ['--ty' as string]: `${p.vy * 0.75}px`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full shadow-xs animate-particle-burst"
            />
          ))}

          {/* On-Screen Whimsical Pop Word ('*pop!*', '*bop!*', '*book!*') */}
          <div className="absolute -translate-x-1/2 -translate-y-1/2 text-xs font-extrabold uppercase tracking-wider text-[#2d6a4f] bg-white/95 px-2 py-0.5 rounded-full shadow-md border border-[#c2e2c8] animate-pop-text-float whitespace-nowrap">
            {eff.type === 'bop'
              ? '✦ bop!'
              : eff.type === 'book'
              ? '💧 book!'
              : '✨ pop!'}
          </div>
        </div>
      ))}
    </div>
  );
};
