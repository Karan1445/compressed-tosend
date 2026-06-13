import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import '../index.css'
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
