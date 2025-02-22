import CTAButton from "@/components/home/CTAButton";
import { LineText } from "@/components/LineText";
import { getDynamicLandingPage } from "@/lib/dynamicLandingStore";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";

/**
 * The same structure as the preview's page, but for dynamic-lp.
 * We'll replicate sections with dynamic data from dynamicLandingStore.
 */

// Add a logging utility at the top
function logDynamicPage(operation: string, details: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🎨 DynamicPage: ${operation}`);
  console.log('├─ Details:', details);
  console.log('└─ Environment:', typeof window === 'undefined' ? 'server' : 'client');
}

// Add dynamic metadata
export async function generateMetadata({ params }: { params: { slug: string } }) {
  logDynamicPage('generateMetadata:start', { slug: params.slug });

  const content = await getDynamicLandingPage(params.slug);

  logDynamicPage('generateMetadata:content', {
    hasContent: Boolean(content),
    heroTitle: content?.heroTitle,
    heroDescription: content?.heroDescription?.slice(0, 100)
  });

  if (!content) {
    logDynamicPage('generateMetadata:notFound', { slug: params.slug });
    return {
      title: 'Page Not Found',
      description: 'The requested landing page could not be found.'
    };
  }

  const metadata = {
    title: content.heroTitle.join(' '),
    description: content.heroDescription
  };

  logDynamicPage('generateMetadata:complete', { metadata });
  return metadata;
}

// Async component to load the content
async function DynamicContent({ slug }: { slug: string }) {
  logDynamicPage('DynamicContent:start', { slug });

  const content = await getDynamicLandingPage(slug);

  logDynamicPage('DynamicContent:fetchComplete', {
    hasContent: Boolean(content),
    contentType: typeof content,
    heroTitleType: content ? typeof content.heroTitle : 'N/A',
    heroTitleLength: content?.heroTitle?.length || 0,
    heroTitleValues: content?.heroTitle || [],
    featuresCount: content?.features?.length || 0,
    pricingTiersCount: content?.pricingTiers?.length || 0,
    testimonialsCount: content?.testimonials?.length || 0,
    faqsCount: content?.faqs?.length || 0
  });

  if (!content) {
    logDynamicPage('DynamicContent:notFound', { slug });
    notFound();
  }

  const {
    logoUrl,
    heroTitle,
    heroDescription,
    featuresTitle,
    features,
    pricingTitle,
    pricingDescription,
    pricingTiers,
    testimonialsTitle,
    testimonials,
    faqTitle,
    faqs,
    ctaTitle,
    ctaDescription
  } = content;

  logDynamicPage('DynamicContent:destructured', {
    heroTitleType: typeof heroTitle,
    heroTitleLength: heroTitle.length,
    heroTitleValues: heroTitle,
    hasHeroDescription: Boolean(heroDescription),
    heroDescriptionLength: heroDescription.length,
    featuresCount: features.length,
    pricingTiersCount: pricingTiers.length,
    testimonialsCount: testimonials.length,
    faqsCount: faqs.length,
    sections: {
      hero: Boolean(heroTitle && heroDescription),
      features: Boolean(featuresTitle && features.length),
      pricing: Boolean(pricingTitle && pricingTiers.length),
      testimonials: Boolean(testimonialsTitle && testimonials.length),
      faq: Boolean(faqTitle && faqs.length),
      cta: Boolean(ctaTitle && ctaDescription)
    }
  });

  // Add logging before returning JSX
  logDynamicPage('DynamicContent:rendering', {
    timestamp: Date.now(),
    sections: ['hero', 'features', 'pricing', 'testimonials', 'faq', 'cta']
  });

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800 pb-8 pt-12 md:pt-16 lg:pt-20">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-8 text-center">
          {/* Optional dynamic logo */}
          {logoUrl && (
            <div className="mb-6 flex justify-center">
              <Image
                alt="Dynamic Logo"
                src={logoUrl}
                width={64}
                height={64}
                className="w-16 h-16 object-contain"
              />
            </div>
          )}

          {heroTitle.length >= 3 ? (
            <h1
              className={cn(
                "text-[2.75rem] font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl",
                "text-slate-900 dark:text-white",
                "leading-[1.1]"
              )}
            >
              {heroTitle[0]}{" "}
              <span className="relative inline-block">
                <LineText>{heroTitle[1]}</LineText>
                <span className="absolute -inset-1 -skew-y-2 bg-primary/[0.07] rounded-sm" />
              </span>{" "}
              {heroTitle[2]}
            </h1>
          ) : (
            <h1 className="text-5xl font-bold text-slate-900 dark:text-white">
              My Dynamic Landing Page
            </h1>
          )}

          <p className="mx-auto mt-6 max-w-2xl text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed tracking-[-0.01em]">
            {heroDescription}
          </p>

          <div className="mt-8">
            <CTAButton locale={{ title: "Sign Up" }} />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section id="Features" className="relative py-24 sm:py-32 border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-20">
            <h2
              className={cn(
                "text-3xl font-bold tracking-tight sm:text-4xl mb-4",
                "text-slate-900 dark:text-white",
                "leading-[1.2]"
              )}
            >
              {featuresTitle}
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 tracking-[-0.01em]">
              Check out our awesome features
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 lg:gap-x-12">
            {features && features.length > 0 ? (
              features.map((feat, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "relative group",
                    "rounded-2xl p-8 bg-white dark:bg-slate-800",
                    "border border-slate-200 dark:border-slate-700",
                    "transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg"
                  )}
                >
                  <h3 className="text-lg font-semibold mb-3 text-slate-900 dark:text-white tracking-tight">
                    {feat}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed tracking-[-0.01em]">
                    This is a placeholder feature description for: {feat}
                  </p>
                </div>
              ))
            ) : (
              <p className="col-span-3 text-center text-slate-500">No features specified.</p>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="Pricing" className="relative py-24 sm:py-32 border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-20">
            <h2
              className={cn(
                "text-3xl font-bold tracking-tight sm:text-4xl mb-4",
                "text-slate-900 dark:text-white",
                "leading-[1.2]"
              )}
            >
              {pricingTitle}
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 tracking-[-0.01em]">
              {pricingDescription}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingTiers && pricingTiers.length > 0 ? (
              pricingTiers.map((tier, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "relative group",
                    "rounded-2xl p-8 bg-white dark:bg-slate-800",
                    "border border-slate-200 dark:border-slate-700",
                    "transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg"
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
                    {tier.features.map((f, i) => (
                      <li key={i} className="flex items-center text-slate-600 dark:text-slate-300">
                        <span className="mr-2">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <CTAButton locale={{ title: "Select" }} />
                </div>
              ))
            ) : (
              <p className="col-span-3 text-center text-slate-500">No pricing tiers specified.</p>
            )}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="Testimonials" className="relative py-24 sm:py-32 border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-20">
            <h2
              className={cn(
                "text-3xl font-bold tracking-tight sm:text-4xl mb-4",
                "text-slate-900 dark:text-white",
                "leading-[1.2]"
              )}
            >
              {testimonialsTitle}
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 tracking-[-0.01em]">
              See what our customers say
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials && testimonials.length > 0 ? (
              testimonials.map((test, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "relative group rounded-2xl p-8 bg-white dark:bg-slate-800",
                    "border border-slate-200 dark:border-slate-700",
                    "transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg"
                  )}
                >
                  <p className="text-slate-600 dark:text-slate-300 mb-6 italic">&quot;{test.content}&quot;</p>
                  <div className="flex items-center">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {test.name}
                      </span>
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {test.role}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="col-span-3 text-center text-slate-500">No testimonials found.</p>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="FAQ" className="relative py-24 sm:py-32 border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-20">
            <h2
              className={cn(
                "text-3xl font-bold tracking-tight sm:text-4xl mb-4",
                "text-slate-900 dark:text-white",
                "leading-[1.2]"
              )}
            >
              {faqTitle}
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 tracking-[-0.01em]">
              Frequently Asked Questions
            </p>
          </div>
          <div className="mx-auto max-w-3xl space-y-6">
            {faqs && faqs.length > 0 ? (
              faqs.map((fq, i) => (
                <div
                  key={i}
                  className={cn(
                    "border border-slate-200 dark:border-slate-700 rounded-xl p-6",
                    "hover:shadow-lg transition-all"
                  )}
                >
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {fq.question}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {fq.answer}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-500">No FAQs available.</p>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="CTA" className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-8 text-center">
          <h2 className={cn(
            "text-3xl font-bold tracking-tight sm:text-4xl mb-4",
            "text-slate-900 dark:text-white",
            "leading-[1.2]"
          )}>
            {ctaTitle}
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 tracking-[-0.01em]">
            {ctaDescription}
          </p>
          <div className="mt-8">
            <CTAButton locale={{ title: "Get Started" }} />
          </div>
        </div>
      </section>
    </div>
  );
}

// Main page component with Suspense
export default function DynamicLandingPage({
  params
}: {
  params: { slug: string };
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading your landing page...</p>
        </div>
      </div>
    }>
      <DynamicContent slug={params.slug} />
    </Suspense>
  );
} 