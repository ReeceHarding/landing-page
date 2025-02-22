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
  const requestId = Math.random().toString(36).substring(7);

  logStoreOperation("getDynamicLandingPage:init", {
    id,
    requestId,
    timestamp: startTime,
    redisKey: `${REDIS_KEY_PREFIX}${id}`,
    environment: typeof window === 'undefined' ? 'server' : 'client'
  });

  try {
    const fetchStartTime = Date.now();
    const redisKey = `${REDIS_KEY_PREFIX}${id}`;

    logStoreOperation("getDynamicLandingPage:pre-fetch", {
      id,
      requestId,
      redisKey,
      timeSinceStart: Date.now() - startTime
    });

    const rawData = await redis.get(redisKey);
    const fetchEndTime = Date.now();

    // Log raw Redis response
    logStoreOperation("getDynamicLandingPage:redis-response", {
      id,
      requestId,
      hasData: Boolean(rawData),
      dataType: typeof rawData,
      responseTime: fetchEndTime - fetchStartTime,
      rawDataPreview: rawData ?
        (typeof rawData === 'string' ? rawData.slice(0, 100) : JSON.stringify(rawData).slice(0, 100)) + '...'
        : null
    });

    // Enhanced raw data validation
    const rawDataValidation = {
      hasData: Boolean(rawData),
      rawDataType: typeof rawData,
      rawDataIsArray: Array.isArray(rawData),
      rawDataSize: rawData ? (typeof rawData === 'string' ? rawData.length : JSON.stringify(rawData).length) : 0,
      rawHeroTitle: rawData && typeof rawData === 'object' ? (rawData as DynamicLandingPageContent).heroTitle : undefined,
      rawHeroTitleType: rawData && typeof rawData === 'object' ? typeof (rawData as DynamicLandingPageContent).heroTitle : 'N/A',
      rawHeroDescription: rawData && typeof rawData === 'object' ? (rawData as DynamicLandingPageContent).heroDescription : undefined,
      isValidStructure: rawData && typeof rawData === 'object' &&
        Array.isArray((rawData as DynamicLandingPageContent).heroTitle) &&
        typeof (rawData as DynamicLandingPageContent).heroDescription === 'string'
    };

    logStoreOperation("getDynamicLandingPage:raw-data", {
      id,
      fetchTime: fetchEndTime - fetchStartTime,
      ...rawDataValidation,
      rawDataPreview: rawData ?
        (typeof rawData === 'string' ? rawData.slice(0, 100) : JSON.stringify(rawData).slice(0, 100)) + '...' : null
    });

    if (!rawData) {
      logStoreOperation("getDynamicLandingPage:notFound", {
        id,
        totalTime: Date.now() - startTime
      });
      return undefined;
    }

    // Ensure we're working with a string before processing
    const dataToProcess = typeof rawData === 'string'
      ? rawData
      : JSON.stringify(rawData);

    // Validate JSON structure before parsing
    let isValidJson = false;
    let preParseValidation = null;
    try {
      const testParse = JSON.parse(dataToProcess);
      isValidJson = true;
      preParseValidation = {
        hasHeroTitle: Boolean(testParse.heroTitle),
        heroTitleIsArray: Array.isArray(testParse.heroTitle),
        heroTitleLength: Array.isArray(testParse.heroTitle) ? testParse.heroTitle.length : 0,
        hasHeroDescription: Boolean(testParse.heroDescription),
        heroDescriptionType: typeof testParse.heroDescription
      };
    } catch (e) {
      isValidJson = false;
    }

    logStoreOperation("getDynamicLandingPage:pre-parse", {
      id,
      processedDataType: typeof dataToProcess,
      processedDataLength: dataToProcess.length,
      processedDataPreview: dataToProcess.slice(0, 100) + '...',
      processingTime: Date.now() - startTime,
      isValidJson,
      preParseValidation
    });

    try {
      const parseStartTime = Date.now();
      const record = JSON.parse(dataToProcess) as DynamicLandingPageContent;
      const parseEndTime = Date.now();

      // Validate the parsed record
      const recordValidation = {
        recordType: typeof record,
        heroTitleType: typeof record.heroTitle,
        heroTitleIsArray: Array.isArray(record.heroTitle),
        heroTitleLength: record.heroTitle?.length,
        heroTitleValues: record.heroTitle,
        hasHeroDescription: Boolean(record.heroDescription),
        heroDescriptionLength: record.heroDescription?.length || 0,
        hasRequiredFields: Boolean(record.heroTitle && record.heroDescription &&
          Array.isArray(record.heroTitle) && record.heroTitle.length === 3),
        contentSizes: {
          heroTitle: JSON.stringify(record.heroTitle).length,
          heroDescription: record.heroDescription?.length || 0,
          features: record.features?.length || 0,
          pricingTiers: record.pricingTiers?.length || 0,
          testimonials: record.testimonials?.length || 0,
          faqs: record.faqs?.length || 0
        }
      };

      logStoreOperation("getDynamicLandingPage:success", {
        id,
        parseTime: parseEndTime - parseStartTime,
        totalTime: parseEndTime - startTime,
        ...recordValidation
      });

      // Ensure the record meets our requirements
      if (!recordValidation.hasRequiredFields) {
        logStoreOperation("getDynamicLandingPage:validation-error", {
          id,
          error: "Retrieved record does not meet requirements",
          validation: recordValidation
        });
        return undefined;
      }

      return record;
    } catch (parseError) {
      logStoreOperation("getDynamicLandingPage:parse-error", {
        id,
        error: parseError instanceof Error ? parseError.message : 'Unknown parse error',
        dataToProcess: dataToProcess.slice(0, 100) + '...',
        parseTime: Date.now() - startTime
      });
      throw parseError;
    }
  } catch (err) {
    logStoreOperation("getDynamicLandingPage:error", {
      error: err instanceof Error ? err.message : 'Unknown error',
      id,
      stack: err instanceof Error ? err.stack : undefined,
      totalTime: Date.now() - startTime
    });
    return undefined;
  }
} 