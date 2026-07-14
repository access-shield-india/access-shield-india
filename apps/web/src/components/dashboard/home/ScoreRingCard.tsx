'use client';

import { Card } from '@accessshield/ui';
import { useEffect, useState } from 'react';

export interface ScoreRingCardProps {
  score: number;
  previousScore?: number | null;
}

export function ScoreRingCard({ score, previousScore }: ScoreRingCardProps) {
  const [mounted, setMounted] = useState(false);
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    setMounted(true);
  }, []);

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getScoreColor = (s: number) => {
    if (s >= 80) return '#16A34A'; // green
    if (s >= 50) return '#D97706'; // amber
    return '#DC2626'; // red
  };

  const color = getScoreColor(score);
  const delta = previousScore ? score - previousScore : null;

  return (
    <Card
      aria-label={`Accessibility score: ${score} out of 100${delta !== null ? `. Change from last scan: ${delta > 0 ? '+' : ''}${delta}` : ''}`}
    >
      <h3 className="text-lg font-semibold text-text-primary">Accessibility Score</h3>
      <div className="mt-6 flex items-center justify-center">
        <svg width="200" height="200" className="relative">
          {/* Background circle */}
          <circle cx="100" cy="100" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="16" />
          {/* Score circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={mounted && !prefersReducedMotion ? offset : circumference}
            style={{
              transition: prefersReducedMotion ? 'none' : 'stroke-dashoffset 1s ease-in-out',
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%',
            }}
          />
          <text x="100" y="95" textAnchor="middle" fontSize="48" fontWeight="bold" fill="#1A1A2E">
            {score}
          </text>
          <text x="100" y="115" textAnchor="middle" fontSize="16" fill="#6B7280">
            / 100
          </text>
        </svg>
      </div>

      {/* Accessible data table for screen readers */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-primary-600 hover:underline">
          View score details
        </summary>
        <table className="mt-2 w-full text-sm">
          <caption className="sr-only">Accessibility score details</caption>
          <tbody>
            <tr className="border-b border-gray-200">
              <th className="py-1 text-left font-medium text-text-secondary">Current Score</th>
              <td className="py-1 text-right text-text-primary">{score} / 100</td>
            </tr>
            {delta !== null && (
              <tr>
                <th className="py-1 text-left font-medium text-text-secondary">
                  Change from last scan
                </th>
                <td className="py-1 text-right text-text-primary">
                  {delta > 0 ? '+' : ''}
                  {delta}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </details>
    </Card>
  );
}
