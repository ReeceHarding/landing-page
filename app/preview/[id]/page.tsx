"use client";

import { LineText } from "@/components/LineText";
import CTAButton from "@/components/home/CTAButton";
import { GeneratedPageContent, getPageContent } from "@/lib/generatorStore";
import { defaultLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { HTMLMotionProps } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useEffect, useState } from "react";

// Dynamically import framer-motion components with SSR disabled
const MotionDiv = dynamic<HTMLMotionProps<"div">>(
  () => import('framer-motion').then((mod) => mod.motion.div),
  { ssr: false }
);

function logPreview(operation: string, details: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🎨 Preview: ${operation}`);
  console.log('├─ Details:', details);
  console.log('├─ Component Lifecycle:', {
    isClient: typeof window !== 'undefined',
    hasDocument: typeof document !== 'undefined',
    timestamp: Date.now()
  });
  if (typeof window !== 'undefined') {
    console.log('├─ URL:', window.location.href);
    console.log('└─ Store Status:', {
      hasLocalStorage: Boolean(window.localStorage),
      hasStoreKey: Boolean(window.localStorage?.getItem('landing_page_content'))
    });
  }
}

interface Feature {
  title: string;
  content: string;
  icon: string;
}

interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
}

interface Testimonial {
  name: string;
  role: string;
  content: string;
  avatar: string | null;
}

interface FAQ {
  question: string;
  answer: string;
}

type PageContent = {
  id: string;
  idea: string;
  heroTitle: string[];
  heroDescription: string;
  featuresTitle: string;
  features: Feature[];
  pricingTitle: string;
  pricingDescription: string;
  pricingTiers: PricingTier[];
  testimonialsTitle: string;
  testimonials: Testimonial[];
  faqTitle: string;
  faqs: FAQ[];
  ctaTitle: string;
  ctaDescription: string;
};

export default function PreviewPage({ params }: { params: { id: string } }) {
  const [content, setContent] = useState<GeneratedPageContent | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    logPreview('mount', { id: params.id, attempt: loadAttempts + 1 });

    const loadContent = () => {
      logPreview('loadContent', {
        attempt: loadAttempts + 1,
        timestamp: Date.now()
      });

      try {
        const pageContent = getPageContent(params.id);

        if (pageContent) {
          logPreview('contentFound', {
            id: pageContent.id,
            idea: pageContent.idea.slice(0, 50) + '...',
            sections: {
              hero: Boolean(pageContent.heroTitle),
              features: pageContent.features.length,
              pricing: pageContent.pricingTiers.length,
              testimonials: pageContent.testimonials.length,
              faqs: pageContent.faqs.length
            },
            timestamp: Date.now()
          });
          setContent(pageContent);
          setIsLoading(false);
          setError(null);
        } else {
          logPreview('contentMissing', {
            attemptsMade: loadAttempts + 1,
            willRetry: loadAttempts < 2,
            timestamp: Date.now()
          });

          if (loadAttempts < 2) {
            // Exponential backoff: 1s, then 2s delay
            const delay = (loadAttempts + 1) * 1000;
            setTimeout(() => {
              setLoadAttempts(prev => prev + 1);
            }, delay);
          } else {
            setIsLoading(false);
            setError('Content not found after multiple attempts. Please check the URL or try generating the content again.');
          }
        }
      } catch (err) {
        logPreview('error', {
          error: err instanceof Error ? err.message : 'Unknown error',
          timestamp: Date.now()
        });
        setIsLoading(false);
        setError('Failed to load content. Please try refreshing the page.');
      }
    };

    loadContent();
  }, [params.id, loadAttempts]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading Preview</h1>
          <p className="text-gray-600">Attempt {loadAttempts + 1} of 3</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Content Not Found</h1>
          <p className="text-gray-600">The requested content could not be found.</p>
        </div>
      </div>
    );
  }

  logPreview('render', {
    id: content.id,
    sections: {
      hero: content.heroTitle.length,
      features: content.features.length,
      pricing: content.pricingTiers.length,
      testimonials: content.testimonials.length,
      faqs: content.faqs.length
    }
  });

  // Create locale object to match boilerplate structure
  const locale = {
    Hero: {
      title1: content.heroTitle[0],
      title2: content.heroTitle[1],
      title3: content.heroTitle[2],
      description: content.heroDescription,
    },
    Feature: {
      title: content.featuresTitle,
      description: "Discover what makes our solution unique",
    },
    Pricing: {
      title: content.pricingTitle,
      description: content.pricingDescription,
    },
    Testimonials: {
      title: content.testimonialsTitle,
      description: "Here's what our customers are saying",
    },
    FAQ: {
      title: content.faqTitle,
      description: "Find answers to common questions",
    },
    CTA: {
      title: content.ctaTitle,
      description: content.ctaDescription,
    },
    CTAButton: {
      text: "Get Started",
      subtext: "Free trial available",
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <section
          lang={defaultLocale}
          className="relative mx-auto max-w-[1400px] px-6 lg:px-8 pb-16 pt-12 md:pt-16 lg:pt-20 text-center"
        >
          <div className="max-w-[840px] mx-auto">
            <h1 className={cn(
              "text-[2.75rem] font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl",
              "text-slate-900 dark:text-white",
              "leading-[1.1]"
            )}>
              {locale.Hero.title1}{" "}
              <span className="relative inline-block">
                <LineText>{locale.Hero.title2}</LineText>
                <span className="absolute -inset-1 -skew-y-2 bg-primary/[0.07] rounded-sm" />
              </span>{" "}
              {locale.Hero.title3}
            </h1>
          </div>

          <p className={cn(
            "mx-auto mt-6 max-w-2xl",
            "text-lg md:text-xl",
            "text-slate-600 dark:text-slate-300",
            "leading-relaxed",
            "tracking-[-0.01em]"
          )}>
            {locale.Hero.description}
          </p>

          <div className="mt-8">
            <CTAButton locale={locale.CTAButton} />
          </div>
        </section>
      </div>

      {/* Features Section */}
      <section id="Features" className="relative py-24 sm:py-32 border-y border-slate-200 dark:border-slate-800">
        <div className="relative mx-auto max-w-[1400px] px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-20">
            <h2 className={cn(
              "text-3xl font-bold tracking-tight sm:text-4xl mb-4",
              "text-slate-900 dark:text-white",
              "leading-[1.2]"
            )}>
              {locale.Feature.title}
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 tracking-[-0.01em]">
              {locale.Feature.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 lg:gap-x-12">
            {content.features.map((feature: Feature) => (
              <div
                key={feature.title}
                className={cn(
                  "relative group",
                  "rounded-2xl p-8",
                  "bg-white dark:bg-slate-800",
                  "border border-slate-200 dark:border-slate-700",
                  "transition-all duration-200",
                  "hover:border-slate-300 dark:hover:border-slate-600",
                  "hover:shadow-lg"
                )}
              >
                <div>
                  <div className={cn(
                    "p-3.5 w-14 h-14 rounded-xl mb-6",
                    "bg-slate-50 dark:bg-slate-700",
                    "border border-slate-200 dark:border-slate-600",
                    "flex items-center justify-center",
                    "transition duration-200",
                    "group-hover:border-slate-300 dark:group-hover:border-slate-500"
                  )}>
                    <span className="text-xl text-primary">{feature.icon}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-3 text-slate-900 dark:text-white tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed tracking-[-0.01em]">
                    {feature.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="Pricing" className="relative py-24 sm:py-32">
        <div className="relative mx-auto max-w-[1400px] px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-20">
            <h2 className={cn(
              "text-3xl font-bold tracking-tight sm:text-4xl mb-4",
              "text-slate-900 dark:text-white",
              "leading-[1.2]"
            )}>
              {locale.Pricing.title}
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 tracking-[-0.01em]">
              {locale.Pricing.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {content.pricingTiers.map((tier: PricingTier) => (
              <div
                key={tier.name}
                className={cn(
                  "relative group",
                  "rounded-2xl p-8",
                  "bg-white dark:bg-slate-800",
                  "border border-slate-200 dark:border-slate-700",
                  "transition-all duration-200",
                  "hover:border-slate-300 dark:hover:border-slate-600",
                  "hover:shadow-lg"
                )}
              >
                <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">
                  {tier.name}
                </h3>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                  {tier.price}
                </p>
                <p className="text-slate-600 dark:text-slate-300 mb-6">
                  {tier.description}
                </p>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature: string, index: number) => (
                    <li key={index} className="flex items-center text-slate-600 dark:text-slate-300">
                      <span className="mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <CTAButton locale={locale.CTAButton} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="Testimonials" className="relative py-24 sm:py-32 border-y border-slate-200 dark:border-slate-800">
        <div className="relative mx-auto max-w-[1400px] px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-20">
            <h2 className={cn(
              "text-3xl font-bold tracking-tight sm:text-4xl mb-4",
              "text-slate-900 dark:text-white",
              "leading-[1.2]"
            )}>
              {locale.Testimonials.title}
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 tracking-[-0.01em]">
              {locale.Testimonials.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {content.testimonials.map((testimonial: Testimonial) => (
              <div
                key={testimonial.name}
                className={cn(
                  "relative group",
                  "rounded-2xl p-8",
                  "bg-white dark:bg-slate-800",
                  "border border-slate-200 dark:border-slate-700",
                  "transition-all duration-200",
                  "hover:border-slate-300 dark:hover:border-slate-600",
                  "hover:shadow-lg"
                )}
              >
                <p className="text-slate-600 dark:text-slate-300 mb-6 italic">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center">
                  <div className="ml-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="FAQ" className="relative py-24 sm:py-32">
        <div className="relative mx-auto max-w-[1400px] px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-20">
            <h2 className={cn(
              "text-3xl font-bold tracking-tight sm:text-4xl mb-4",
              "text-slate-900 dark:text-white",
              "leading-[1.2]"
            )}>
              {locale.FAQ.title}
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 tracking-[-0.01em]">
              {locale.FAQ.description}
            </p>
          </div>

          <div className="mx-auto max-w-3xl">
            <div className="space-y-8">
              {content.faqs.map((faq: FAQ) => (
                <div
                  key={faq.question}
                  className={cn(
                    "relative group",
                    "rounded-2xl p-8",
                    "bg-white dark:bg-slate-800",
                    "border border-slate-200 dark:border-slate-700",
                    "transition-all duration-200",
                    "hover:border-slate-300 dark:hover:border-slate-600",
                    "hover:shadow-lg"
                  )}
                >
                  <h3 className="text-lg font-semibold mb-3 text-slate-900 dark:text-white">
                    {faq.question}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed tracking-[-0.01em]">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="CTA" className="relative py-24 sm:py-32 border-t border-slate-200 dark:border-slate-800">
        <div className="relative mx-auto max-w-[1400px] px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className={cn(
              "text-3xl font-bold tracking-tight sm:text-4xl mb-4",
              "text-slate-900 dark:text-white",
              "leading-[1.2]"
            )}>
              {locale.CTA.title}
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 tracking-[-0.01em]">
              {locale.CTA.description}
            </p>
            <div className="mt-8">
              <CTAButton locale={locale.CTAButton} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 