import { v4 as uuidv4 } from "uuid";
import { redis } from "./kv";

/**
 * Represents the dynamic landing page content structure
 */
export interface DynamicLandingPageContent {
  id: string;
  logoUrl: string | null;
  heroTitle: string[];
  heroDescription: string;
  featuresTitle: string;
  features: {
    title: string;
    content: string;
    icon: string;
  }[];
  pricingTitle: string;
  pricingDescription: string;
  pricingTiers: {
    name: string;
    price: string;
    description: string;
    features: string[];
  }[];
  testimonialsTitle: string;
  testimonials: {
    name: string;
    role: string;
    content: string;
    avatar: string | null;
  }[];
  faqTitle: string;
  faqs: {
    question: string;
    answer: string;
  }[];
  ctaTitle: string;
  ctaDescription: string;
}

const REDIS_KEY_PREFIX = "dynamic_landing_page:";

function logStoreOperation(operation: string, details: any) {
  // Only log in development
  if (process.env.NODE_ENV !== 'development') return;

  const timestamp = new Date().toISOString();
  const isServer = typeof window === 'undefined';

  // Only log essential memory info on server
  let memoryInfo = '';
  if (isServer && typeof process !== 'undefined' && process.memoryUsage) {
    const memory = process.memoryUsage();
    memoryInfo = `(Heap: ${Math.round(memory.heapUsed / 1024 / 1024)}MB)`;
  }

  // Simplified logging format
  console.log(`[${timestamp}] DynamicStore: ${operation} ${memoryInfo}`);

  // Only log details if they're essential
  if (details?.error || details?.id || details?.hasData) {
    console.log('Details:', {
      id: details.id,
      error: details.error,
      hasData: details.hasData,
      dataType: details.dataType
    });
  }
}

/**
 * Validates the content structure and ensures minimum required items
 */
function validateContent(content: DynamicLandingPageContent) {
  // Required array lengths
  const requiredArrays = {
    heroTitle: 3,
    features: 4,
    pricingTiers: 2,
    testimonials: 3,
    faqs: 4
  };

  // Validate array lengths
  for (const [field, minLength] of Object.entries(requiredArrays)) {
    const array = content[field as keyof DynamicLandingPageContent] as any[];
    if (!Array.isArray(array)) {
      throw new Error(`${field} must be an array`);
    }
    if (array.length < minLength) {
      throw new Error(`${field} must have at least ${minLength} items, but has ${array.length}`);
    }
  }

  // Validate required string fields are not empty
  const requiredStrings = [
    'heroDescription',
    'featuresTitle',
    'pricingTitle',
    'pricingDescription',
    'testimonialsTitle',
    'faqTitle',
    'ctaTitle',
    'ctaDescription'
  ];

  for (const field of requiredStrings) {
    const value = content[field as keyof DynamicLandingPageContent] as string;
    if (!value || value.trim().length === 0) {
      throw new Error(`${field} cannot be empty`);
    }
  }

  // Validate pricing tiers structure
  content.pricingTiers.forEach((tier, index) => {
    if (!tier.name || tier.name.trim().length === 0) {
      throw new Error(`Pricing tier ${index} must have a name`);
    }
    if (!tier.price || tier.price.trim().length === 0) {
      throw new Error(`Pricing tier ${index} must have a price`);
    }
    if (!tier.description || tier.description.trim().length === 0) {
      throw new Error(`Pricing tier ${index} must have a description`);
    }
    if (!Array.isArray(tier.features) || tier.features.length === 0) {
      throw new Error(`Pricing tier ${index} must have at least one feature`);
    }
  });

  // Validate testimonials structure
  content.testimonials.forEach((testimonial, index) => {
    if (!testimonial.name || testimonial.name.trim().length === 0) {
      throw new Error(`Testimonial ${index} must have a name`);
    }
    if (!testimonial.role || testimonial.role.trim().length === 0) {
      throw new Error(`Testimonial ${index} must have a role`);
    }
    if (!testimonial.content || testimonial.content.trim().length === 0) {
      throw new Error(`Testimonial ${index} must have content`);
    }
  });

  // Validate FAQs structure
  content.faqs.forEach((faq, index) => {
    if (!faq.question || faq.question.trim().length === 0) {
      throw new Error(`FAQ ${index} must have a question`);
    }
    if (!faq.answer || faq.answer.trim().length === 0) {
      throw new Error(`FAQ ${index} must have an answer`);
    }
  });

  return content;
}

