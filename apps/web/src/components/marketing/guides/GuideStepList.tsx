import type { ReactNode } from 'react';

export interface GuideStep {
  title: string;
  description: ReactNode;
}

export interface GuideStepListProps {
  steps: GuideStep[];
}

export function GuideStepList({ steps }: GuideStepListProps) {
  return (
    <ol className="space-y-6">
      {steps.map((step, index) => (
        <li key={step.title} className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white">
            {index + 1}
          </span>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">{step.title}</h3>
            <p className="mt-2 text-base leading-normal text-text-secondary">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
