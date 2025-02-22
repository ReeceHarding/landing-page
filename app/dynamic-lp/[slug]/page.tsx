"use client";

import { LineText } from "@/components/LineText";
import CTAButton from "@/components/home/CTAButton";
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

/**
 * The same structure as the preview's page, but for dynamic-lp.
 * We'll replicate sections with dynamic data from dynamicLandingStore.
 */

// Enhanced logging utility
function logDynamicPage(operation: string, details: any) {
  const timestamp = new Date().toISOString();
  const logPrefix = `[${timestamp}] 🎨 DynamicPage`;

  // Add request ID for tracing
  const requestId = Math.random().toString(36).substring(7);

  console.log(`${logPrefix}: ${operation}`);
  console.log('├─ Request ID:', requestId);
  console.log('├─ Details:', {
    ...details,
    timestamp: Date.now(),
    requestId
  });
  console.log('├─ Component State:', {
    isClient: typeof window !== 'undefined',
    hasDocument: typeof document !== 'undefined',
    url: typeof window !== 'undefined' ? window.location.href : 'server-side',
    timestamp: Date.now()
  });

  // Add Redis connection status check
  if (typeof window !== 'undefined') {
    console.log('├─ Storage Status:', {
      hasLocalStorage: Boolean(window.localStorage),
      hasStoreKey: Boolean(window.localStorage?.getItem('landing_page_content')),
      redisKeyPrefix: 'dynamic_landing_page:',
      expectedKey: `dynamic_landing_page:${details.id || 'unknown'}`
    });
  }

  // Add stack trace for debugging
  console.log('└─ Stack:', new Error().stack?.split('\n').slice(2).join('\n'));
}

// Add Feature interface
interface Feature {
  title: string;
  content: string;
  icon: string;
}

// Add PricingTier interface
interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
}

// Add Testimonial interface
interface Testimonial {
  name: string;
  role: string;
  content: string;
  avatar: string | null;
}

// Add FAQ interface
interface FAQ {
  question: string;
  answer: string;
}

type PageContent = {
  id: string;
  logoUrl: string | null;
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

export default function DynamicLandingPage({ params }: { params: { slug: string } }) {
  const [content, setContent] = useState<PageContent | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    logDynamicPage('mount', {
      id: params.slug,
      attempt: loadAttempts + 1,
      previousContent: Boolean(content),
      previousError: error
    });

    const loadContent = async () => {
      logDynamicPage('loadContent:start', {
        attempt: loadAttempts + 1,
        slug: params.slug,
        timestamp: Date.now()
      });

      try {
        logDynamicPage('loadContent:fetching', {
          slug: params.slug,
          attempt: loadAttempts + 1,
          timestamp: Date.now()
        });

        const response = await fetch(`/api/dynamic-lp/${params.slug}`);
        const data = await response.json();

        logDynamicPage('loadContent:response', {
          status: response.status,
          ok: response.ok,
          hasContent: Boolean(data),
          contentType: typeof data,
          contentKeys: data ? Object.keys(data) : null,
          slug: params.slug,
          attempt: loadAttempts + 1
        });

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch content');
        }

        if (data) {
          logDynamicPage('loadContent:success', {
            id: data.id,
            sections: {
              hero: Boolean(data.heroTitle),
              heroTitleLength: data.heroTitle?.length,
              features: data.features?.length,
              pricing: data.pricingTiers?.length,
              testimonials: data.testimonials?.length,
              faqs: data.faqs?.length
            },
            timestamp: Date.now()
          });

          setContent(data);
          setIsLoading(false);
          setError(null);
        } else {
          logDynamicPage('loadContent:missing', {
            attemptsMade: loadAttempts + 1,
            willRetry: loadAttempts < 2,
            timestamp: Date.now(),
            slug: params.slug
          });

          if (loadAttempts < 2) {
            const delay = (loadAttempts + 1) * 1000;
            logDynamicPage('loadContent:retry-scheduled', {
              attempt: loadAttempts + 1,
              nextAttemptDelay: delay,
              timestamp: Date.now()
            });

            setTimeout(() => {
              setLoadAttempts(prev => prev + 1);
            }, delay);
          } else {
            logDynamicPage('loadContent:max-attempts-reached', {
              totalAttempts: loadAttempts + 1,
              slug: params.slug,
              timestamp: Date.now()
            });

            setIsLoading(false);
            setError('Content not found after multiple attempts. Please check the URL or try generating the content again.');
          }
        }
      } catch (err) {
        logDynamicPage('loadContent:error', {
          error: err instanceof Error ? {
            message: err.message,
            stack: err.stack,
            name: err.name
          } : 'Unknown error',
          attempt: loadAttempts + 1,
          slug: params.slug,
          timestamp: Date.now()
        });

        setIsLoading(false);
        setError('Failed to load content. Please try refreshing the page.');
      }
    };

    loadContent();
  }, [params.slug, loadAttempts, content, error]);

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

  logDynamicPage('render', {
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