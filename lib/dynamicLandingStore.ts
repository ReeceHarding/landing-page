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

  // Add content completeness logging
  if (details?.contentCompleteness) {
    console.log('Content Completeness:', details.contentCompleteness);
  }
}

function validateContentCompleteness(content: DynamicLandingPageContent) {
  return {
    hero: {
      title: content.heroTitle?.length > 0,
      description: Boolean(content.heroDescription),
    },
    features: {
      title: Boolean(content.featuresTitle),
      count: content.features?.length || 0,
      complete: content.features?.every(f => f.title && f.content && f.icon),
    },
    pricing: {
      title: Boolean(content.pricingTitle),
      description: Boolean(content.pricingDescription),
      tiersCount: content.pricingTiers?.length || 0,
      complete: content.pricingTiers?.every(p => p.name && p.price && p.description && p.features?.length > 0),
    },
    testimonials: {
      title: Boolean(content.testimonialsTitle),
      count: content.testimonials?.length || 0,
      complete: content.testimonials?.every(t => t.name && t.role && t.content),
    },
    faqs: {
      title: Boolean(content.faqTitle),
      count: content.faqs?.length || 0,
      complete: content.faqs?.every(f => f.question && f.answer),
    },
    cta: {
      title: Boolean(content.ctaTitle),
      description: Boolean(content.ctaDescription),
    },
  };
}

/**
 * Create a new dynamic landing page record
 */
