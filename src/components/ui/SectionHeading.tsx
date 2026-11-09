import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface SectionHeadingProps {
  id?: string;
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "center" | "left";
  className?: string;
}

export function SectionHeading({ id, eyebrow, title, description, align = "center", className }: SectionHeadingProps) {
  const center = align === "center";
  return (
    <div className={cn("max-w-3xl", center && "mx-auto text-center", className)}>
      <p
        className={cn(
          "flex items-center gap-3 font-tech text-sm font-bold uppercase tracking-[0.34em] text-blood-400",
          center && "justify-center",
        )}
      >
        <span aria-hidden="true" className="h-px w-8 bg-linear-to-r from-transparent to-blood" />
        {eyebrow}
        {center && <span aria-hidden="true" className="h-px w-8 bg-linear-to-l from-transparent to-blood" />}
      </p>
      <h2
        id={id}
        className="mt-4 font-display text-[1.85rem] font-black uppercase leading-[1.08] tracking-tight sm:text-4xl lg:text-5xl"
      >
        {title}
      </h2>
      {description && <p className="mt-5 text-base leading-relaxed text-white/60 sm:text-lg">{description}</p>}
    </div>
  );
}
