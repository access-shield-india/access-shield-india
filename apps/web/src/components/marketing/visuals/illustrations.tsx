import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

export interface IllustrationProps extends SVGProps<SVGSVGElement> {
  className?: string;
}

function IllustrationFrame({ className, children, ...props }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 480 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
      className={cn('h-auto w-full', className)}
      {...props}
    >
      {children}
    </svg>
  );
}

/** Team collaboration — About page */
export function AboutIllustration(props: IllustrationProps) {
  return (
    <IllustrationFrame {...props}>
      <rect width="480" height="360" rx="24" fill="#F4F8FD" />
      <circle cx="400" cy="72" r="48" fill="#EBF3FB" />
      <circle cx="88" cy="300" r="36" fill="#EBF3FB" />
      <rect
        x="120"
        y="88"
        width="240"
        height="184"
        rx="16"
        fill="#FFFFFF"
        stroke="#D1D5DB"
        strokeWidth="2"
      />
      <rect x="144" y="112" width="80" height="12" rx="6" fill="#1A56A0" opacity="0.2" />
      <rect x="144" y="136" width="160" height="8" rx="4" fill="#D1D5DB" />
      <rect x="144" y="156" width="140" height="8" rx="4" fill="#D1D5DB" />
      <rect x="144" y="176" width="120" height="8" rx="4" fill="#D1D5DB" />
      <circle cx="176" cy="228" r="20" fill="#1A56A0" opacity="0.15" />
      <path d="M168 228h16M176 220v16" stroke="#1A56A0" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="280" cy="228" r="24" fill="#E6F4EC" stroke="#1A6B3C" strokeWidth="2" />
      <path
        d="M272 228l6 6 12-14"
        stroke="#1A6B3C"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="72" cy="140" r="28" fill="#1A56A0" />
      <circle cx="72" cy="132" r="10" fill="#FFFFFF" opacity="0.9" />
      <path d="M52 168c4-16 36-16 40 0" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
      <circle cx="408" cy="200" r="28" fill="#2E75B6" />
      <circle cx="408" cy="192" r="10" fill="#FFFFFF" opacity="0.9" />
      <path d="M388 228c4-16 36-16 40 0" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
    </IllustrationFrame>
  );
}

/** Support & contact */
export function ContactIllustration(props: IllustrationProps) {
  return (
    <IllustrationFrame {...props}>
      <rect width="480" height="360" rx="24" fill="#F4F8FD" />
      <rect
        x="140"
        y="60"
        width="200"
        height="240"
        rx="20"
        fill="#FFFFFF"
        stroke="#D1D5DB"
        strokeWidth="2"
      />
      <circle cx="240" cy="120" r="36" fill="#EBF3FB" />
      <path
        d="M224 120c0-8.837 7.163-16 16-16s16 7.163 16 16v4h-32v-4z"
        fill="#1A56A0"
        opacity="0.3"
      />
      <rect x="216" y="124" width="48" height="32" rx="16" fill="#1A56A0" />
      <path d="M228 148h24" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <rect x="168" y="188" width="144" height="12" rx="6" fill="#EBF3FB" />
      <rect x="168" y="212" width="120" height="12" rx="6" fill="#EBF3FB" />
      <rect x="168" y="236" width="96" height="12" rx="6" fill="#1A56A0" opacity="0.25" />
      <rect
        x="60"
        y="140"
        width="64"
        height="48"
        rx="12"
        fill="#FFFFFF"
        stroke="#1A56A0"
        strokeWidth="2"
      />
      <path
        d="M76 160h32M76 172h24"
        stroke="#1A56A0"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <rect
        x="356"
        y="120"
        width="64"
        height="48"
        rx="12"
        fill="#E6F4EC"
        stroke="#1A6B3C"
        strokeWidth="2"
      />
      <path
        d="M372 140l8 8 16-18"
        stroke="#1A6B3C"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IllustrationFrame>
  );
}

/** Careers / growth */
export function CareersIllustration(props: IllustrationProps) {
  return (
    <IllustrationFrame {...props}>
      <rect width="480" height="360" rx="24" fill="#F4F8FD" />
      <rect
        x="80"
        y="80"
        width="320"
        height="200"
        rx="16"
        fill="#FFFFFF"
        stroke="#D1D5DB"
        strokeWidth="2"
      />
      <path
        d="M120 240 L180 180 L240 200 L300 120 L360 160"
        stroke="#1A56A0"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="180" cy="180" r="8" fill="#1A56A0" />
      <circle cx="240" cy="200" r="8" fill="#2E75B6" />
      <circle cx="300" cy="120" r="8" fill="#1A6B3C" />
      <rect x="120" y="252" width="40" height="8" rx="4" fill="#D1D5DB" />
      <rect x="200" y="252" width="40" height="8" rx="4" fill="#D1D5DB" />
      <rect x="280" y="252" width="40" height="8" rx="4" fill="#D1D5DB" />
      <rect x="340" y="48" width="80" height="32" rx="16" fill="#1A56A0" />
      <path d="M360 64h40" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <circle cx="56" cy="56" r="24" fill="#FEF3E2" stroke="#E07B00" strokeWidth="2" />
      <path d="M48 56h16M56 48v16" stroke="#7A4500" strokeWidth="2" strokeLinecap="round" />
    </IllustrationFrame>
  );
}