export async function createDynamicLandingPage(payload: Omit<DynamicLandingPageContent, "id">): Promise<DynamicLandingPageContent> {
  const startTime = Date.now();
  const id = uuidv4();

  // Validate required fields first
  const validationDetails = {
    hasHeroTitle: Boolean(payload.heroTitle),
    heroTitleIsArray: Array.isArray(payload.heroTitle),
    heroTitleLength: Array.isArray(payload.heroTitle) ? payload.heroTitle.length : 0,
    hasHeroDescription: Boolean(payload.heroDescription),
    heroDescriptionLength: payload.heroDescription?.length || 0,
    allFieldsPresent: Boolean(
      payload.heroTitle &&
      payload.heroDescription &&
      payload.featuresTitle &&
      payload.features &&
      payload.pricingTitle &&
      payload.pricingDescription &&
      payload.pricingTiers &&
      payload.testimonialsTitle &&
      payload.testimonials &&
      payload.faqTitle &&
      payload.faqs &&
      payload.ctaTitle &&
      payload.ctaDescription
    )
  };

  logStoreOperation("createDynamicLandingPage:validation", {
    id,
    ...validationDetails,
    timestamp: Date.now()
  });

  const record: DynamicLandingPageContent = { id, ...payload };

  logStoreOperation("createDynamicLandingPage:init", {
    id,
    payloadKeys: Object.keys(payload),
    payloadHeroTitle: payload.heroTitle,
    payloadHeroTitleType: typeof payload.heroTitle,
    payloadHeroDescription: payload.heroDescription,
    hasRequiredFields: Boolean(payload.heroTitle && payload.heroDescription &&
      Array.isArray(payload.heroTitle) && payload.heroTitle.length === 3),
    validationDetails,
    contentSizes: {
      heroTitle: JSON.stringify(payload.heroTitle).length,
      heroDescription: payload.heroDescription?.length || 0,
      features: payload.features?.length || 0,
      pricingTiers: payload.pricingTiers?.length || 0,
      testimonials: payload.testimonials?.length || 0,
      faqs: payload.faqs?.length || 0
    },
    timestamp: Date.now()
  });

  try {
    // Validate heroTitle is an array before storing
    if (!Array.isArray(payload.heroTitle)) {
      logStoreOperation("createDynamicLandingPage:validation-error", {
        id,
        error: "heroTitle must be an array",
        receivedType: typeof payload.heroTitle,
        receivedValue: payload.heroTitle,
        validationTime: Date.now() - startTime
      });
      throw new Error("heroTitle must be an array");
    }

    // Validate heroTitle length
    if (payload.heroTitle.length !== 3) {
      logStoreOperation("createDynamicLandingPage:validation-error", {
        id,
        error: "heroTitle must have exactly 3 items",
        receivedLength: payload.heroTitle.length,
        receivedValue: payload.heroTitle,
        validationTime: Date.now() - startTime
      });
      throw new Error("heroTitle must have exactly 3 items");
    }

    // Validate heroDescription
    if (!payload.heroDescription?.trim()) {
      logStoreOperation("createDynamicLandingPage:validation-error", {
        id,
        error: "heroDescription is required",
        receivedValue: payload.heroDescription,
        validationTime: Date.now() - startTime
      });
      throw new Error("heroDescription is required");
    }

    // Pre-serialization validation
    logStoreOperation("createDynamicLandingPage:pre-serialize", {
      id,
      recordType: typeof record,
      recordKeys: Object.keys(record),
      recordSize: JSON.stringify(record).length,
      recordValidation: {
        heroTitle: record.heroTitle,
        heroTitleLength: record.heroTitle.length,
        heroDescription: record.heroDescription,
        hasRequiredFields: Boolean(record.heroTitle && record.heroDescription)
      },
      serializationTime: Date.now() - startTime
    });

    // Explicitly stringify the record for Redis storage
    const serializedRecord = JSON.stringify(record);

    logStoreOperation("createDynamicLandingPage:pre-store", {
      id,
      redisKey: `${REDIS_KEY_PREFIX}${id}`,
      serializedRecordPreview: serializedRecord.slice(0, 100) + '...',
      recordType: typeof record,
      serializedType: typeof serializedRecord,
      recordHeroTitle: record.heroTitle,
      recordHeroTitleType: typeof record.heroTitle,
      serializedSize: serializedRecord.length,
      compressionRatio: serializedRecord.length / JSON.stringify(record).length
    });

    // Store in Redis with expiration
    const storeStartTime = Date.now();
    await redis.set(
      `${REDIS_KEY_PREFIX}${id}`,
      serializedRecord,
      {
        ex: 60 * 60 * 24 * 30 // 30 days expiry
      }
    );
    const storeEndTime = Date.now();

    logStoreOperation("createDynamicLandingPage:store-complete", {
      id,
      storeTime: storeEndTime - storeStartTime,
      totalTime: storeEndTime - startTime
    });

    // Verify the data was stored correctly
    const verificationStartTime = Date.now();
    const verificationRead = await redis.get(`${REDIS_KEY_PREFIX}${id}`);
    const parsedVerification = verificationRead ?
      (typeof verificationRead === 'string' ? JSON.parse(verificationRead) : verificationRead)
      : null;

    logStoreOperation("createDynamicLandingPage:verify", {
      id,
      stored: Boolean(verificationRead),
      verifiedDataType: typeof verificationRead,
      verifiedHeroTitle: parsedVerification?.heroTitle,
      verifiedHeroTitleType: parsedVerification ? typeof parsedVerification.heroTitle : 'N/A',
      verifiedDataPreview: verificationRead ?
        (typeof verificationRead === 'string' ? verificationRead.slice(0, 100) : JSON.stringify(verificationRead).slice(0, 100)) + '...' : null,
      matches: verificationRead === serializedRecord,
      matchReason: verificationRead === serializedRecord ? 'exact' :
        !verificationRead ? 'no_data' :
          typeof verificationRead !== typeof serializedRecord ? 'type_mismatch' :
            'content_mismatch',
      verificationTime: Date.now() - verificationStartTime,
      totalTime: Date.now() - startTime
    });

    return record;
  } catch (err) {
    logStoreOperation("createDynamicLandingPage:error", {
      error: err instanceof Error ? err.message : 'Unknown error',
      id,
      stack: err instanceof Error ? err.stack : undefined,
      context: {
        timestamp: Date.now(),
        totalTime: Date.now() - startTime,
        memoryUsage: process.memoryUsage(),
        errorType: err?.constructor?.name
      }
    });
    throw err;
  }
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

    // Log the raw data structure
    logStoreOperation("getDynamicLandingPage:raw", {
      id,
      hasData: Boolean(data),
      dataType: typeof data,
      contentStructure: data ? {
        hasHeroTitle: Boolean(data.heroTitle),
        heroTitleType: typeof data.heroTitle,
        heroTitleIsArray: Array.isArray(data.heroTitle),
        hasFeatures: Boolean(data.features),
        featuresCount: Array.isArray(data.features) ? data.features.length : 0,
        hasPricingTiers: Boolean(data.pricingTiers),
        pricingTiersCount: Array.isArray(data.pricingTiers) ? data.pricingTiers.length : 0,
        hasTestimonials: Boolean(data.testimonials),
        testimonialsCount: Array.isArray(data.testimonials) ? data.testimonials.length : 0,
        hasFaqs: Boolean(data.faqs),
        faqsCount: Array.isArray(data.faqs) ? data.faqs.length : 0
      } : null,
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

    // Add detailed content validation
    const contentValidation = {
      heroSection: {
        hasTitle: Boolean(content.heroTitle),
        titleIsArray: Array.isArray(content.heroTitle),
        titleLength: Array.isArray(content.heroTitle) ? content.heroTitle.length : 0,
        hasDescription: Boolean(content.heroDescription)
      },
      features: {
        hasTitle: Boolean(content.featuresTitle),
        hasFeatures: Boolean(content.features),
        featuresCount: Array.isArray(content.features) ? content.features.length : 0,
        featuresValid: Array.isArray(content.features) && content.features.every((f: { title: string; content: string; icon: string }) =>
          f.title && typeof f.title === 'string' &&
          f.content && typeof f.content === 'string' &&
          f.icon && typeof f.icon === 'string'
        )
      },
      pricing: {
        hasTitle: Boolean(content.pricingTitle),
        hasDescription: Boolean(content.pricingDescription),
        hasTiers: Boolean(content.pricingTiers),
        tiersCount: Array.isArray(content.pricingTiers) ? content.pricingTiers.length : 0
      },
      testimonials: {
        hasTitle: Boolean(content.testimonialsTitle),
        hasTestimonials: Boolean(content.testimonials),
        count: Array.isArray(content.testimonials) ? content.testimonials.length : 0
      },
      faqs: {
        hasTitle: Boolean(content.faqTitle),
        hasFaqs: Boolean(content.faqs),
        count: Array.isArray(content.faqs) ? content.faqs.length : 0
      }
    };

    logStoreOperation("getDynamicLandingPage:validation", {
      id,
      contentValidation,
      timestamp: Date.now()
    });

    // Add content completeness check
    const completeness = validateContentCompleteness(content);
    logStoreOperation("getDynamicLandingPage:completeness", {
      id,
      contentCompleteness: completeness,
      timestamp: Date.now()
    });

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