import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/utils/cn";

export interface TabItem<T extends string> {
  id: T;
  label: ReactNode;
  icon?: ReactNode;
  count?: number;
}

interface TabsProps<T extends string> {
  items: readonly TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the tab list. */
  label: string;
  /** Used to build tab/panel ids: `${idPrefix}-tab-${id}` and `${idPrefix}-panel`. */
  idPrefix: string;
  className?: string;
  stretch?: boolean;
  size?: "sm" | "md";
}

/** Accessible segmented tabs with roving tabindex + arrow-key navigation. */
export function Tabs<T extends string>({ items, value, onChange, label, idPrefix, className, stretch, size = "md" }: TabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = items.findIndex((item) => item.id === value);
    let next: number;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (index + 1) % items.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = (index - 1 + items.length) % items.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = items.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    onChange(items[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03] p-1 backdrop-blur-sm",
        stretch ? "w-full" : "w-fit",
        className,
      )}
    >
      {items.map((item, i) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${item.id}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={cn(
              "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-tech font-bold uppercase tracking-[0.14em] transition-all duration-300 focus-visible:outline-offset-[-2px]",
              size === "sm" ? "px-3 py-2 text-xs sm:px-3.5" : "px-4 py-2.5 text-sm sm:px-5",
              stretch && "flex-1",
              selected
                ? "bg-blood text-white shadow-[0_0_24px_-4px_rgba(229,9,20,0.75)]"
                : "text-white/55 hover:bg-white/[0.06] hover:text-white",
            )}
          >
            {item.icon}
            {item.label}
            {typeof item.count === "number" && (
              <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] leading-none", selected ? "bg-black/25" : "bg-white/10")}>
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