/** Documentation */
export function DocsIllustration(props: IllustrationProps) {
  return (
    <IllustrationFrame {...props}>
      <rect width="480" height="360" rx="24" fill="#F4F8FD" />
      <rect
        x="160"
        y="48"
        width="160"
        height="220"
        rx="12"
        fill="#FFFFFF"
        stroke="#D1D5DB"
        strokeWidth="2"
      />
      <rect x="180" y="72" width="120" height="10" rx="5" fill="#1A56A0" opacity="0.3" />
      <rect x="180" y="96" width="100" height="8" rx="4" fill="#D1D5DB" />
      <rect x="180" y="116" width="110" height="8" rx="4" fill="#D1D5DB" />
      <rect x="180" y="136" width="90" height="8" rx="4" fill="#D1D5DB" />
      <rect
        x="180"
        y="168"
        width="24"
        height="24"
        rx="6"
        fill="#E6F4EC"
        stroke="#1A6B3C"
        strokeWidth="2"
      />
      <path d="M186 180l4 4 8-10" stroke="#1A6B3C" strokeWidth="2" strokeLinecap="round" />
      <rect x="212" y="172" width="80" height="8" rx="4" fill="#D1D5DB" />
      <rect
        x="180"
        y="204"
        width="24"
        height="24"
        rx="6"
        fill="#E6F4EC"
        stroke="#1A6B3C"
        strokeWidth="2"
      />
      <path d="M186 216l4 4 8-10" stroke="#1A6B3C" strokeWidth="2" strokeLinecap="round" />
      <rect x="212" y="208" width="72" height="8" rx="4" fill="#D1D5DB" />
      <rect
        x="120"
        y="100"
        width="48"
        height="64"
        rx="8"
        fill="#EBF3FB"
        stroke="#1A56A0"
        strokeWidth="2"
        opacity="0.8"
      />
      <rect
        x="312"
        y="120"
        width="48"
        height="64"
        rx="8"
        fill="#EBF3FB"
        stroke="#1A56A0"
        strokeWidth="2"
        opacity="0.8"
      />
    </IllustrationFrame>
  );
}

/** Services / compliance audit */
export function ServicesIllustration(props: IllustrationProps) {
  return (
    <IllustrationFrame {...props}>
      <rect width="480" height="360" rx="24" fill="#F4F8FD" />
      <path
        d="M240 56 L320 96 V176 C320 224 240 264 240 264 C240 264 160 224 160 176 V96 Z"
        fill="#FFFFFF"
        stroke="#1A56A0"
        strokeWidth="3"
      />
      <path
        d="M216 176 L232 192 L268 152"
        stroke="#1A6B3C"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="96"
        y="200"
        width="128"
        height="96"
        rx="12"
        fill="#FFFFFF"
        stroke="#D1D5DB"
        strokeWidth="2"
      />
      <rect x="112" y="216" width="96" height="8" rx="4" fill="#D1D5DB" />
      <rect x="112" y="236" width="80" height="8" rx="4" fill="#D1D5DB" />
      <rect x="112" y="256" width="64" height="8" rx="4" fill="#FDEAEA" />
      <circle cx="256" cy="248" r="40" fill="#FFFFFF" stroke="#1A56A0" strokeWidth="3" />
      <circle cx="256" cy="248" r="24" stroke="#1A56A0" strokeWidth="3" fill="none" />
      <path d="M272 264 L296 288" stroke="#1A56A0" strokeWidth="4" strokeLinecap="round" />
    </IllustrationFrame>
  );
}

/** Legal / RPwD guide */
export function LegalGuideIllustration(props: IllustrationProps) {
  return (
    <IllustrationFrame {...props}>
      <rect width="480" height="360" rx="24" fill="#F4F8FD" />
      <rect
        x="140"
        y="64"
        width="120"
        height="160"
        rx="8"
        fill="#FFFFFF"
        stroke="#D1D5DB"
        strokeWidth="2"
      />
      <rect x="160" y="88" width="80" height="8" rx="4" fill="#1A56A0" opacity="0.4" />
      <rect x="160" y="108" width="64" height="6" rx="3" fill="#D1D5DB" />
      <rect x="160" y="124" width="72" height="6" rx="3" fill="#D1D5DB" />
      <rect
        x="220"
        y="100"
        width="120"
        height="200"
        rx="8"
        fill="#FFFFFF"
        stroke="#1A56A0"
        strokeWidth="2"
      />
      <rect x="240" y="124" width="80" height="10" rx="5" fill="#1A56A0" opacity="0.3" />
      <rect x="240" y="148" width="72" height="6" rx="3" fill="#D1D5DB" />
      <rect x="240" y="164" width="80" height="6" rx="3" fill="#D1D5DB" />
      <circle cx="280" cy="220" r="32" fill="#EBF3FB" stroke="#1A56A0" strokeWidth="2" />
      <path d="M264 220h32M280 204v32" stroke="#1A56A0" strokeWidth="2.5" strokeLinecap="round" />
    </IllustrationFrame>
  );
}

