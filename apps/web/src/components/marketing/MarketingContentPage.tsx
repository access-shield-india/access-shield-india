import type { ReactNode } from 'react';
import { MarketingPageHero } from '@/components/marketing/visuals';

export interface MarketingContentPageProps {
  title: string;
  description?: string;
  eyebrow?: string;
  visual?: ReactNode;
  visualLabel?: string;
  children: ReactNode;
}

/** Standard inner layout for marketing text pages (legal, company, docs). */
export function MarketingContentPage({
  title,
  description,
  eyebrow,
  visual,
  visualLabel,
  children,
}: MarketingContentPageProps) {
  return (
    <>
      {visual ? (
        <MarketingPageHero
          title={title}
          description={description}
          eyebrow={eyebrow}
          visual={visual}
          visualLabel={visualLabel}
        />
      ) : null}

      <div className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          {!visual && (
            <>
              <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
                {title}
              </h1>
              {description && (
                <p className="mt-4 text-lg leading-normal text-text-secondary">{description}</p>
              )}
            </>
          )}

          <div
            className={
              visual
                ? 'space-y-6 text-base leading-normal text-text-secondary'
                : 'mt-10 space-y-6 text-base leading-normal text-text-secondary'
            }
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
