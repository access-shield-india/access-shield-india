'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Section {
  id: string;
  label: string;
}

const sections: Section[] = [
  { id: 'what-is-heading', label: 'What is it' },
  { id: 'who-affected-heading', label: "Who's affected" },
  { id: 'penalties-heading', label: 'Penalties' },
  { id: 'is17802-heading', label: 'IS 17802' },
  { id: 'comply-heading', label: 'How to comply' },
  { id: 'faq-heading', label: 'FAQ' },
];

export function SectionNav() {
  const [activeSection, setActiveSection] = useState('');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window.IntersectionObserver === 'undefined') return;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(motionQuery.matches);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0,
      },
    );

    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
      element.focus({ preventScroll: true });
    }
  };

  return (
    <nav
      aria-label="Page sections"
      className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ul className="flex gap-6 overflow-x-auto py-4">
          {sections.map(({ id, label }) => (
            <li key={id}>
              <Link
                href={`#${id}`}
                onClick={(e) => handleClick(e, id)}
                className={`whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 ${
                  activeSection === id
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-text-secondary hover:text-primary-600'
                }`}
                aria-current={activeSection === id ? 'true' : undefined}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
