'use client';

import { useId, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { LocaleLink } from '@/components/common/LocaleLink';
import { ButtonLink } from '@/components/marketing/ButtonLink';
import { useDictionary } from '@/lib/i18n/locale-context';
import { cn } from '@/lib/utils';

type QuestionId = 'sebi' | 'government' | 'public';
type LawId = 'rpwd' | 'sebi' | 'gigw' | 'is17802';
type Answers = Partial<Record<QuestionId, boolean>>;

const QUESTION_IDS: QuestionId[] = ['sebi', 'government', 'public'];

/** Maps yes/no answers to the Indian accessibility rules that apply. */
export function applicableLaws(answers: Answers): LawId[] {
  const laws = new Set<LawId>();
  if (answers.public || answers.sebi || answers.government) laws.add('rpwd');
  if (answers.sebi) laws.add('sebi');
  if (answers.government) {
    laws.add('gigw');
    laws.add('is17802');
  }
  if (answers.public) laws.add('is17802');
  return (['rpwd', 'sebi', 'gigw', 'is17802'] as const).filter((id) => laws.has(id));
}

export function ComplianceQuiz() {
  const { home } = useDictionary();
  const copy = home.quiz;
  const baseId = useId();
  const [answers, setAnswers] = useState<Answers>({});

  const allAnswered = QUESTION_IDS.every((id) => answers[id] !== undefined);
  const lawIds = applicableLaws(answers);
  const laws = copy.laws.filter((law) => lawIds.includes(law.id));

  return (
    <section
      aria-labelledby="quiz-heading"
      className="border-b border-gray-200 bg-bg-secondary px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
    >
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <h2
            id="quiz-heading"
            className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl"
          >
            {copy.title}
          </h2>
          <p className="mt-4 text-lg leading-normal text-text-secondary">{copy.subtitle}</p>
        </div>

        <ol className="mt-10 space-y-4">
          {copy.questions.map((q, index) => (
            <li key={q.id}>
              <fieldset className="rounded-lg border border-border bg-white p-5 sm:p-6">
                {/* float + w-full keeps the legend inside the box instead of on its top border */}
                <legend className="float-left w-full p-0 text-base font-semibold leading-normal text-text-primary sm:text-lg">
                  {index + 1}. {q.question}
                </legend>
                <div className="clear-both flex gap-3 pt-4">
                  {([true, false] as const).map((value) => {
                    const inputId = `${baseId}-${q.id}-${value ? 'yes' : 'no'}`;
                    const checked = answers[q.id] === value;
                    return (
                      <div key={inputId}>
                        <input
                          id={inputId}
                          type="radio"
                          name={`${baseId}-${q.id}`}
                          checked={checked}
                          onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: value }))}
                          className="peer sr-only"
                        />
                        <label
                          htmlFor={inputId}
                          className={cn(
                            'inline-flex min-h-[44px] min-w-[88px] cursor-pointer items-center justify-center gap-2 rounded-md border-2 px-5 text-base font-medium',
                            'peer-focus-visible:ring-2 peer-focus-visible:ring-primary-600 peer-focus-visible:ring-offset-2',
                            checked
                              ? 'border-primary-600 bg-primary-600 text-white'
                              : 'border-border bg-white text-text-primary hover:border-primary-600',
                          )}
                        >
                          {checked && <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                          {value ? copy.yes : copy.no}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            </li>
          ))}
        </ol>

        <div
          aria-live="polite"
          className="mt-8 rounded-xl border-2 border-primary-200 bg-white p-6 sm:p-8"
        >
          <h3 className="text-xl font-semibold text-text-primary">{copy.resultTitle}</h3>
          {!allAnswered || laws.length === 0 ? (
            <p className="mt-3 text-base leading-normal text-text-secondary">
              {allAnswered ? copy.resultNone : copy.resultPending}
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {laws.map((law) => (
                <li key={law.id} className="flex items-start gap-3">
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-success-700"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-base font-semibold text-text-primary">{law.name}</p>
                    <p className="mt-1 text-base leading-normal text-text-secondary">
                      {law.reason}{' '}
                      <LocaleLink
                        href={law.href}
                        className="font-medium text-primary-600 underline underline-offset-2 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
                      >
                        {copy.learnMore}
                        <span className="sr-only">: {law.name}</span>
                      </LocaleLink>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {allAnswered && (
            <ButtonLink href="/scan" size="lg" variant="primary" className="mt-6">
              {copy.cta}
            </ButtonLink>
          )}
        </div>
      </div>
    </section>
  );
}
