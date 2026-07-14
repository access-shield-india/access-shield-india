'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const categories = [
  { label: 'All', value: '' },
  { label: 'RPwD Act', value: 'RPwD Act' },
  { label: 'IS 17802', value: 'IS 17802' },
  { label: 'SEBI', value: 'SEBI' },
  { label: 'WCAG 2.2', value: 'Tutorial' },
  { label: 'Case Studies', value: 'Case Study' },
];

export function CategoryFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get('category') || '';

  const handleCategoryChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('category', value);
    } else {
      params.delete('category');
    }
    router.push(`/blog?${params.toString()}`);
  };

  return (
    <nav aria-label="Article categories">
      <ul className="flex flex-wrap gap-3">
        {categories.map((category) => (
          <li key={category.value}>
            <button
              onClick={() => handleCategoryChange(category.value)}
              aria-pressed={activeCategory === category.value}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 ${
                activeCategory === category.value
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : 'border-gray-300 bg-white text-text-secondary hover:border-primary-600 hover:text-primary-600'
              }`}
            >
              {category.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
