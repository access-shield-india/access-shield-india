interface BadgeSvgDisplayProps {
  level: string;
}

export function BadgeSvgDisplay({ level }: BadgeSvgDisplayProps) {
  const levelColors = {
    'WCAG 2.1 AA': { primary: '#059669', secondary: '#10B981' },
    'WCAG 2.2 AA': { primary: '#059669', secondary: '#10B981' },
    'IS 17802': { primary: '#0369A1', secondary: '#0284C7' },
  };

  const colors = levelColors[level as keyof typeof levelColors] || levelColors['WCAG 2.1 AA'];

  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${level} Certified accessibility badge`}
    >
      <circle cx="60" cy="60" r="58" fill={colors.primary} stroke="#fff" strokeWidth="2" />
      <circle cx="60" cy="60" r="46" fill={colors.secondary} />
      <path
        d="M45 60L55 70L75 50"
        stroke="#fff"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="60"
        y="95"
        textAnchor="middle"
        fill="#fff"
        fontSize="12"
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
      >
        {level}
      </text>
      <text
        x="60"
        y="22"
        textAnchor="middle"
        fill="#fff"
        fontSize="10"
        fontWeight="600"
        fontFamily="system-ui, sans-serif"
      >
        CERTIFIED
      </text>
    </svg>
  );
}
