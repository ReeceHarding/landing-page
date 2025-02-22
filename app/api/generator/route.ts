import { createDynamicLandingPage } from "@/lib/dynamicLandingStore";
import { createPageContent } from "@/lib/generatorStore";
import { encoder, sseFormat, streamChatCompletion } from "@/lib/streamOpenAi";
import { NextRequest } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const FEATURE_ICONS = ["⚡️", "🛠️", "🔒", "📱", "🌐", "✨"];

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

/**
 * POST /api/generator
 * Body: { idea: string }
 * Returns: SSE logs + final generatedId + dynamicId
 */
export async function POST(req: NextRequest) {
  try {
    const { idea } = await req.json();
    const readableStream = new ReadableStream({
      start(controller) {
        if (!idea || !idea.trim()) {
          controller.enqueue(encoder(sseFormat({ log: "No idea provided." })));
          controller.enqueue(encoder("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        // Helper to push logs
        const pushLog = (msg: string) => {
          controller.enqueue(encoder(sseFormat({ log: msg })));
        };

        (async () => {
          try {
            pushLog("Starting generation with idea: " + idea);
            pushLog(`Request context: ${JSON.stringify({
              timestamp: new Date().toISOString(),
              ideaLength: idea.length,
              environment: process.env.NODE_ENV,
            })}`);

            // Build messages
            const messages: ChatCompletionMessageParam[] = [
              {
                role: "system",
                content: `You are an expert marketing copywriter and business strategist. Analyze the business idea and create compelling, perfectly formatted content for a landing page. Focus on clear value propositions and benefits.

Key guidelines:
- Hero title should be exactly 3 parts for animation
- Features should be specific and actionable
- Pricing tiers should follow SaaS best practices
- Testimonials should feel authentic and focus on benefits
- FAQs should address common objections
- All content should maintain consistent tone and style`,
              },
              {
                role: "user",
                content: `Create a complete landing page for this business idea: "${idea}". Return a JSON object with the following sections:

1. Hero section (formatted exactly for animation):
- heroTitle: Array of exactly 3 strings
- heroDescription: 1-2 sentence

2. Features section:
- featuresTitle
- features: Array of 6 strings

3. Pricing section:
- pricingTitle
- pricingDescription
- pricingTiers: 3 objects with name, price, description, and array of features

4. Testimonials section:
- testimonialsTitle
- testimonials: Array of 3 objects with { name, role, content }

5. FAQ section:
- faqTitle
- faqs: Array of 6 objects { question, answer }

6. CTA section:
- ctaTitle
- ctaDescription
`,
              },
            ];

            pushLog(`Prepared GPT messages: ${JSON.stringify({
              messageCount: messages.length,
              systemMessageLength: messages[0]?.content?.length ?? 0,
              userMessageLength: messages[1]?.content?.length ?? 0,
            })}`);

            pushLog("Invoking GPT in streaming mode...");

            // Create sub-stream for GPT
            const openaiStream = streamChatCompletion(messages, (msg) => {
              pushLog(`GPT Stream Message: ${msg}`);
            });

            // We'll read from openaiStream to accumulate text
            const reader = openaiStream.getReader();
            let done = false;
            let accumulatedText = "";
            let chunkCount = 0;

            while (!done) {
              const { value, done: rDone } = await reader.read();
              done = rDone;
              if (value) {
                const chunkStr = new TextDecoder().decode(value);
                chunkCount++;
                pushLog(`Processing chunk #${chunkCount}: ${chunkStr.length} bytes`);

                for (const line of chunkStr.split("\n")) {
                  if (line.startsWith("data:")) {
                    const dataPart = line.replace("data:", "").trim();
                    if (dataPart === "[DONE]") {
                      pushLog("Received [DONE] signal");
                      done = true;
                      break;
                    }
                    if (dataPart === "[ping]") {
                      pushLog("Received ping");
                      continue;
                    }
                    try {
                      const json = JSON.parse(dataPart);
                      if (json.log) {
                        pushLog(`Stream log: ${json.log}`);
                      }
                      if (json.content) {
                        accumulatedText += json.content;
                        pushLog(`Added content chunk (${json.content.length} chars)`);
                      }
                    } catch (err) {
                      if (dataPart && !dataPart.includes('"log":')) {
                        accumulatedText += dataPart;
                        pushLog(`Added raw chunk (${dataPart.length} chars)`);
                      }
                    }
                  }
                }
              }
            }

            pushLog(`Stream complete. Total chunks: ${chunkCount}`);
            pushLog(`Accumulated text length: ${accumulatedText.length}`);

            try {
              pushLog("Attempting to parse complete content...");
              const content = JSON.parse(accumulatedText);

              pushLog(`Raw GPT response structure: ${JSON.stringify({
                hasHeroTitle: Boolean(content.heroTitle),
                heroTitleType: typeof content.heroTitle,
                heroTitleIsArray: Array.isArray(content.heroTitle),
                heroTitleLength: Array.isArray(content.heroTitle) ? content.heroTitle.length : 0,
                hasHeroSection: Boolean(content.Hero),
                hasFeatures: Boolean(content.features),
                featuresCount: Array.isArray(content.features) ? content.features.length : 0,
                hasPricingTiers: Boolean(content.pricingTiers),
                pricingTiersCount: Array.isArray(content.pricingTiers) ? content.pricingTiers.length : 0,
              })}`);

              pushLog(`Raw GPT response content: ${JSON.stringify(content, null, 2)}`);

              pushLog("Content structure validated. Processing features...");

              // Log initial data state
              pushLog(`Initial data state: ${JSON.stringify({
                heroTitle: content.heroTitle,
                heroTitleFromHero: content.Hero?.heroTitle,
                rawFeatures: content.features,
                featuresFromFeatures: content.Features?.features,
                dataTypes: {
                  heroTitle: typeof content.heroTitle,
                  heroTitleFromHero: typeof content.Hero?.heroTitle,
                  features: typeof content.features,
                  featuresFromFeatures: typeof content.Features?.features,
                }
              }, null, 2)}`);

              // Ensure consistent data structure regardless of GPT's response format
              let heroTitle = Array.isArray(content.heroTitle) ? content.heroTitle :
                Array.isArray(content.hero?.heroTitle) ? content.hero.heroTitle :
                  Array.isArray(content.Hero?.heroTitle) ? content.Hero.heroTitle :
                    Array.isArray(content.heroSection?.heroTitle) ? content.heroSection.heroTitle :
                      ["Build", "Launch", "Scale"];

              // If heroTitle is a single item with dots, split it
              if (heroTitle.length === 1 && heroTitle[0].includes(".")) {
                heroTitle = heroTitle[0].split(".").map((part: string) => part.trim()).filter((part: string) => part);
              }

              // Ensure exactly 3 items
              if (heroTitle.length < 3) {
                heroTitle = [...heroTitle, ...["Build", "Launch", "Scale"].slice(heroTitle.length)];
              }
              heroTitle = heroTitle.slice(0, 3);

              const features = Array.isArray(content.features) ? content.features :
                Array.isArray(content.features?.features) ? content.features.features :
                  Array.isArray(content.Features?.features) ? content.Features.features :
                    Array.isArray(content.featuresSection?.features) ? content.featuresSection.features :
                      [];

              const pricingTiers = Array.isArray(content.pricingTiers) ? content.pricingTiers :
                Array.isArray(content.pricing?.pricingTiers) ? content.pricing.pricingTiers :
                  Array.isArray(content.Pricing?.pricingTiers) ? content.Pricing.pricingTiers :
                    Array.isArray(content.pricingSection?.pricingTiers) ? content.pricingSection.pricingTiers :
                      [];

              const testimonials = Array.isArray(content.testimonials) ? content.testimonials :
                Array.isArray(content.testimonials?.testimonials) ? content.testimonials.testimonials :
                  Array.isArray(content.Testimonials?.testimonials) ? content.Testimonials.testimonials :
                    Array.isArray(content.testimonialsSection?.testimonials) ? content.testimonialsSection.testimonials :
                      [];

              const faqs = Array.isArray(content.faqs) ? content.faqs :
                Array.isArray(content.faq?.faqs) ? content.faq.faqs :
                  Array.isArray(content.FAQ?.faqs) ? content.FAQ.faqs :
                    Array.isArray(content.faqSection?.faqs) ? content.faqSection.faqs :
                      [];

              // Log normalized data
              pushLog(`Normalized data: ${JSON.stringify({
                heroTitle,
                features,
                heroTitleSource: Array.isArray(content.heroTitle) ? 'direct' :
                  Array.isArray(content.hero?.heroTitle) ? 'nested-lower' :
                    Array.isArray(content.Hero?.heroTitle) ? 'nested-upper' :
                      Array.isArray(content.heroSection?.heroTitle) ? 'nested-lower' : 'default',
                featuresSource: Array.isArray(content.features) ? 'direct' :
                  Array.isArray(content.features?.features) ? 'nested-lower' :
                    Array.isArray(content.Features?.features) ? 'nested-upper' :
                      Array.isArray(content.featuresSection?.features) ? 'nested-lower' : 'default'
              }, null, 2)}`);

              // Normalize all content with strict typing
              const normalizedContent = {
                heroTitle,  // Already normalized above
                heroDescription: String(
                  content.heroDescription ||
                  content.hero?.heroDescription ||
                  content.Hero?.heroDescription ||
                  content.heroSection?.heroDescription ||
                  ""
                ),
                featuresTitle: String(
                  content.featuresTitle ||
                  content.features?.featuresTitle ||
                  content.Features?.title ||
                  content.featuresSection?.featuresTitle ||
                  "Features"
                ),
                features: features.map((f: string) => String(f)),
                pricingTitle: String(
                  content.pricingTitle ||
                  content.pricing?.pricingTitle ||
                  content.Pricing?.title ||
                  content.pricingSection?.pricingTitle ||
                  "Pricing"
                ),
                pricingDescription: String(
                  content.pricingDescription ||
                  content.pricing?.pricingDescription ||
                  content.Pricing?.description ||
                  content.pricingSection?.pricingDescription ||
                  ""
                ),
                pricingTiers: pricingTiers.map((tier: PricingTier) => ({
                  name: String(tier.name),
                  price: String(tier.price),
                  description: String(tier.description),
                  features: Array.isArray(tier.features) ? tier.features.map((f: string) => String(f)) : []
                })),
                testimonialsTitle: String(
                  content.testimonialsTitle ||
                  content.testimonials?.testimonialsTitle ||
                  content.Testimonials?.title ||
                  content.testimonialsSection?.testimonialsTitle ||
                  "Testimonials"
                ),
                testimonials: testimonials.map((t: Testimonial) => ({
                  name: String(t.name),
                  role: String(t.role),
                  content: String(t.content).trim()
                })),
                faqTitle: String(
                  content.faqTitle ||
                  content.faq?.faqTitle ||
                  content.FAQ?.title ||
                  content.faqSection?.faqTitle ||
                  "FAQ"
                ),
                faqs: faqs.map((faq: FAQ) => ({
                  question: String(faq.question).trim(),
                  answer: String(faq.answer).trim()
                })),
                ctaTitle: String(
                  content.ctaTitle ||
                  content.cta?.ctaTitle ||
                  content.CTA?.title ||
                  content.ctaSection?.ctaTitle ||
                  "Get Started"
                ),
                ctaDescription: String(
                  content.ctaDescription ||
                  content.cta?.ctaDescription ||
                  content.CTA?.description ||
                  content.ctaSection?.ctaDescription ||
                  "Join us today!"
                )
              };

              pushLog("Creating record in preview store...");
              // Create preview record with icons for features
              const previewRecord = await createPageContent({
                idea,
                heroTitle: normalizedContent.heroTitle,
                heroDescription: normalizedContent.heroDescription,
                featuresTitle: normalizedContent.featuresTitle,
                features: normalizedContent.features.map((feature: string, index: number) => ({
                  title: feature,
                  content: `Leverage the power of ${feature.toLowerCase()} to transform your business.`,
                  icon: FEATURE_ICONS[index % FEATURE_ICONS.length],
                })),
                pricingTitle: normalizedContent.pricingTitle,
                pricingDescription: normalizedContent.pricingDescription,
                pricingTiers: normalizedContent.pricingTiers,
                testimonialsTitle: normalizedContent.testimonialsTitle,
                testimonials: normalizedContent.testimonials.map((t: Testimonial) => ({
                  ...t,
                  avatar: null
                })),
                faqTitle: normalizedContent.faqTitle,
                faqs: normalizedContent.faqs,
                ctaTitle: normalizedContent.ctaTitle,
                ctaDescription: normalizedContent.ctaDescription,
              });

              pushLog("Creating record in dynamic store...");
              // Create dynamic record with enhanced features to match preview
              const dynamicRecord = await createDynamicLandingPage({
                logoUrl: null,
                heroTitle: normalizedContent.heroTitle,
                heroDescription: normalizedContent.heroDescription,
                featuresTitle: normalizedContent.featuresTitle,
                features: normalizedContent.features.map((feature: string, index: number) => ({
                  title: feature,
                  content: `Leverage the power of ${feature.toLowerCase()} to transform your business.`,
                  icon: FEATURE_ICONS[index % FEATURE_ICONS.length],
                })),
                pricingTitle: normalizedContent.pricingTitle,
                pricingDescription: normalizedContent.pricingDescription,
                pricingTiers: normalizedContent.pricingTiers,
                testimonialsTitle: normalizedContent.testimonialsTitle,
                testimonials: normalizedContent.testimonials.map((t: Testimonial) => ({
                  ...t,
                  avatar: null
                })),
                faqTitle: normalizedContent.faqTitle,
                faqs: normalizedContent.faqs,
                ctaTitle: normalizedContent.ctaTitle,
                ctaDescription: normalizedContent.ctaDescription,
              });

              pushLog("Successfully stored landing pages in both stores!");
              pushLog(`Preview ID: ${previewRecord.id}`);
              pushLog(`Dynamic ID: ${dynamicRecord.id}`);

              // Return both IDs
              controller.enqueue(
                encoder(
                  sseFormat({
                    generatedId: previewRecord.id,
                    dynamicId: dynamicRecord.id,
                  })
                )
              );
            } catch (err: any) {
              pushLog("Error parsing content: " + err.message);
            }

            pushLog("Generation complete!");
          } catch (e: any) {
            pushLog("Error: " + e.message);
          } finally {
            controller.enqueue(encoder("data: [DONE]\n\n"));
            controller.close();
          }
        })();
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
} 