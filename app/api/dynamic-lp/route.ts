import { createDynamicLandingPage, DynamicLandingPageContent } from "@/lib/dynamicLandingStore";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/dynamic-lp
 * Accepts JSON with dynamic fields and returns an ID
 */
export async function POST(req: NextRequest) {
  try {
    const data: Omit<DynamicLandingPageContent, "id"> = await req.json();

    /**
     * In a real production environment, you'd validate data here.
     * We'll assume the data is well-formed for demonstration.
     */
    const newRecord = createDynamicLandingPage({
      logoUrl: data.logoUrl ?? null,
      heroTitle: data.heroTitle ?? ["Build", "Test", "Ship"],
      heroDescription: data.heroDescription ?? "Your product description here...",
      featuresTitle: data.featuresTitle ?? "Features",
      features: data.features ?? [],
      pricingTitle: data.pricingTitle ?? "Pricing",
      pricingDescription: data.pricingDescription ?? "We offer flexible plans...",
      pricingTiers: data.pricingTiers ?? [],
      testimonialsTitle: data.testimonialsTitle ?? "Testimonials",
      testimonials: data.testimonials ?? [],
      faqTitle: data.faqTitle ?? "FAQ",
      faqs: data.faqs ?? [],
      ctaTitle: data.ctaTitle ?? "Call To Action",
      ctaDescription: data.ctaDescription ?? "Sign up now!"
    });

    return NextResponse.json({ success: true, id: newRecord.id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
} 