/**
 * Utility Functions
 * 
 * Common utility functions used throughout the application.
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS classes with clsx and tailwind-merge
 * Handles conditional classes and resolves conflicts
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Delays execution for a specified time (for testing/development)
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sanitizes string input by trimming and removing dangerous characters
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, maxLength);
}

/**
 * Generates a random alphanumeric string
 */
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Checks if code is running on the server
 */
export function isServer(): boolean {
  return typeof window === 'undefined';
}

/**
 * Checks if code is running on the client
 */
export function isClient(): boolean {
  return typeof window !== 'undefined';
}

