"use client";

import { LineText } from "@/components/LineText";
import { LOGOS } from "@/config/logos";
import { cn } from "@/lib/utils";
import { Accordion, AccordionItem } from "@nextui-org/react";
import type { HTMLMotionProps } from 'framer-motion';
import { PlusIcon } from "lucide-react";
import { useTheme } from "next-themes";
import dynamic from 'next/dynamic';
import Image from "next/image";
import { useEffect, useState } from "react";
import Marquee from "react-fast-marquee";

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

// Add this function before the DynamicLandingPage component
function triggerResizeEvent() {
  const event = new Event("resize");
  window.dispatchEvent(event);
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export default function DynamicLandingPage({ params }: { params: { slug: string } }) {
  // Add useEffect for injecting styles
  useEffect(() => {
    // Create style element
    const style = document.createElement('style');
    style.textContent = `
      @keyframes rough-notation-dash {
        from {
          stroke-dashoffset: 383.081;
        }
        to {
          stroke-dashoffset: 0;
        }
      }
    `;
    // Append to document head
    document.head.appendChild(style);

    // Cleanup
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const [content, setContent] = useState<PageContent | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    name: '',
    email: ''
  });
  const theme = useTheme().theme;

  const isFormFilled = formState.name.trim() !== '' && formState.email.trim() !== '';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
  };

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
        // Add retry delay if this is a retry attempt
        if (loadAttempts > 0) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * loadAttempts));
        }

        logDynamicPage('loadContent:fetching', {
          slug: params.slug,
          attempt: loadAttempts + 1,
          timestamp: Date.now()
        });

        const response = await fetch(`/api/dynamic-lp/${params.slug}`, {
          // Add cache control headers
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

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

        if (!data) {
          throw new Error('No data received from API');
        }

        // Validate required fields
        const requiredFields = [
          'heroTitle',
          'heroDescription',
          'featuresTitle',
          'features',
          'pricingTitle',
          'pricingDescription',
          'pricingTiers',
          'testimonialsTitle',
          'testimonials',
          'faqTitle',
          'faqs',
          'ctaTitle',
          'ctaDescription'
        ];

        const missingFields = requiredFields.filter(field => {
          const value = data[field];
          if (Array.isArray(value)) {
            return value.length === 0;
          }
          return !value;
        });

        if (missingFields.length > 0) {
          throw new Error(`Missing or empty required fields: ${missingFields.join(', ')}`);
        }

        setContent(data);
        setIsLoading(false);
        setError(null);

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

        if (loadAttempts < MAX_RETRIES - 1) {
          setLoadAttempts(prev => prev + 1);
        } else {
          setIsLoading(false);
          setError(err instanceof Error ? err.message : 'Failed to load content. Please try refreshing the page.');
        }
      }
    };

    loadContent();
  }, [params.slug, loadAttempts]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-lg mx-auto px-4">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setIsLoading(true);
              setLoadAttempts(0);
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
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
          <div className="mt-4 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-lg mx-auto px-4">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Content Not Found</h1>
          <p className="text-gray-600 mb-6">The requested content could not be found.</p>
          <button
            onClick={() => {
              setError(null);
              setIsLoading(true);
              setLoadAttempts(0);
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
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
        <section className="relative pt-12 pb-12 w-full">
          <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 flex flex-col items-center">
            <div className="max-w-[840px] mx-auto text-center">
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
              "mx-auto mt-4 max-w-2xl text-center",
              "text-lg md:text-xl",
              "text-slate-600 dark:text-slate-300",
              "leading-relaxed",
              "tracking-[-0.01em]"
            )}>
              {locale.Hero.description}
            </p>

            <div className="mt-8 w-full max-w-lg">
              <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
                <div className="relative">
                  <input
                    type="text"
                    name="name"
                    placeholder="Full name"
                    value={formState.name}
                    onChange={handleInputChange}
                    className={cn(
                      "w-full px-4 py-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10",
                      "text-white placeholder:text-white/50",
                      "focus:outline-none focus:ring-2 focus:ring-primary/20",
                      "transition-all duration-200",
                      isFormFilled && "bg-primary/20"
                    )}
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 via-transparent to-transparent pointer-events-none"></div>
                </div>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    placeholder="hi@example.com"
                    value={formState.email}
                    onChange={handleInputChange}
                    className={cn(
                      "w-full px-4 py-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10",
                      "text-white placeholder:text-white/50",
                      "focus:outline-none focus:ring-2 focus:ring-primary/20",
                      "transition-all duration-200",
                      isFormFilled && "bg-primary/20"
                    )}
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 via-transparent to-transparent pointer-events-none"></div>
                </div>
                <button
                  className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap",
                    "ring-offset-background focus-visible:outline-none focus-visible:ring-2",
                    "focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:pointer-events-none hover:shadow-primary/25",
                    "hover:-translate-y-0.5 active:translate-y-0 h-11",
                    "w-full relative text-white/90 shadow-none font-medium",
                    "py-3.5 px-6 text-[15px] rounded-xl transition-all duration-300",
                    "disabled:opacity-70 disabled:cursor-not-allowed",
                    isFormFilled ? "bg-primary hover:bg-primary/90" : "bg-primary/40 hover:bg-primary/50"
                  )}
                  type="submit"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] transition-transform duration-300">
                      <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                    </svg>
                    <span>Join Waitlist</span>
                  </span>
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* User Avatars Section */}
        <section className="w-full flex flex-col items-center justify-center gap-16 pt-12">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-5">
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
            <p className="text-sm text-slate-700 dark:text-slate-400 text-center">
              <span className="text-primary font-semibold text-base">1000+</span> early adopters waiting
            </p>
          </div>
        </section>

        {/* Logo Scroll Section */}
        <section className="w-full py-16">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <Marquee direction="left" autoFill pauseOnHover>
              {LOGOS.map((image, index) => (
                <div className="mx-6 text-gray-500" key={index}>
                  <Image
                    src={image.image}
                    alt={image.name}
                    width={50}
                    height={50}
                    style={{
                      objectFit: "cover",
                    }}
                    className={`${theme === "dark" ? "filter dark:invert grayscale" : ""
                      } hover:filter-none transition-all duration-300 cursor-pointer text-gray-500`}
                  />
                </div>
              ))}
            </Marquee>
          </div>
        </section>

        {/* Features Section */}
        <section id="Features" className="w-full py-24">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-20">
              <h2 className="text-center relative inline-block">
                <span className="relative z-10">{locale.Feature.title}</span>
                <svg
                  className="rough-annotation absolute -bottom-2 left-0 overflow-visible pointer-events-none w-full"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 100"
                  style={{
                    position: 'absolute',
                    overflow: 'visible',
                    pointerEvents: 'none',
                    width: '100%',
                    height: '12px'
                  }}
                >
                  <path
                    d="M10,50 C30,20 70,80 90,50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="12"
                    strokeLinecap="round"
                    className="text-primary"
                    style={{
                      strokeDashoffset: 383.081,
                      strokeDasharray: 383.081,
                      animation: 'rough-notation-dash 600ms ease-out 0ms 1 normal forwards running'
                    }}
                  />
                </svg>
              </h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 tracking-[-0.01em]">
                {locale.Feature.description}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 lg:gap-x-12">
              {content.features.map((feature: Feature, index: number) => {
                // Define feature icons based on index
                const icons = [
                  <svg key="github" stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 16 16" className="w-6 h-6 text-primary" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"></path>
                  </svg>,
                  <svg key="mobile" stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 384 512" className="w-6 h-6 text-primary" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 64C16 28.7 44.7 0 80 0L304 0c35.3 0 64 28.7 64 64l0 384c0 35.3-28.7 64-64 64L80 512c-35.3 0-64-28.7-64-64L16 64zM224 448a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zM304 64L80 64l0 320 224 0 0-320z"></path>
                  </svg>,
                  <svg key="toolbox" stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="w-6 h-6 text-primary" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                    <path d="M502.63 214.63l-45.25-45.25c-6-6-14.14-9.37-22.63-9.37H384V80c0-26.51-21.49-48-48-48H176c-26.51 0-48 21.49-48 48v80H77.25c-8.49 0-16.62 3.37-22.63 9.37L9.37 214.63c-6 6-9.37 14.14-9.37 22.63V320h128v-16c0-8.84 7.16-16 16-16h32c8.84 0 16 7.16 16 16v16h128v-16c0-8.84 7.16-16 16-16h32c8.84 0 16 7.16 16 16v16h128v-82.75c0-8.48-3.37-16.62-9.37-22.62zM320 160H192V96h128v64zm64 208c0 8.84-7.16 16-16 16h-32c-8.84 0-16-7.16-16-16v-16H192v16c0 8.84-7.16 16-16 16h-32c-8.84 0-16-7.16-16-16v-16H0v96c0 17.67 14.33 32 32 32h448c17.67 0 32-14.33 32-32v-96H384v16z"></path>
                  </svg>,
                  <svg key="magnet" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-magnet w-6 h-6 text-primary">
                    <path d="m6 15-4-4 6.75-6.77a7.79 7.79 0 0 1 11 11L13 22l-4-4 6.39-6.36a2.14 2.14 0 0 0-3-3L6 15"></path>
                    <path d="m5 8 4 4"></path>
                    <path d="m12 15 4 4"></path>
                  </svg>,
                  <svg key="cloud" stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" className="w-6 h-6 text-primary" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                    <path fill="none" d="M0 0h24v24H0z"></path>
                    <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"></path>
                  </svg>,
                  <svg key="globe" stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="w-6 h-6 text-primary" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                    <path d="M51.7 295.1l31.7 6.3c7.9 1.6 16-.9 21.7-6.6l15.4-15.4c11.6-11.6 31.1-8.4 38.4 6.2l9.3 18.5c4.8 9.6 14.6 15.7 25.4 15.7c15.2 0 26.1-14.6 21.7-29.2l-6-19.9c-4.6-15.4 6.9-30.9 23-30.9l2.3 0c13.4 0 25.9-6.7 33.3-17.8l10.7-16.1c5.6-8.5 5.3-19.6-.8-27.7l-16.1-21.5c-10.3-13.7-3.3-33.5 13.4-37.7l17-4.3c7.5-1.9 13.6-7.2 16.5-14.4l16.4-40.9C303.4 52.1 280.2 48 256 48C141.1 48 48 141.1 48 256c0 13.4 1.3 26.5 3.7 39.1zm407.7 4.6c-3-.3-6-.1-9 .8l-15.8 4.4c-6.7 1.9-13.8-.9-17.5-6.7l-2-3.1c-6-9.4-16.4-15.1-27.6-15.1s-21.6 5.7-27.6 15.1l-6.1 9.5c-1.4 2.2-3.4 4.1-5.7 5.3L312 330.1c-18.1 10.1-25.5 32.4-17 51.3l5.5 12.4c8.6 19.2 30.7 28.5 50.5 21.1l2.6-1c10-3.7 21.3-2.2 29.9 4.1l1.5 1.1c37.2-29.5 64.1-71.4 74.4-119.5zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zm144.5 92.1c-2.1 8.6 3.1 17.3 11.6 19.4l32 8c8.6 2.1 17.3-3.1 19.4-11.6s3.1-17.3-11.6-19.4l-32-8c-8.6-2.1-17.3 3.1-19.4 11.6zm92-20c-2.1 8.6 3.1 17.3 11.6 19.4s17.3-3.1 19.4-11.6l8-32c2.1-8.6-3.1-17.3-11.6-19.4s-17.3 3.1-19.4 11.6l-8 32zM343.2 113.7c-7.9-4-17.5-.7-21.5 7.2l-16 32c-4 7.9-.7 17.5 7.2 21.5s17.5 .7 21.5-7.2l16-32c4-7.9 .7-17.5-7.2-21.5z"></path>
                  </svg>
                ];

                return (
                  <div
                    key={feature.title}
                    className="relative group rounded-2xl p-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg"
                  >
                    <div>
                      <div className="p-3.5 w-14 h-14 rounded-xl mb-6 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center transition duration-200 group-hover:border-slate-300 dark:group-hover:border-slate-500">
                        {icons[index % icons.length]}
                      </div>
                      <h3 className="text-lg font-semibold mb-3 text-slate-900 dark:text-white tracking-tight">
                        {feature.title}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed tracking-[-0.01em]">
                        {feature.content}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="Pricing" className="w-full py-24">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 flex flex-col items-center">
            <div className="flex flex-col text-center max-w-xl mb-12">
              <h2 className="text-center relative inline-block">
                <span className="relative z-10">{locale.Pricing.title}</span>
                <svg
                  className="rough-annotation absolute -bottom-2 left-0 overflow-visible pointer-events-none w-full"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 100"
                  style={{
                    position: 'absolute',
                    overflow: 'visible',
                    pointerEvents: 'none',
                    width: '100%',
                    height: '12px'
                  }}
                >
                  <path
                    d="M10,50 C30,20 70,80 90,50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="12"
                    strokeLinecap="round"
                    className="text-primary"
                    style={{
                      strokeDashoffset: 383.081,
                      strokeDasharray: 383.081,
                      animation: 'rough-notation-dash 600ms ease-out 0ms 1 normal forwards running'
                    }}
                  />
                </svg>
              </h2>
              <h3 className="text-4xl font-medium tracking-tight mt-2">{locale.Pricing.description}</h3>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 w-full max-w-4xl">
              {content.pricingTiers.slice(0, 2).map((tier, index) => (
                <div key={index} className="flex flex-col relative overflow-hidden h-auto text-foreground box-border bg-content1 outline-none data-[focus-visible=true]:z-10 data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-focus data-[focus-visible=true]:outline-offset-2 shadow-medium rounded-large transition-transform-background motion-reduce:transition-none p-3 w-full" tabIndex={-1}>
                  <div className="p-3 z-10 w-full justify-start shrink-0 overflow-inherit color-inherit subpixel-antialiased rounded-t-large flex flex-col items-start gap-2 pb-6">
                    <h2 className="text-large font-medium">{tier.name}</h2>
                    <p className="text-medium text-default-500">{tier.description}</p>
                  </div>
                  <hr className="shrink-0 bg-divider border-none w-full h-divider" role="separator" />
                  <div className="relative flex w-full p-3 flex-auto flex-col place-content-inherit align-items-inherit h-auto break-words text-left overflow-y-auto subpixel-antialiased gap-8">
                    <p className="flex items-baseline gap-1 pt-2">
                      <span className="inline bg-gradient-to-br from-foreground to-foreground-600 bg-clip-text text-2xl font-semibold leading-7 tracking-tight text-transparent">{tier.price}</span>
                    </p>
                    <ul className="flex flex-col gap-2">
                      {tier.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center gap-2">
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="text-blue-500" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                            <path d="M173.898 439.404l-166.4-166.4c-9.997-9.997-9.997-26.206 0-36.204l36.203-36.204c9.997-9.998 26.207-9.998 36.204 0L192 312.69 432.095 72.596c9.997-9.997 26.207-9.997 36.204 0l36.203 36.204c9.997 9.997 9.997 26.206 0 36.204l-294.4 294.401c-9.998 9.997-26.207 9.997-36.204-.001z"></path>
                          </svg>
                          <p className="text-default-500">{feature}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3 h-auto flex w-full items-center overflow-hidden color-inherit subpixel-antialiased rounded-b-large">
                    <a
                      className={cn(
                        "tap-highlight-transparent no-underline hover:opacity-80 active:opacity-disabled transition-opacity z-0 group relative inline-flex items-center justify-center box-border appearance-none select-none whitespace-nowrap font-normal subpixel-antialiased overflow-hidden tap-highlight-transparent data-[pressed=true]:scale-[0.97] outline-none data-[focus-visible=true]:z-10 data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-focus data-[focus-visible=true]:outline-offset-2 px-4 min-w-20 h-10 text-small gap-2 rounded-medium w-full [&>svg]:max-w-[theme(spacing.8)] transition-transform-colors-opacity motion-reduce:transition-none",
                        index === 0 ? "bg-primary text-primary-foreground" : "bg-default/40 text-default-700",
                        "data-[hover=true]:opacity-hover"
                      )}
                      href="#"
                      tabIndex={0}
                      role="button"
                    >
                      {index === 0 ? "Get started" : "Contact us"}
                    </a>
                  </div>
                </div>
              ))}
            </div>
            <span aria-hidden="true" className="w-px h-px block" style={{ marginLeft: '0.25rem', marginTop: '3rem' }}></span>
            <div className="flex py-2">
              <p className="text-default-400 text-center">
                Want to be part of our journey?&nbsp;
                <a className="relative inline-flex items-center tap-highlight-transparent outline-none data-[focus-visible=true]:z-10 data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-focus data-[focus-visible=true]:outline-offset-2 text-medium text-foreground underline hover:opacity-80 active:opacity-disabled transition-opacity underline-offset-4"
                  href="#"
                  tabIndex={0}
                  role="link">
                  Follow our updates.
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="Testimonials" className="w-full py-24 bg-slate-50/50 dark:bg-slate-900/20">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-center relative inline-block">
                <span className="relative z-10 text-3xl sm:text-4xl font-bold tracking-tight">{locale.Testimonials.title}</span>
                <svg
                  className="rough-annotation absolute -bottom-2 left-0 overflow-visible pointer-events-none w-full"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 100"
                  style={{
                    position: 'absolute',
                    overflow: 'visible',
                    pointerEvents: 'none',
                    width: '100%',
                    height: '12px'
                  }}
                >
                  <path
                    d="M10,50 C30,20 70,80 90,50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="12"
                    strokeLinecap="round"
                    className="text-primary"
                    style={{
                      strokeDashoffset: 383.081,
                      strokeDasharray: 383.081,
                      animation: 'rough-notation-dash 600ms ease-out 0ms 1 normal forwards running'
                    }}
                  />
                </svg>
              </h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
                {locale.Testimonials.description}{' '}
                <a target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline hover:text-primary/80 transition-colors" href="https://twitter.com/weijunext">
                  Join them
                </a>
                {' '}and be part of our growing community.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {content.testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className={cn(
                    "relative group rounded-2xl p-6",
                    "bg-white dark:bg-slate-800/50",
                    "border border-slate-200 dark:border-slate-700/50",
                    "backdrop-blur-sm",
                    "transition-all duration-300",
                    "hover:border-slate-300 dark:hover:border-slate-600",
                    "hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50",
                    "hover:-translate-y-1"
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <img
                          alt={testimonial.name}
                          src={testimonial.avatar || `/images/users/${(index % 5) + 1}.png`}
                          width="48"
                          height="48"
                          className={cn(
                            "rounded-full object-cover",
                            "ring-2 ring-offset-2 ring-slate-100 dark:ring-slate-800",
                            "group-hover:ring-primary/20 dark:group-hover:ring-primary/20",
                            "transition-all duration-300"
                          )}
                        />
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{testimonial.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0">{testimonial.role}</p>
                      </div>
                    </div>
                    <a
                      href="https://twitter.com/intent/tweet"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "p-2 rounded-full",
                        "text-slate-400 hover:text-primary",
                        "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800",
                        "transition-all duration-300"
                      )}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5">
                        <path fill="currentColor" d="M8 2H1l8.26 11.015L1.45 22H4.1l6.388-7.349L16 22h7l-8.608-11.478L21.8 2h-2.65l-5.986 6.886L8 2Z" />
                      </svg>
                    </a>
                  </div>
                  <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                    {testimonial.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="FAQ" className="w-full py-16">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 flex flex-col items-center">
            <div className="flex flex-col text-center max-w-xl mb-8">
              <h2 className="text-center relative inline-block">
                <span className="relative z-10">{locale.FAQ.title}</span>
                <svg
                  className="rough-annotation absolute -bottom-2 left-0 overflow-visible pointer-events-none w-full"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 100"
                  style={{
                    position: 'absolute',
                    overflow: 'visible',
                    pointerEvents: 'none',
                    width: '100%',
                    height: '12px'
                  }}
                >
                  <path
                    d="M10,50 C30,20 70,80 90,50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="12"
                    strokeLinecap="round"
                    className="text-primary"
                    style={{
                      strokeDashoffset: 383.081,
                      strokeDasharray: 383.081,
                      animation: 'rough-notation-dash 600ms ease-out 0ms 1 normal forwards running'
                    }}
                  />
                </svg>
              </h2>
              <p className="text-large text-default-500 mt-2">{locale.FAQ.description}</p>
            </div>
            <div className="w-full max-w-3xl mx-auto">
              <Accordion
                fullWidth
                keepContentMounted
                className="gap-3"
                itemClasses={{
                  base: "px-5 !bg-default-100 !shadow-none hover:!bg-default-200/50 rounded-xl",
                  title: "font-medium text-base",
                  trigger: "py-4 data-[hover=true]:text-primary flex items-center min-h-[3.5rem]",
                  content: "pb-4 pt-0 text-base text-default-500",
                }}
                selectionMode="multiple"
                variant="splitted"
                onSelectionChange={triggerResizeEvent}
              >
                {content.faqs.map((faq: FAQ) => (
                  <AccordionItem
                    key={faq.question}
                    indicator={<PlusIcon className="text-primary h-4 w-4" />}
                    title={faq.question}
                    HeadingComponent="h3"
                    className="group"
                  >
                    <div className="text-slate-600 dark:text-slate-300 py-2">
                      {faq.answer}
                    </div>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-24">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 flex flex-col items-center">
            <div className="flex flex-col text-center max-w-xl mb-12">
              <h2 className="text-center relative inline-block">
                <span className="relative z-10">{locale.CTA.title}</span>
                <svg
                  className="rough-annotation absolute -bottom-2 left-0 overflow-visible pointer-events-none w-full"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 100"
                  style={{
                    position: 'absolute',
                    overflow: 'visible',
                    pointerEvents: 'none',
                    width: '100%',
                    height: '12px'
                  }}
                >
                  <path
                    d="M10,50 C30,20 70,80 90,50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="12"
                    strokeLinecap="round"
                    className="text-primary"
                    style={{
                      strokeDashoffset: 383.081,
                      strokeDasharray: 383.081,
                      animation: 'rough-notation-dash 600ms ease-out 0ms 1 normal forwards running'
                    }}
                  />
                </svg>
              </h2>
              <p className="text-large text-default-500">
                <span className="relative inline-block">
                  Join
                  <svg className="absolute -bottom-1 left-0 w-full" preserveAspectRatio="none" viewBox="0 0 100 100" fill="none" stroke="#b71c1c" strokeWidth="2" strokeLinecap="round" height="8">
                    <path d="M 10,50 C 40,10 60,90 90,50" />
                  </svg>
                </span>
                {' '}the waitlist,{' '}
                <span className="relative inline-block">
                  get
                  <svg className="absolute -bottom-1 left-0 w-full" preserveAspectRatio="none" viewBox="0 0 100 100" fill="none" stroke="#b71c1c" strokeWidth="2" strokeLinecap="round" height="8">
                    <path d="M 10,50 C 40,10 60,90 90,50" />
                  </svg>
                </span>
                {' '}early access, and{' '}
                <span className="relative inline-block">
                  be first
                  <svg className="absolute -bottom-1 left-0 w-full" preserveAspectRatio="none" viewBox="0 0 100 100" fill="none" stroke="#b71c1c" strokeWidth="2" strokeLinecap="round" height="8">
                    <path d="M 10,50 C 40,10 60,90 90,50" />
                  </svg>
                </span>
                !
              </p>
            </div>
            <div className="w-full max-w-lg">
              <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
                <div className="relative">
                  <input
                    type="text"
                    name="name"
                    placeholder="Full name"
                    value={formState.name}
                    onChange={handleInputChange}
                    className={cn(
                      "w-full px-4 py-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10",
                      "text-white placeholder:text-white/50",
                      "focus:outline-none focus:ring-2 focus:ring-primary/20",
                      "transition-all duration-200",
                      isFormFilled && "bg-primary/20"
                    )}
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 via-transparent to-transparent pointer-events-none"></div>
                </div>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    placeholder="hi@example.com"
                    value={formState.email}
                    onChange={handleInputChange}
                    className={cn(
                      "w-full px-4 py-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10",
                      "text-white placeholder:text-white/50",
                      "focus:outline-none focus:ring-2 focus:ring-primary/20",
                      "transition-all duration-200",
                      isFormFilled && "bg-primary/20"
                    )}
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 via-transparent to-transparent pointer-events-none"></div>
                </div>
                <button
                  className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap",
                    "ring-offset-background focus-visible:outline-none focus-visible:ring-2",
                    "focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:pointer-events-none hover:shadow-primary/25",
                    "hover:-translate-y-0.5 active:translate-y-0 h-11",
                    "w-full relative text-white/90 shadow-none font-medium",
                    "py-3.5 px-6 text-[15px] rounded-xl transition-all duration-300",
                    "disabled:opacity-70 disabled:cursor-not-allowed",
                    isFormFilled ? "bg-primary hover:bg-primary/90" : "bg-primary/40 hover:bg-primary/50"
                  )}
                  type="submit"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] transition-transform duration-300">
                      <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                    </svg>
                    <span>Join Waitlist</span>
                  </span>
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
} 