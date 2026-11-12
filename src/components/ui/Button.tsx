import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

import { cn } from "@/utils/cn";
import StarBorder from "@/components/StarBorder";

type Variant = "primary" | "outline" | "ghost" | "dark";
type Size = "sm" | "md" | "lg";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  starBorder?: boolean;
}

type ButtonAsButton = CommonProps &
  Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "className" | "children"
  > & {
    href?: undefined;
  };

type ButtonAsAnchor = CommonProps &
  Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    "className" | "children"
  > & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

const base =
  "group/btn relative isolate inline-flex select-none items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-lg font-tech font-bold uppercase tracking-[0.14em] transition-all duration-300 ease-out hover:scale-[1.04] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blood-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-[1.15em] [&_svg]:shrink-0";

const variants: Record<Variant, string> = {
  primary:
    "bg-blood text-white shadow-[0_0_0_1px_rgba(255,59,69,0.5),0_10px_30px_-8px_rgba(229,9,20,0.8)] hover:bg-[#ff1724] hover:shadow-[0_0_0_1px_rgba(255,107,115,0.85),0_0_38px_rgba(229,9,20,0.75)]",

  outline:
    "border border-white/20 bg-white/[0.04] text-white backdrop-blur-sm hover:border-blood hover:bg-blood/10 hover:shadow-[0_0_28px_-6px_rgba(229,9,20,0.7)]",

  ghost:
    "text-white/75 hover:bg-white/[0.06] hover:text-white",

  dark:
    "border border-white/10 bg-black/60 text-white hover:border-blood/70 hover:shadow-[0_0_24px_-6px_rgba(229,9,20,0.6)]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-[15px] sm:text-base",
};

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    className,
    children,
    starBorder = false,
    href,
    ...rest
  } = props;

  const classes = cn(
    base,
    variants[variant],
    sizes[size],
    className,
  );

  const content = (
    <>
      {variant === "primary" && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -left-3/4 -z-10 w-1/2 -skew-x-12 bg-linear-to-r from-transparent via-white/35 to-transparent transition-[left] duration-700 ease-out group-hover/btn:left-[130%]"
        />
      )}

      {children}
    </>
  );

  const borderOverlay = starBorder ? (
    <StarBorder
      as="span"
      color="#ff4d57"
      trailColor="#990008"
      duration={3.5}
      thickness={1.5}
      radius={8}
      trailLength={0.3}
      stars={1}
      glow={0.7}
      direction="clockwise"
      hover="lap"
      clickPulse
      theme="dark"
      backgroundColor="transparent"
      className="star-border-overlay"
    />
  ) : null;

  // Anchor version
  if (typeof href === "string") {
    const anchorProps = rest as Omit<
      ButtonAsAnchor,
      keyof CommonProps | "href"
    >;

    return (
      <a
        href={href}
        className={classes}
        {...anchorProps}
      >
        {content}
        {borderOverlay}
      </a>
    );
  }

  // Native button version
  const buttonProps = rest as Omit<
    ButtonAsButton,
    keyof CommonProps | "href"
  >;

  const { type = "button", ...nativeProps } = buttonProps;

  return (
    <button
      type={type}
      className={classes}
      {...nativeProps}
    >
      {content}
      {borderOverlay}
    </button>
  );
}