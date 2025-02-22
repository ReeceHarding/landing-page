import { ThemeProvider } from "@/components/ThemeProvider";
import { siteConfig } from "@/config/site";
import { getDynamicLandingPage } from "@/lib/dynamicLandingStore";
import { Analytics } from "@vercel/analytics/react";
import { Inter as FontSans } from "next/font/google";
import React from "react";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

function logDynamicPage(operation: string, details: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🎨 DynamicPage: ${operation}`);
  console.log('├─ Details:', details);
  console.log('└─ Environment:', typeof window === 'undefined' ? 'server' : 'client');
}

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

export default function DynamicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={fontSans.variable}>
      <ThemeProvider
        attribute="class"
        defaultTheme={siteConfig.nextThemeColor}
        enableSystem
      >
        {children}
        <Analytics />
      </ThemeProvider>
    </div>
  );
} 