"use client";

import { LineText } from "@/components/LineText";
import CTAButton from "@/components/home/CTAButton";
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
  }, [params.slug, loadAttempts]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading Preview</h1>
          <p className="text-gray-600">Attempt {loadAttempts + 1} of 3</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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
    <div className="min-h-screen bg-background font-sans antialiased">
      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-16 md:pt-40 md:pb-20 lg:pt-48 lg:pb-24">
          <div className="relative mx-auto max-w-[1400px] px-6 lg:px-8 text-center">
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
          </div>
        </section>

        {/* User Avatars Section */}
        <section className="flex flex-col items-center justify-center gap-20 pt-16">
          <div className="flex flex-col items-center gap-5">
            <div className="flex items-center justify-center">
              <img
                alt="User"
                loading="lazy"
                width="40"
                height="40"
                decoding="async"
                className="rounded-full -m-[5px] border border-white"
                src="/images/users/1.png"
                srcSet="/images/users/1.png 1x, /images/users/1.png 2x"
              />
              <img
                alt="User"
                loading="lazy"
                width="40"
                height="40"
                decoding="async"
                className="rounded-full -m-[5px] border border-white"
                src="/images/users/2.png"
                srcSet="/images/users/2.png 1x, /images/users/2.png 2x"
              />
              <img
                alt="User"
                loading="lazy"
                width="40"
                height="40"
                decoding="async"
                className="rounded-full -m-[5px] border border-white"
                src="/images/users/3.png"
                srcSet="/images/users/3.png 1x, /images/users/3.png 2x"
              />
              <img
                alt="User"
                loading="lazy"
                width="40"
                height="40"
                decoding="async"
                className="rounded-full -m-[5px] border border-white"
                src="/images/users/4.png"
                srcSet="/images/users/4.png 1x, /images/users/4.png 2x"
              />
              <img
                alt="User"
                loading="lazy"
                width="40"
                height="40"
                decoding="async"
                className="rounded-full -m-[5px] border border-white"
                src="/images/users/5.png"
                srcSet="/images/users/5.png 1x, /images/users/5.png 2x"
              />
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-400">
              <span className="text-primary font-semibold text-base">1000+</span> early adopters waiting
            </p>
          </div>
        </section>

        {/* Logo Scroll Section */}
        <section className="mx-auto w-full md:max-w-5xl lg:max-w-7xl px-0 md:px-6 lg:px-8 pt-16">
          <div className="rfm-marquee-container">
            <div className="rfm-marquee">
              {/* First set of logos */}
              <div className="flex">
                {[
                  { name: "Next.js", src: "/images/techStack/nextjs.svg" },
                  { name: "React", src: "/images/techStack/react.svg" },
                  { name: "Tailwind", src: "/images/techStack/tailwind.svg" },
                  { name: "Framer", src: "/images/techStack/framer.svg" },
                  { name: "Shadcnui", src: "/images/techStack/shadcnui.svg" },
                  { name: "Nextui", src: "/images/techStack/nextui.svg" },
                  { name: "TS", src: "/images/techStack/typescript.svg" },
                  { name: "Vercel", src: "/images/techStack/vercel.svg" }
                ].map((tech) => (
                  <div key={tech.name} className="mx-6 text-gray-500">
                    <img
                      alt={tech.name}
                      loading="lazy"
                      width="50"
                      height="50"
                      decoding="async"
                      className="filter dark:invert grayscale hover:filter-none transition-all duration-300 cursor-pointer text-gray-500"
                      src={tech.src}
                      style={{ color: "transparent", objectFit: "cover" }}
                    />
                  </div>
                ))}
              </div>
              {/* Second set of logos (duplicate for seamless loop) */}
              <div className="flex">
                {[
                  { name: "Next.js", src: "/images/techStack/nextjs.svg" },
                  { name: "React", src: "/images/techStack/react.svg" },
                  { name: "Tailwind", src: "/images/techStack/tailwind.svg" },
                  { name: "Framer", src: "/images/techStack/framer.svg" },
                  { name: "Shadcnui", src: "/images/techStack/shadcnui.svg" },
                  { name: "Nextui", src: "/images/techStack/nextui.svg" },
                  { name: "TS", src: "/images/techStack/typescript.svg" },
                  { name: "Vercel", src: "/images/techStack/vercel.svg" }
                ].map((tech) => (
                  <div key={tech.name} className="mx-6 text-gray-500">
                    <img
                      alt={tech.name}
                      loading="lazy"
                      width="50"
                      height="50"
                      decoding="async"
                      className="filter dark:invert grayscale hover:filter-none transition-all duration-300 cursor-pointer text-gray-500"
                      src={tech.src}
                      style={{ color: "transparent", objectFit: "cover" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

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
        <section id="Pricing" className="flex flex-col justify-center max-w-4xl items-center pt-16">
          <div className="flex flex-col text-center max-w-xl">
            <h2 className="text-center text-white">
              <svg className="rough-annotation" style={{
                position: 'absolute',
                top: 0,
                left: 0,
                overflow: 'visible',
                pointerEvents: 'none',
                width: '100px',
                height: '100px'
              }}>
                <path d="M500.95131853508 2020.3686951984264 C625.9523830741723 2015.6112596598286, 756.1148415803212 2018.7573311831432, 878.3081867911186 2023.0770307358357" fill="none" stroke="#2563EB" strokeWidth="54.8625"></path>
                <path d="M879.434543460471 2023.8132577096528 C728.5277241385792 2019.51829447739, 579.4511679077297 2023.7953286619093, 500.19890802542903 2024.0839656606338" fill="none" stroke="#2563EB" strokeWidth="54.8625"></path>
              </svg>
              <span style={{ position: 'relative' }}>Early Bird Pricing</span>
            </h2>
            <h3 className="text-4xl font-medium tracking-tight mt-2">Get exclusive early access pricing.</h3>
            <span aria-hidden="true" className="w-px h-px block" style={{ marginLeft: '0.25rem', marginTop: '1rem' }}></span>
            <p className="text-large text-default-500">Join the waitlist now to lock in special early adopter rates.</p>
          </div>
          <span aria-hidden="true" className="w-px h-px block" style={{ marginLeft: '0.25rem', marginTop: '2rem' }}></span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 justify-items-center">
            {/* Free Tier */}
            <div className="flex flex-col relative overflow-hidden h-auto text-foreground box-border bg-content1 outline-none data-[focus-visible=true]:z-10 data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-focus data-[focus-visible=true]:outline-offset-2 shadow-medium rounded-large transition-transform-background motion-reduce:transition-none p-3 flex-1 w-[90%]" tabIndex={-1}>
              <div className="p-3 z-10 w-full justify-start shrink-0 overflow-inherit color-inherit subpixel-antialiased rounded-t-large flex flex-col items-start gap-2 pb-6">
                <h2 className="text-large font-medium">Open-Source / Free</h2>
                <p className="text-medium text-default-500">Freely clone the landing page boilerplate from the GitHub repository.</p>
              </div>
              <hr className="shrink-0 bg-divider border-none w-full h-divider" role="separator" />
              <div className="relative flex w-full p-3 flex-auto flex-col place-content-inherit align-items-inherit h-auto break-words text-left overflow-y-auto subpixel-antialiased gap-8">
                <p className="flex items-baseline gap-1 pt-2">
                  <span className="inline bg-gradient-to-br from-foreground to-foreground-600 bg-clip-text text-2xl font-semibold leading-7 tracking-tight text-transparent">Free</span>
                </p>
                <ul className="flex flex-col gap-2">
                  {['Free', 'Access to full code', 'Secondary development', 'MIT License'].map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="text-blue-500" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                        <path d="M173.898 439.404l-166.4-166.4c-9.997-9.997-9.997-26.206 0-36.204l36.203-36.204c9.997-9.998 26.207-9.998 36.204 0L192 312.69 432.095 72.596c9.997-9.997 26.207-9.997 36.204 0l36.203 36.204c9.997 9.997 9.997 26.206 0 36.204l-294.4 294.401c-9.998 9.997-26.207 9.997-36.204-.001z"></path>
                      </svg>
                      <p className="text-default-500">{feature}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-3 h-auto flex w-full items-center overflow-hidden color-inherit subpixel-antialiased rounded-b-large">
                <a className="tap-highlight-transparent no-underline hover:opacity-80 active:opacity-disabled transition-opacity z-0 group relative inline-flex items-center justify-center box-border appearance-none select-none whitespace-nowrap font-normal subpixel-antialiased overflow-hidden tap-highlight-transparent data-[pressed=true]:scale-[0.97] outline-none data-[focus-visible=true]:z-10 data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-focus data-[focus-visible=true]:outline-offset-2 px-4 min-w-20 h-10 text-small gap-2 rounded-medium w-full [&>svg]:max-w-[theme(spacing.8)] transition-transform-colors-opacity motion-reduce:transition-none bg-primary text-primary-foreground data-[hover=true]:opacity-hover"
                  href="https://github.com/weijunext/landing-page-boilerplate"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  tabIndex={0}
                  role="button">
                  Get started
                </a>
              </div>
            </div>

            {/* Custom Tier */}
            <div className="flex flex-col relative overflow-hidden h-auto text-foreground box-border bg-content1 outline-none data-[focus-visible=true]:z-10 data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-focus data-[focus-visible=true]:outline-offset-2 shadow-medium rounded-large transition-transform-background motion-reduce:transition-none p-3 flex-1 w-[90%]" tabIndex={-1}>
              <div className="p-3 z-10 w-full justify-start shrink-0 overflow-inherit color-inherit subpixel-antialiased rounded-t-large flex flex-col items-start gap-2 pb-6">
                <h2 className="text-large font-medium">Customize</h2>
                <p className="text-medium text-default-500">Pay to customize an exclusive landing page.</p>
              </div>
              <hr className="shrink-0 bg-divider border-none w-full h-divider" role="separator" />
              <div className="relative flex w-full p-3 flex-auto flex-col place-content-inherit align-items-inherit h-auto break-words text-left overflow-y-auto subpixel-antialiased gap-8">
                <p className="flex items-baseline gap-1 pt-2">
                  <span className="inline bg-gradient-to-br from-foreground to-foreground-600 bg-clip-text text-2xl font-semibold leading-7 tracking-tight text-transparent">$188</span>
                </p>
                <ul className="flex flex-col gap-2">
                  {[
                    'Access to full code',
                    'Secondary development',
                    'Exclusive style',
                    'One-on-one service',
                    'More exquisite pages'
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="text-blue-500" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                        <path d="M173.898 439.404l-166.4-166.4c-9.997-9.997-9.997-26.206 0-36.204l36.203-36.204c9.997-9.998 26.207-9.998 36.204 0L192 312.69 432.095 72.596c9.997-9.997 26.207-9.997 36.204 0l36.203 36.204c9.997 9.997 9.997 26.206 0 36.204l-294.4 294.401c-9.998 9.997-26.207 9.997-36.204-.001z"></path>
                      </svg>
                      <p className="text-default-500">{feature}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-3 h-auto flex w-full items-center overflow-hidden color-inherit subpixel-antialiased rounded-b-large">
                <a className="tap-highlight-transparent no-underline hover:opacity-80 active:opacity-disabled transition-opacity z-0 group relative inline-flex items-center justify-center box-border appearance-none select-none whitespace-nowrap font-normal subpixel-antialiased overflow-hidden tap-highlight-transparent data-[pressed=true]:scale-[0.97] outline-none data-[focus-visible=true]:z-10 data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-focus data-[focus-visible=true]:outline-offset-2 px-4 min-w-20 h-10 text-small gap-2 rounded-medium w-full [&>svg]:max-w-[theme(spacing.8)] transition-transform-colors-opacity motion-reduce:transition-none bg-default/40 text-default-700 data-[hover=true]:opacity-hover"
                  href="https://twitter.com/weijunext"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  tabIndex={0}
                  role="button">
                  Contact us
                </a>
              </div>
            </div>
          </div>
          <span aria-hidden="true" className="w-px h-px block" style={{ marginLeft: '0.25rem', marginTop: '3rem' }}></span>
          <div className="flex py-2">
            <p className="text-default-400 text-center">
              Want to be part of our journey?&nbsp;
              <a className="relative inline-flex items-center tap-highlight-transparent outline-none data-[focus-visible=true]:z-10 data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-focus data-[focus-visible=true]:outline-offset-2 text-medium text-foreground underline hover:opacity-80 active:opacity-disabled transition-opacity underline-offset-4"
                href="https://twitter.com/weijunext"
                rel="noopener noreferrer nofollow"
                tabIndex={0}
                role="link">
                Follow our updates.
              </a>
            </p>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="Testimonials" className="flex flex-col justify-center items-center pt-16 gap-12 max-w-[88%]">
          <div className="flex flex-col text-center max-w-xl gap-4">
            <h2 className="text-center text-white">
              <svg className="rough-annotation" style={{
                position: 'absolute',
                top: 0,
                left: 0,
                overflow: 'visible',
                pointerEvents: 'none',
                width: '100px',
                height: '100px'
              }}>
                <path d="M520.243074349478 2998.6756901962817 C610.0210545868134 2999.5460122260783, 703.3657525791295 3001.8079086413477, 865.0499586551867 2993.040587748613" fill="none" stroke="#2563EB" strokeWidth="54.8625"></path>
                <path d="M863.2650994950312 2995.9631866058326 C790.1325591001519 2998.259380009746, 709.0723462793782 2993.002299163362, 517.1694116138111 2996.0358858888167" fill="none" stroke="#2563EB" strokeWidth="54.8625"></path>
              </svg>
              <span style={{ position: 'relative' }}>{locale.Testimonials.title}</span>
            </h2>
            <p className="text-large text-default-500">
              {locale.Testimonials.description}{' '}
              <a target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline" href="https://twitter.com/weijunext">
                Join them
              </a>
              {' '}and be part of our growing community.
            </p>
          </div>
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 overflow-hidden relative transition-all">
            {content.testimonials.map((testimonial, index) => (
              <div key={index} className="mb-4 z-0 break-inside-avoid-column">
                <div className="border border-slate/10 rounded-lg p-4 flex flex-col items-start gap-3 h-fit">
                  <div className="flex items-start justify-between w-full">
                    <div className="flex items-start gap-2">
                      <img
                        alt={testimonial.name}
                        loading="lazy"
                        width="40"
                        height="40"
                        decoding="async"
                        data-nimg="1"
                        className="w-12 h-12 rounded-full object-cover object-top"
                        style={{ color: 'transparent' }}
                        src={testimonial.avatar || `/images/users/${(index % 5) + 1}.png`}
                        srcSet={`${testimonial.avatar || `/images/users/${(index % 5) + 1}.png`}?w=48&q=75 1x, ${testimonial.avatar || `/images/users/${(index % 5) + 1}.png`}?w=96&q=75 2x`}
                      />
                      <div className="flex flex-col items-start">
                        <p className="font-bold">{testimonial.name}</p>
                        <p className="dark:text-zinc-400">{testimonial.role}</p>
                      </div>
                    </div>
                    <a target="_blank" rel="noopener noreferrer nofollow" href="https://twitter.com/weijunext">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-8 h-8">
                        <path fill="currentColor" d="M8 2H1l8.26 11.015L1.45 22H4.1l6.388-7.349L16 22h7l-8.608-11.478L21.8 2h-2.65l-5.986 6.886z" />
                      </svg>
                    </a>
                  </div>
                  <p className="dark:text-zinc-200 text-[14px]">{testimonial.content}</p>
                </div>
              </div>
            ))}
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
      </main>
    </div>
  );
} 