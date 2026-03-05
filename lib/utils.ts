import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(timestamp: number): string {
  return format(new Date(timestamp), "dd MMM yyyy");
}

export function formatDateTime(timestamp: number): string {
  return format(new Date(timestamp), "dd MMM yyyy, HH:mm");
}

export function formatRelativeTime(timestamp: number): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}

export function formatCurrency(amount: number, currency = "RWF"): string {
  return `${currency} ${amount.toLocaleString("en-RW")}`;
}

export function generateId(prefix: string): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");
  return `${prefix}-${year}-${random}`;
}
