import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Language } from "@/store/settings-store"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Consistent 3-decimal formatting for calculated electrical values
 * (current, voltage drop, impedance, Iz, etc.), used everywhere they're
 * displayed: the canvas labels, the properties sidebar, and the PDF export.
 */
export function formatCalc(value: number): string {
  return value.toFixed(3);
}

/**
 * Locale-aware formatting for continuous calculated values (voltage drop,
 * required cross-section, etc.): a fixed number of decimals, with a comma as
 * the decimal separator in Hungarian and a dot in English.
 */
export function formatLocaleNumber(
  value: number,
  language: Language,
  decimals = 2,
): string {
  const text = value.toFixed(decimals);
  return language === "hu" ? text.replace(".", ",") : text;
}

/**
 * Formats a standard cable size (from the fixed cross-section list, or a
 * user-chosen value) without padding with zeros: whole numbers show with no
 * decimals, fractional ones (e.g. 1.5) keep just what they need.
 */
export function formatStandardSize(value: number, language: Language): string {
  const text = value.toFixed(2).replace(/\.?0+$/, "");
  return language === "hu" ? text.replace(".", ",") : text;
}
