import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
