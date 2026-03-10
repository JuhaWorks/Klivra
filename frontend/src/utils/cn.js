import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to merge Tailwind classes efficiently
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
