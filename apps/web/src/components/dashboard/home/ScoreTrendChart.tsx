'use client';

import { Card } from '@accessshield/ui';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatIndianDate } from '@/lib/utils';

export interface ScanScore {
  scanId: string;
  date: string;
  score: number;
}

export interface ScoreTrendChartProps {
  scans: ScanScore[];
}

export function ScoreTrendChart({ scans }: ScoreTrendChartProps) {
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const currentScore = scans[scans.length - 1]?.score ?? 0;
  const firstScore = scans[0]?.score ?? 0;
  const trend = currentScore - firstScore;

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#16A34A';
    if (score >= 50) return '#D97706';
    return '#DC2626';
  };

  const chartData = scans.map((scan) => ({
    date: formatIndianDate(scan.date),
    score: scan.score,
  }));

  return (
    <Card
      role="img"
      aria-label={`Score trend over last ${scans.length} scans. Current score ${currentScore}, ${trend >= 0 ? 'up' : 'down'} ${Math.abs(trend)} points from start.`}
    >
      <h3 className="text-lg font-semibold text-text-primary">Score Trend</h3>
      <div className="mt-6 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" stroke="#6B7280" style={{ fontSize: '12px' }} />
            <YAxis domain={[0, 100]} stroke="#6B7280" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
              }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke={getScoreColor(currentScore)}
              strokeWidth={2}
              dot={{ fill: getScoreColor(currentScore), r: 4 }}
              isAnimationActive={!prefersReducedMotion}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Accessible data table */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-primary-600 hover:underline">
          View score data as table
        </summary>
        <table className="mt-2 w-full text-sm">
          <caption className="sr-only">Score history</caption>
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-2 text-left font-medium text-text-secondary">Scan Date</th>
              <th className="py-2 text-right font-medium text-text-secondary">Score</th>
            </tr>
          </thead>
          <tbody>
            {scans.map((scan) => (
              <tr key={scan.scanId} className="border-b border-gray-100">
                <td className="py-2 text-text-primary">{formatIndianDate(scan.date)}</td>
                <td className="py-2 text-right text-text-primary">{scan.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Card>
  );
}