/** Standards — IS 17802, WCAG */
export function StandardsGuideIllustration(props: IllustrationProps) {
  return (
    <IllustrationFrame {...props}>
      <rect width="480" height="360" rx="24" fill="#F4F8FD" />
      <rect
        x="100"
        y="80"
        width="280"
        height="200"
        rx="16"
        fill="#FFFFFF"
        stroke="#D1D5DB"
        strokeWidth="2"
      />
      <rect
        x="124"
        y="104"
        width="72"
        height="72"
        rx="12"
        fill="#EBF3FB"
        stroke="#1A56A0"
        strokeWidth="2"
      />
      <path d="M148 140h24M160 128v24" stroke="#1A56A0" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="212" y="112" width="140" height="10" rx="5" fill="#1A56A0" opacity="0.25" />
      <rect x="212" y="136" width="120" height="8" rx="4" fill="#D1D5DB" />
      <rect x="212" y="156" width="128" height="8" rx="4" fill="#D1D5DB" />
      <rect
        x="124"
        y="196"
        width="80"
        height="28"
        rx="14"
        fill="#E6F4EC"
        stroke="#1A6B3C"
        strokeWidth="2"
      />
      <rect
        x="220"
        y="196"
        width="80"
        height="28"
        rx="14"
        fill="#DBEAFE"
        stroke="#1E40AF"
        strokeWidth="2"
      />
      <rect
        x="316"
        y="196"
        width="48"
        height="28"
        rx="14"
        fill="#FEF3C7"
        stroke="#92400E"
        strokeWidth="2"
      />
    </IllustrationFrame>
  );
}

/** Government — GIGW */
export function GovernmentGuideIllustration(props: IllustrationProps) {
  return (
    <IllustrationFrame {...props}>
      <rect width="480" height="360" rx="24" fill="#F4F8FD" />
      <path
        d="M160 280 V160 L240 100 L320 160 V280 Z"
        fill="#FFFFFF"
        stroke="#1A56A0"
        strokeWidth="2"
      />
      <rect
        x="200"
        y="200"
        width="80"
        height="80"
        rx="4"
        fill="#EBF3FB"
        stroke="#1A56A0"
        strokeWidth="2"
      />
      <rect x="216" y="160" width="48" height="40" rx="4" fill="#1A56A0" opacity="0.2" />
      <circle cx="240" cy="132" r="16" fill="#1A56A0" />
      <rect x="120" y="280" width="240" height="12" rx="4" fill="#D1D5DB" />
      <rect
        x="340"
        y="120"
        width="80"
        height="120"
        rx="8"
        fill="#FFFFFF"
        stroke="#D1D5DB"
        strokeWidth="2"
      />
      <rect x="356" y="140" width="48" height="6" rx="3" fill="#1A6B3C" opacity="0.5" />
      <rect x="356" y="156" width="40" height="6" rx="3" fill="#D1D5DB" />
      <rect x="356" y="172" width="44" height="6" rx="3" fill="#D1D5DB" />
    </IllustrationFrame>
  );
}

/** Finance — SEBI */
export function FinanceGuideIllustration(props: IllustrationProps) {
  return (
    <IllustrationFrame {...props}>
      <rect width="480" height="360" rx="24" fill="#F4F8FD" />
      <rect
        x="80"
        y="200"
        width="320"
        height="80"
        rx="12"
        fill="#FFFFFF"
        stroke="#D1D5DB"
        strokeWidth="2"
      />
      <path
        d="M120 240 L180 200 L240 220 L300 160 L360 180"
        stroke="#1A56A0"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect
        x="160"
        y="80"
        width="160"
        height="100"
        rx="12"
        fill="#FFFFFF"
        stroke="#1A56A0"
        strokeWidth="2"
      />
      <text
        x="240"
        y="140"
        textAnchor="middle"
        fill="#1A56A0"
        fontSize="28"
        fontWeight="700"
        fontFamily="system-ui"
      >
        ₹
      </text>
      <circle cx="400" cy="100" r="32" fill="#E6F4EC" stroke="#1A6B3C" strokeWidth="2" />
      <path
        d="M388 100l8 8 16-18"
        stroke="#1A6B3C"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IllustrationFrame>
  );
}
