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
                content: `You are an expert marketing copywriter, UX designer, and business strategist with deep expertise in crafting high-converting landing pages. Your role is to analyze business ideas and create compelling, perfectly formatted content that drives action.

Key Principles:
1. SPECIFICITY: Every piece of content must be specific to the business idea, not generic marketing speak
2. AUTHENTICITY: Write in a natural, conversational tone that builds trust
3. BENEFITS-FIRST: Lead with clear, tangible benefits rather than features
4. SOCIAL PROOF: Create detailed, believable testimonials based on real use cases
5. OBJECTION HANDLING: Address real concerns in FAQs
6. CLEAR NEXT STEPS: Every section should guide users toward action

Content Guidelines:
- Hero Title: Exactly 3 parts, each 1-2 words max, that tell a story (Problem → Solution → Outcome)
- Features: Each feature must include:
  * Specific benefit-driven title (e.g., "Instant Rights Protection" not "Protection")
  * Detailed description of how it solves a specific problem (2-3 sentences)
  * Measurable outcome or result
- Pricing: Follow SaaS best practices with exactly 2 tiers (Basic vs Pro), clear value differentiation
- Testimonials: Create 8 detailed testimonials (800-1000 chars) with specific scenarios, measurable results, and emotional impact
- FAQs: Address common objections and demonstrate deep industry understanding
- CTA: Create urgency and emphasize value`,
              },
              {
                role: "user",
                content: `Create a complete landing page for this business idea: "${idea}". Return a JSON object with the following sections:

1. Hero Section (must follow this format exactly):
- heroTitle: Array of exactly 3 strings that tell a story [Problem → Solution → Outcome]
- heroDescription: Clear value proposition in 1-2 sentences, emphasizing unique benefits

2. Features Section:
- featuresTitle: Action-oriented title that emphasizes transformation
- features: Array of exactly 6 objects with:
  * title: Start with action verbs
  * content: Focus on end benefits, not technical features
  * icon: One of: ⚡️ 🛠️ 🔒 📱 🌐 ✨

3. Pricing Section:
- pricingTitle: Value-focused title
- pricingDescription: Emphasize flexibility and value
- pricingTiers: Array of exactly 2 objects:
  * Basic tier: For individuals/small teams
  * Pro tier: For growing businesses
  Each with:
  * name: Clear tier name
  * price: Price with billing frequency
  * description: Value proposition
  * features: Array of 4-6 key benefits

4. Testimonials Section:
- testimonialsTitle: Trust-building title
- testimonials: Array of 8 objects with:
  * name: Realistic full name
  * role: Specific job title
  * content: 350-450 character story with:
    - Specific problem they faced
    - How the solution helped
    - Measurable results
    - Emotional impact

5. FAQ Section:
- faqTitle: Clear, inviting title
- faqs: Array of 6 objects addressing:
  * Common objections
  * Technical questions
  * Implementation concerns
  * ROI/results questions
  * Security/privacy
  * Support/service

6. CTA Section:
- ctaTitle: Action-oriented title with clear value
- ctaDescription: Urgency-driven description with social proof element`,
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
                      // Default pricing tiers if none found
                      [{
                        name: "Basic",
                        price: "$29/month",
                        description: "Perfect for getting started",
                        features: ["Core features", "Basic support", "Up to 1000 users", "1 project"]
                      },
                      {
                        name: "Pro",
                        price: "$99/month",
                        description: "For growing businesses",
                        features: ["All Basic features", "Priority support", "Unlimited users", "Unlimited projects"]
                      }];

              const testimonials = Array.isArray(content.testimonials) ? content.testimonials :
                Array.isArray(content.testimonials?.testimonials) ? content.testimonials.testimonials :
                  Array.isArray(content.Testimonials?.testimonials) ? content.Testimonials.testimonials :
                    Array.isArray(content.testimonialsSection?.testimonials) ? content.testimonialsSection.testimonials :
                      // Default testimonials if none found
                      Array.from({ length: 8 }, (_, i) => ({
                        name: `Customer ${i + 1}`,
                        role: "Satisfied User",
                        content: "This product has transformed how we work. The implementation was smooth, and the results were immediate. Highly recommended for any business looking to improve their operations.",
                        avatar: null
                      }));

              const faqs = Array.isArray(content.faqs) ? content.faqs :
                Array.isArray(content.faq?.faqs) ? content.faq.faqs :
                  Array.isArray(content.FAQ?.faqs) ? content.FAQ.faqs :
                    Array.isArray(content.faqSection?.faqs) ? content.faqSection.faqs :
                      // Default FAQs if none found
                      Array.from({ length: 6 }, (_, i) => ({
                        question: `Common Question ${i + 1}?`,
                        answer: "We understand this is an important consideration. Our solution is designed to address this exact need, providing you with the tools and support necessary for success."
                      }));

              // Ensure features array has exactly 6 items
              const normalizedFeatures = features.length > 0 ? features : Array.from({ length: 6 }, (_, i) => ({
                title: `Feature ${i + 1}`,
                content: "This feature helps you achieve your goals more efficiently.",
                icon: FEATURE_ICONS[i % FEATURE_ICONS.length]
              }));

              if (normalizedFeatures.length < 6) {
                const additionalFeatures = Array.from({ length: 6 - normalizedFeatures.length }, (_, i) => ({
                  title: `Additional Feature ${i + 1}`,
                  content: "This feature enhances your experience and productivity.",
                  icon: FEATURE_ICONS[(normalizedFeatures.length + i) % FEATURE_ICONS.length]
                }));
                normalizedFeatures.push(...additionalFeatures);
              }

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
                  "Transform your business with our solution"
                ),
                featuresTitle: String(
                  content.featuresTitle ||
                  content.features?.title ||
                  content.Features?.title ||
                  content.featuresSection?.title ||
                  "Features"
                ),
                features: normalizedFeatures.slice(0, 6).map((f: any) => {
                  const title = String(f.title || f);
                  const featureContent = String(f.content || f.description || `Leverage the power of ${title} to transform your business.`);
                  return {
                    title,
                    content: featureContent,
                    icon: String(f.icon || FEATURE_ICONS[normalizedFeatures.indexOf(f) % FEATURE_ICONS.length])
                  };
                }),
                pricingTitle: String(
                  content.pricingTitle ||
                  content.pricing?.title ||
                  content.Pricing?.title ||
                  content.pricingSection?.title ||
                  "Pricing"
                ),
                pricingDescription: String(
                  content.pricingDescription ||
                  content.pricing?.description ||
                  content.Pricing?.description ||
                  content.pricingSection?.description ||
                  "Choose the plan that's right for you"
                ),
                pricingTiers: (pricingTiers || []).map((tier: any) => ({
                  name: String(tier.name || tier.title || "Basic"),
                  price: String(tier.price || "$0"),
                  description: String(tier.description || "Get started with our basic plan"),
                  features: Array.isArray(tier.features) ? tier.features.map((f: any) => String(f)) : []
                })),
                testimonialsTitle: String(
                  content.testimonialsTitle ||
                  content.testimonials?.title ||
                  content.Testimonials?.title ||
                  content.testimonialsSection?.title ||
                  "What Our Customers Say"
                ),
                testimonials: (testimonials || []).map((t: any) => ({
                  name: String(t.name || "Happy Customer"),
                  role: String(t.role || t.position || "Satisfied User"),
                  content: String(t.content || t.testimonial || "This product has transformed our business.").trim(),
                  avatar: null
                })),
                faqTitle: String(
                  content.faqTitle ||
                  content.faq?.title ||
                  content.FAQ?.title ||
                  content.faqSection?.title ||
                  "Frequently Asked Questions"
                ),
                faqs: (faqs || []).map((faq: any) => ({
                  question: String(faq.question || "How can we help?").trim(),
                  answer: String(faq.answer || "We're here to help you succeed.").trim()
                })),
                ctaTitle: String(
                  content.ctaTitle ||
                  content.cta?.title ||
                  content.CTA?.title ||
                  content.ctaSection?.title ||
                  "Get Started Today"
                ),
                ctaDescription: String(
                  content.ctaDescription ||
                  content.cta?.description ||
                  content.CTA?.description ||
                  content.ctaSection?.description ||
                  "Join thousands of satisfied customers"
                )
              };

              pushLog("Creating record in preview store...");
              // Create preview record with icons for features
              const previewRecord = await createPageContent({
                idea,
                heroTitle: normalizedContent.heroTitle,
                heroDescription: normalizedContent.heroDescription,
                featuresTitle: normalizedContent.featuresTitle,
                features: normalizedContent.features,  // Use normalized features directly
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
                features: normalizedContent.features.map((feature: Feature, index: number) => ({
                  title: feature.title,
                  content: feature.content,
                  icon: feature.icon || FEATURE_ICONS[index % FEATURE_ICONS.length],
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