import { BUSINESS } from "@/data/site";

export const telHref = `tel:${BUSINESS.phoneE164}`;

export const mailtoHref = `mailto:${BUSINESS.email}`;

export function whatsappHref(text?: string): string {
  return `https://wa.me/${BUSINESS.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(BUSINESS.mapsQuery)}`;

export const mapEmbedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(BUSINESS.mapsQuery)}&z=17&output=embed`;

/** Accepts "+91 98765 43210", "09876543210", "9876543210" … returns 10 digits or null. */
export function normalizeIndianMobile(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/** Smoothly scrolls to a section (respecting reduced motion) and syncs the URL hash. */
export function scrollToId(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  const url = id === "home" ? window.location.pathname + window.location.search : `#${id}`;
  window.history.replaceState(null, "", url);
}
