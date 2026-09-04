import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind class lists, resolving conflicts (e.g. `px-2 px-4` -> `px-4`)
 * the way shadcn/ui components expect. Used by every component in
 * `src/components/ui/` so a caller's `className` prop can safely override
 * the component's own defaults.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
