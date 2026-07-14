import * as Accordion from '@radix-ui/react-accordion';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  items: FAQItem[];
}

export function FAQSection({ items }: FAQSectionProps) {
  return (
    <section className="mt-24">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
          Frequently asked questions
        </h2>
        <p className="mt-4 text-lg leading-normal text-text-secondary">
          Everything you need to know about AccessShield India pricing and compliance
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-3xl">
        <Accordion.Root type="single" collapsible className="space-y-4">
          {items.map((item, index) => (
            <Accordion.Item
              key={index}
              value={`item-${index}`}
              className="rounded-lg border border-gray-200 bg-white shadow-sm"
            >
              <Accordion.Header>
                <Accordion.Trigger className="flex w-full items-start justify-between gap-4 px-6 py-4 text-left text-base font-semibold text-text-primary hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 data-[state=open]:rounded-t-lg">
                  <span className="flex-1">{item.question}</span>
                  <svg
                    className="mt-1 h-5 w-5 shrink-0 text-text-secondary transition-transform duration-200 group-data-[state=open]:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <div className="px-6 pb-4 pt-2 text-base leading-normal text-text-secondary">
                  {item.answer}
                </div>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
}
