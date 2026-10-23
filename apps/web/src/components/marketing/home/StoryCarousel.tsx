'use client';

import { useCallback, useEffect, useRef, useState, type FocusEvent, type TouchEvent } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { ButtonLink } from '@/components/marketing/ButtonLink';
import { MarketingImage } from '@/components/marketing/visuals/MarketingImage';
import { useDictionary } from '@/lib/i18n/locale-context';
import { MARKETING_IMAGES } from '@/lib/marketing/images';
import { cn } from '@/lib/utils';

type SlideId = 'screenReader' | 'lowVision' | 'keyboard' | 'deaf' | 'compliance';

const SLIDE_IMAGES: Record<SlideId, string> = {
  screenReader: MARKETING_IMAGES.carouselScreenReader,
  lowVision: MARKETING_IMAGES.carouselLowVision,
  keyboard: MARKETING_IMAGES.carouselKeyboard,
  deaf: MARKETING_IMAGES.carouselDeaf,
  compliance: MARKETING_IMAGES.carouselCompliance,
};

/** A11Y: WCAG 2.2.2 — anything moving for > 5s needs pause; 7s also gives time to read. */
export const SLIDE_DURATION_MS = 7000;
const TICK_MS = 100;
const SWIPE_THRESHOLD_PX = 50;

/** Wraps an index into [0, total). */
export function wrapIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return ((index % total) + total) % total;
}

function fillTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/**
 * Auto-rotating story carousel following the WAI-ARIA APG carousel pattern:
 * pause control first, rotation stops on hover / keyboard focus, and it never
 * auto-starts for users who prefer reduced motion.
 */
export function StoryCarousel() {
  const { home } = useDictionary();
  const copy = home.storyCarousel;
  const slides = copy.slides;
  const total = slides.length;

  const [active, setActive] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focusedInside, setFocusedInside] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) setUserPaused(true);
  }, []);

  const rotating = !userPaused && !hovered && !focusedInside;

  const goTo = useCallback(
    (index: number) => {
      setActive(wrapIndex(index, total));
      setElapsed(0);
    },
    [total],
  );

  useEffect(() => {
    if (!rotating || total < 2) return;
    const timer = setInterval(() => setElapsed((prev) => prev + TICK_MS), TICK_MS);
    return () => clearInterval(timer);
  }, [rotating, total]);

  useEffect(() => {
    if (elapsed < SLIDE_DURATION_MS) return;
    setActive((current) => wrapIndex(current + 1, total));
    setElapsed(0);
  }, [elapsed, total]);

  // A11Y: focus on the play/pause button itself must not pause rotation, or "Play" could never resume it.
  function handleFocus(event: FocusEvent<HTMLElement>) {
    setFocusedInside(event.target !== toggleRef.current);
  }

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocusedInside(false);
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStartX.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start === null || end === undefined) return;
    const delta = end - start;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    goTo(delta < 0 ? active + 1 : active - 1);
  }

  const slide = slides[active];
  if (!slide) return null;

  const progress = Math.min(elapsed / SLIDE_DURATION_MS, 1);

  return (
    <MotionConfig reducedMotion="user">
      <section
        aria-labelledby="story-carousel-heading"
        className="overflow-hidden bg-primary-900 px-4 py-8 sm:px-6 sm:py-10 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2
              id="story-carousel-heading"
              className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
            >
              {copy.title}
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-base leading-normal text-primary-100 sm:text-lg">
              {copy.subtitle}
            </p>
          </div>

          <div
            role="region"
            aria-roledescription="carousel"
            aria-label={copy.regionAria}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className="mt-6"
          >
            <div
              className="grid overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 lg:grid-cols-12"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className="relative aspect-[16/10] overflow-hidden lg:col-span-7 lg:aspect-auto lg:min-h-[440px]">
                <AnimatePresence initial={false}>
                  <motion.div
                    key={slide.id}
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                  >
                    <motion.div
                      className="absolute inset-0"
                      initial={{ scale: 1 }}
                      animate={{ scale: 1.06 }}
                      transition={{ duration: SLIDE_DURATION_MS / 1000 + 1, ease: 'linear' }}
                    >
                      <MarketingImage
                        src={SLIDE_IMAGES[slide.id]}
                        alt={slide.imageAlt}
                        fill
                        priority={active === 0}
                        sizes="(max-width: 1024px) 100vw, 60vw"
                      />
                    </motion.div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex flex-col justify-between gap-6 p-6 sm:p-8 lg:col-span-5">
                <div
                  role="group"
                  aria-roledescription="slide"
                  aria-label={fillTemplate(copy.slideOf, { current: active + 1, total })}
                  aria-live={rotating ? 'off' : 'polite'}
                  aria-atomic="true"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={slide.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.35 }}
                    >
                      <p className="text-sm font-semibold uppercase tracking-wide text-primary-100">
                        {slide.eyebrow}
                      </p>
                      <h3 className="mt-3 text-2xl font-bold leading-tight text-white sm:text-3xl">
                        {slide.title}
                      </h3>
                      <p className="mt-4 text-base leading-relaxed text-primary-100 sm:text-lg">
                        {slide.body}
                      </p>
                      <p className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-4xl font-bold text-amber-300">{slide.stat}</span>
                        <span className="text-base leading-normal text-white">
                          {slide.statLabel}
                        </span>
                      </p>
                      <ButtonLink href={slide.href} size="lg" variant="onDark" className="mt-8">
                        {slide.cta}
                      </ButtonLink>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="space-y-4">
                  <div
                    className="h-1 w-full overflow-hidden rounded-full bg-white/20"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full origin-left rounded-full bg-amber-300 motion-safe:transition-transform motion-safe:duration-100 motion-safe:ease-linear"
                      style={{ transform: `scaleX(${progress})` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      ref={toggleRef}
                      type="button"
                      onClick={() => setUserPaused((prev) => !prev)}
                      aria-label={userPaused ? copy.play : copy.pause}
                      className={controlClass}
                    >
                      {userPaused ? (
                        <Play className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <Pause className="h-5 w-5" aria-hidden="true" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => goTo(active - 1)}
                      aria-label={copy.previous}
                      className={controlClass}
                    >
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => goTo(active + 1)}
                      aria-label={copy.next}
                      className={controlClass}
                    >
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </button>

                    <ul className="ml-auto flex items-center">
                      {slides.map((s, index) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => goTo(index)}
                            aria-label={fillTemplate(copy.goTo, { n: index + 1, title: s.eyebrow })}
                            aria-current={index === active ? 'true' : undefined}
                            className="group flex h-11 w-8 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                          >
                            <span
                              className={cn(
                                'block h-2.5 rounded-full motion-safe:transition-all',
                                index === active
                                  ? 'w-6 bg-white'
                                  : 'w-2.5 bg-primary-300 group-hover:bg-white',
                              )}
                            />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}

const controlClass =
  'flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/40 text-white hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900';
