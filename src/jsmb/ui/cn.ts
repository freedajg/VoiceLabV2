import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Local class merger for the JSMB prototype.
 *
 * Deliberately NOT imported from `src/lib/utils` — that file belongs to the
 * VoiceLab app that shares this repo, and the two must stay independent.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
