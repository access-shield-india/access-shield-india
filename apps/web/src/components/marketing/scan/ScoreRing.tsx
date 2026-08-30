'use client';

import { useEffect, useState } from 'react';

interface ScoreRingProps {
  score: number;
  size?: 'sm' | 'lg';
}

export function ScoreRing({ score: rawScore, size = 'lg' }: ScoreRingProps) {
  const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 0;
  const [animatedScore, setAnimatedScore] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    if (mediaQuery.matches) {
      setAnimatedScore(score);
      return;
    }

    let currentScore = 0;
    const increment = Math.max(score / 30, score === 0 ? 1 : 0.5);
    const timer = setInterval(() => {
      currentScore += increment;
      if (currentScore >= score) {
        setAnimatedScore(score);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.round(currentScore));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [score]);

  const dimensions = size === 'lg' ? { size: 200, strokeWidth: 12 } : { size: 120, strokeWidth: 8 };
  const radius = (dimensions.size - dimensions.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  const getColor = (value: number) => {
    if (value >= 80) return '#16A34A';
    if (value >= 50) return '#D97706';
    return '#DC2626';
  };

  const color = getColor(score);
  const fontSize = size === 'lg' ? '3rem' : '2rem';

  return (
    <div className="inline-flex flex-col items-center">
      {/* Number is HTML — SVG parent -rotate-90 hides/skews <text> in many browsers */}
      <div
        className="relative"
        style={{ width: dimensions.size, height: dimensions.size }}
        role="img"
        aria-label={`Accessibility score: ${score} out of 100`}
      >
        <svg
          width={dimensions.size}
          height={dimensions.size}
          className="-rotate-90 transform"
          aria-hidden="true"
        >
          <circle
            cx={dimensions.size / 2}
            cy={dimensions.size / 2}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={dimensions.strokeWidth}
          />
          <circle
            cx={dimensions.size / 2}
            cy={dimensions.size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={dimensions.strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={
              prefersReducedMotion
                ? undefined
                : { transition: 'stroke-dashoffset 0.5s ease-in-out' }
            }
          />
        </svg>
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center font-bold"
          style={{ color, fontSize, lineHeight: 1 }}
          aria-hidden="true"
        >
          {animatedScore}
        </div>
      </div>
      <div className="mt-2 text-center">
        <span className="text-base text-text-secondary">out of 100</span>
      </div>
    </div>
  );
}
