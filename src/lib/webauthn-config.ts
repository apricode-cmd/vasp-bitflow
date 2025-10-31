/**
 * WebAuthn Configuration
 * 
 * Client-side configuration for Passkeys
 */

/**
 * Get RP ID based on current hostname
 * 
 * For localhost/127.0.0.1 → returns "localhost"
 * For production → returns domain without port
 */
export function getRPID(): string {
  if (typeof window === 'undefined') {
    return 'localhost';
  }

  const hostname = window.location.hostname;
  
  // localhost or 127.0.0.1 → use "localhost"
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'localhost';
  }

  // Production domain
  return hostname;
}

/**
 * Get origin (protocol + hostname + port)
 */
export function getOrigin(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:3000';
  }

  return window.location.origin;
}
