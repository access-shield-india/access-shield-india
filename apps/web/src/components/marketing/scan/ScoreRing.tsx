'use client';

import { useEffect, useState } from 'react';

interface ScoreRingProps {
  score: number;
  size?: 'sm' | 'lg';
}

export function ScoreRing({ score, size = 'lg' }: ScoreRingProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    if (mediaQuery.matches) {
      setAnimatedScore(score);
    } else {
      let currentScore = 0;
      const increment = score / 30;
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
    }
  }, [score]);

  const dimensions = size === 'lg' ? { size: 200, strokeWidth: 12 } : { size: 120, strokeWidth: 8 };
  const radius = (dimensions.size - dimensions.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  const getColor = (score: number) => {
    if (score >= 80) return '#16A34A';
    if (score >= 50) return '#D97706';
    return '#DC2626';
  };

  const color = getColor(score);

  return (
    <div className="inline-flex flex-col items-center">
      <svg
        width={dimensions.size}
        height={dimensions.size}
        className="transform -rotate-90"
        aria-label={`Accessibility score: ${score} out of 100`}
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
          strokeDashoffset={prefersReducedMotion ? offset : offset}
          strokeLinecap="round"
          style={
            prefersReducedMotion ? undefined : { transition: 'stroke-dashoffset 0.5s ease-in-out' }
          }
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy=".3em"
          className="transform rotate-90"
          style={{ fontSize: size === 'lg' ? '48px' : '32px', fontWeight: 'bold', fill: color }}
        >
          {animatedScore}
        </text>
      </svg>
      <div className="mt-2 text-center">
        <span className="text-base text-text-secondary">out of 100</span>
      </div>
    </div>
  );
}
