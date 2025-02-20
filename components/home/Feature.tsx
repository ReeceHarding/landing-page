"use client";

import { ALL_FEATURES } from "@/config/feature";
import { cn } from "@/lib/utils";
import React from "react";

const Feature = ({
  id,
  locale,
  langName,
}: {
  id: string;
  locale: any;
  langName: string;
}) => {
  const FEATURES = ALL_FEATURES[`FEATURES_${langName.toUpperCase()}`];

  return (
    <section
      id={id}
      className="relative py-24 sm:py-32 border-y border-slate-200 dark:border-slate-800"
    >
      <div className="relative mx-auto max-w-[1400px] px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-20">
          <h2 className={cn(
            "text-3xl font-bold tracking-tight sm:text-4xl mb-4",
            "text-slate-900 dark:text-white",
            "leading-[1.2]"
          )}>
            {locale.title}
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 tracking-[-0.01em]">
            {locale.description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 lg:gap-x-12">
          {FEATURES?.map((feature) => (
            <div
              key={feature.title}
              className={cn(
                "relative group",
                "rounded-2xl p-8",
                "bg-white dark:bg-slate-800",
                "border border-slate-200 dark:border-slate-700",
                "transition-all duration-200",
                "hover:border-slate-300 dark:hover:border-slate-600",
                "hover:shadow-lg"
              )}
            >
              <div>
                <div className={cn(
                  "p-3.5 w-14 h-14 rounded-xl mb-6",
                  "bg-slate-50 dark:bg-slate-700",
                  "border border-slate-200 dark:border-slate-600",
                  "flex items-center justify-center",
                  "transition duration-200",
                  "group-hover:border-slate-300 dark:group-hover:border-slate-500"
                )}>
                  {feature.icon && typeof feature.icon === "string" ? (
                    <span className="text-xl text-primary">{feature.icon}</span>
                  ) : (
                    React.createElement(feature.icon, {
                      className: "w-6 h-6 text-primary"
                    })
                  )}
                </div>
                <h3 className="text-lg font-semibold mb-3 text-slate-900 dark:text-white tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed tracking-[-0.01em]">
                  {feature.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Feature;
