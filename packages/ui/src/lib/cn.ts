import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** clsx + tailwind-merge: 조건부 클래스 결합 + Tailwind 충돌 해소(뒤 클래스 우선). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
