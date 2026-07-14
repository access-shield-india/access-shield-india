export interface ScoreRingProps {
  score: number;
  maxScore?: number;
  size?: number;
  label?: string;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#1A6B3C';
  if (score >= 60) return '#1A56A0';
  if (score >= 40) return '#E07B00';
  return '#8B1A1A';
}

export function ScoreRing({
  score,
  maxScore = 100,
  size = 120,
  label = 'Accessibility score',
  className,
}: ScoreRingProps) {
  const clamped = Math.min(maxScore, Math.max(0, score));
  const percent = (clamped / maxScore) * 100;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = getScoreColor(percent);
  const ariaLabel = `${label}: ${Math.round(percent)} out of ${maxScore}`;

  return (
    <div
      className={className}
      role="img"
      aria-label={ariaLabel}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          fill={color}
          fontSize={size * 0.22}
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
        >
          {Math.round(percent)}
        </text>
      </svg>
    </div>
  );
}

ScoreRing.displayName = 'ScoreRing';
