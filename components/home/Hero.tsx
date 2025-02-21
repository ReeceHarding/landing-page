"use client";

import { LineText } from "@/components/LineText";
import CTAButton from "@/components/home/CTAButton";
import { cn } from "@/lib/utils";

const Hero = ({
  locale,
  langName,
  CTALocale,
}: {
  locale: any;
  langName: string;
  CTALocale: any;
}) => {
  return (
    <div className="relative overflow-hidden">
      <section
        lang={langName}
        className="relative mx-auto max-w-[1400px] px-6 lg:px-8 pb-16 pt-12 md:pt-16 lg:pt-20 text-center"
      >
        <div className="max-w-[840px] mx-auto">
          <h1 className={cn(
            "text-[2.75rem] font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl",
            "text-slate-900 dark:text-white",
            "leading-[1.1]"
          )}>
            {locale.title1}{" "}
            <span className="relative inline-block">
              <LineText>{locale.title2}</LineText>
              <span className="absolute -inset-1 -skew-y-2 bg-primary/[0.07] rounded-sm" />
            </span>{" "}
            {locale.title3}
          </h1>
        </div>

        <p className={cn(
          "mx-auto mt-6 max-w-2xl",
          "text-lg md:text-xl",
          "text-slate-600 dark:text-slate-300",
          "leading-relaxed",
          "tracking-[-0.01em]"
        )}>
          {locale.description}
        </p>

        <div className="mt-8">
          <CTAButton locale={CTALocale} />
        </div>
      </section>
    </div>
  );
};

export default Hero;