/**
 * Creates a new dynamic landing page
 */
export async function createDynamicLandingPage(data: Partial<DynamicLandingPageContent>): Promise<DynamicLandingPageContent> {
  const id = data.id || uuidv4();

  // Create the content with all required fields
  const content: DynamicLandingPageContent = {
    id,
    logoUrl: data.logoUrl || null,
    heroTitle: data.heroTitle || [],
    heroDescription: data.heroDescription || '',
    featuresTitle: data.featuresTitle || '',
    features: data.features || [],
    pricingTitle: data.pricingTitle || '',
    pricingDescription: data.pricingDescription || '',
    pricingTiers: data.pricingTiers || [],
    testimonialsTitle: data.testimonialsTitle || '',
    testimonials: data.testimonials || [],
    faqTitle: data.faqTitle || '',
    faqs: data.faqs || [],
    ctaTitle: data.ctaTitle || '',
    ctaDescription: data.ctaDescription || ''
  };

  // Validate content before saving
  validateContent(content);

  // Save to Redis
  await redis.set(`${REDIS_KEY_PREFIX}${id}`, JSON.stringify(content));

  return content;
}

/**
 * Retrieve a single dynamic landing page by ID
 */
export async function getDynamicLandingPage(id: string): Promise<DynamicLandingPageContent | undefined> {
  const startTime = Date.now();

  logStoreOperation("getDynamicLandingPage:start", {
    id,
    timestamp: startTime
  });

  try {
    // Validate id
    if (!id) {
      logStoreOperation("getDynamicLandingPage:error", {
        error: "Invalid ID",
        id,
        timestamp: Date.now()
      });
      throw new Error("Invalid ID");
    }

    // Attempt to fetch from Redis
    const redisKey = `${REDIS_KEY_PREFIX}${id}`;
    logStoreOperation("getDynamicLandingPage:fetch", {
      id,
      redisKey,
      timestamp: Date.now()
    });

    const data = await redis.get(redisKey);

    // Log the raw data for debugging
    logStoreOperation("getDynamicLandingPage:raw", {
      id,
      hasData: Boolean(data),
      dataType: typeof data,
      timestamp: Date.now()
    });

    if (!data) {
      logStoreOperation("getDynamicLandingPage:not-found", {
        id,
        timestamp: Date.now()
      });
      return undefined;
    }

    // Parse the data if it's a string
    const content = typeof data === 'string' ? JSON.parse(data) : data;

    // Validate the parsed content
    if (!content || typeof content !== 'object') {
      logStoreOperation("getDynamicLandingPage:invalid-data", {
        id,
        contentType: typeof content,
        timestamp: Date.now()
      });
      throw new Error("Invalid content format");
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

    const missingFields = requiredFields.filter(field => !(field in content));
    if (missingFields.length > 0) {
      logStoreOperation("getDynamicLandingPage:missing-fields", {
        id,
        missingFields,
        timestamp: Date.now()
      });
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    logStoreOperation("getDynamicLandingPage:success", {
      id,
      contentType: typeof content,
      hasRequiredFields: true,
      timestamp: Date.now(),
      totalTime: Date.now() - startTime
    });

    return content as DynamicLandingPageContent;
  } catch (error) {
    logStoreOperation("getDynamicLandingPage:error", {
      error: error instanceof Error ? error.message : 'Unknown error',
      id,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: Date.now(),
      totalTime: Date.now() - startTime
    });
    throw error;
  }
} 