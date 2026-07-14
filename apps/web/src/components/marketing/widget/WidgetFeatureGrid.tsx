import { BookOpen, Contrast, Eye, Keyboard, Languages, Palette, Type, Volume2 } from 'lucide-react';

const FEATURES = [
  {
    icon: Type,
    title: 'Text & font controls',
    description:
      'Adjustable font size plus dyslexia-friendly typography so every visitor can read comfortably — including Devanagari content on Indian sites.',
  },
  {
    icon: Contrast,
    title: 'Contrast & display modes',
    description:
      'Dark mode, light mode, high contrast, and negative contrast for users with visual impairments or light sensitivity.',
  },
  {
    icon: BookOpen,
    title: 'Dyslexia-friendly mode',
    description:
      'Switches site typography to an OpenDyslexic-style font to improve readability for visitors with dyslexia.',
  },
  {
    icon: Eye,
    title: 'Reading aids',
    description:
      'Reading guide, reading mask, link highlighting, and enhanced focus indicators to support cognitive accessibility.',
  },
  {
    icon: Palette,
    title: 'Grayscale & saturation',
    description:
      'Grayscale and adjustable colour saturation for visitors with colour blindness or those who prefer reduced colour stimulation.',
  },
  {
    icon: Keyboard,
    title: 'Keyboard navigation',
    description:
      'Keyboard navigation mode, skip links, and focus tracking so motor-impaired visitors can move through your site without a mouse.',
  },
  {
    icon: Volume2,
    title: 'Text to speech',
    description:
      'Read selected text or the full page aloud — supporting visitors with visual impairments, dyslexia, or low literacy.',
  },
  {
    icon: Languages,
    title: 'English & Hindi UI',
    description:
      'Widget toolbar available in English and Hindi (हिन्दी), aligned with IS 17802 language requirements for Indian public services.',
  },
] as const;

export function WidgetFeatureGrid() {
  return (
    <section aria-labelledby="widget-features-heading" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2
            id="widget-features-heading"
            className="text-3xl font-bold text-text-primary sm:text-4xl"
          >
            One toolbar. Every need.
          </h2>
          <p className="mt-4 text-lg leading-normal text-text-secondary">
            Visitors open the widget from any page and tailor the experience to their own needs — no
            account, no downloads, no friction.
          </p>
        </div>

        <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <li
              key={title}
              className="rounded-xl border border-border bg-bg-secondary p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 text-primary-700"
                aria-hidden="true"
              >
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-text-primary">{title}</h3>
              <p className="mt-2 text-base leading-normal text-text-secondary">{description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
