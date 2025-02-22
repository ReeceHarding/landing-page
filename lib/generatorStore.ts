import { v4 as uuidv4 } from "uuid";
import { redis } from "./kv";

export interface Feature {
  title: string;
  content: string;
  icon: string;
}

export interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
}

export interface Testimonial {
  name: string;
  role: string;
  content: string;
  avatar: string | null;
}

export interface FAQ {
  question: string;
  answer: string;
}

export type GeneratedPageContent = {
  id: string;
  idea: string;
  // Hero section
  heroTitle: string[];
  heroDescription: string;
  // Features section
  featuresTitle: string;
  features: Feature[];
  // Pricing section
  pricingTitle: string;
  pricingDescription: string;
  pricingTiers: PricingTier[];
  // Testimonials section
  testimonialsTitle: string;
  testimonials: Testimonial[];
  // FAQ section
  faqTitle: string;
  faqs: FAQ[];
  // CTA section
  ctaTitle: string;
  ctaDescription: string;
};

/**
 * We'll use the same pattern as dynamicLandingStore.ts,
 * but with the key prefix "preview_landing_page:".
 */
const REDIS_KEY_PREFIX = "preview_landing_page:";

function logStoreOperation(operation: string, details: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🏪 PreviewStore Operation: ${operation}`);
  console.log("├─ Details:", details);
  console.log(
    "├─ Environment:",
    typeof window === "undefined" ? "server" : "client"
  );
  console.log("└─ Request ID:", Math.random().toString(36).substring(7));
}

/**
 * Create a new preview landing page record in Redis
 */
export async function createPageContent(
  payload: Omit<GeneratedPageContent, "id">
): Promise<GeneratedPageContent> {
  const id = uuidv4();
  const record: GeneratedPageContent = { id, ...payload };

  logStoreOperation("createPageContent:start", {
    id,
    payloadSize: JSON.stringify(payload).length,
  });

  try {
    // Store in Redis with expiration (e.g. 30 days)
    await redis.set(`${REDIS_KEY_PREFIX}${id}`, JSON.stringify(record), {
      ex: 60 * 60 * 24 * 30,
    });

    logStoreOperation("createPageContent:complete", {
      id,
      success: true,
      timestamp: Date.now(),
    });

    return record;
  } catch (err) {
    logStoreOperation("createPageContent:error", {
      error: err instanceof Error ? err.message : "Unknown error",
      id,
    });
    throw err;
  }
}

/**
 * Retrieve a single preview landing page by ID from Redis
 */
export async function getPageContent(
  id: string
): Promise<GeneratedPageContent | undefined> {
  logStoreOperation("getPageContent:start", { id });

  try {
    const data = await redis.get<string>(`${REDIS_KEY_PREFIX}${id}`);

    if (!data) {
      logStoreOperation("getPageContent:notFound", { id });
      return undefined;
    }

    const record = JSON.parse(data) as GeneratedPageContent;

    logStoreOperation("getPageContent:complete", {
      id,
      found: true,
      recordSize: data.length,
    });

    return record;
  } catch (err) {
    logStoreOperation("getPageContent:error", {
      error: err instanceof Error ? err.message : "Unknown error",
      id,
    });
    return undefined;
  }
} 