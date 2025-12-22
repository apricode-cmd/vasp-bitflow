/**
 * Custom error for Virtual IBAN creation timeout
 * Thrown when BCB does not confirm account creation within the expected timeframe
 */
export class VirtualIbanCreationTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VirtualIbanCreationTimeoutError';
    Object.setPrototypeOf(this, VirtualIbanCreationTimeoutError.prototype);
  }
}

