import logoImg from "@/assets/raw/logo.png";
import { cn } from "@/utils/cn";

interface LogoProps {
  size?: "md" | "lg";
  className?: string;
}

/** Atrocity Gaming Lounge logo: hooded gamer mascot (glowing red eyes + red crown) with sharp wordmark. */
export function Logo({ size = "md", className }: LogoProps) {
  const lg = size === "lg";
  return (
    <span className={cn("group inline-flex items-center gap-2.5 sm:gap-3", className)}>
      <span className="relative shrink-0">
        <span
          aria-hidden="true"
          className="absolute -inset-1 rounded-full bg-blood/50 opacity-50 blur-md transition-opacity duration-300 group-hover:opacity-100"
        />
        <img
          src={logoImg}
          alt="Atrocity Gaming Lounge logo — hooded gamer mascot with glowing red eyes and a red crown"
          width={lg ? 64 : 48}
          height={lg ? 64 : 48}
          decoding="async"
          className={cn(
            "relative rounded-full bg-black object-cover ring-1 ring-blood/60 transition-transform duration-300 group-hover:scale-105",
            lg ? "h-16 w-16" : "h-10 w-10 sm:h-12 sm:w-12",
          )}
        />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display font-black tracking-[0.14em] text-white transition-[text-shadow] duration-300 group-hover:text-glow-sm",
            lg ? "text-2xl" : "text-[15px] sm:text-lg",
          )}
        >
          ATROCITY
        </span>
        <span
          className={cn(
            "mt-1 font-tech font-bold tracking-[0.3em] text-blood-400",
            lg ? "text-xs sm:text-sm" : "text-[9px] sm:text-[10px]",
          )}
        >
          GAMING LOUNGE
        </span>
      </span>
    </span>
  );
}
