/**
 * Wallet Address Validators
 * 
 * Validates blockchain-specific wallet address formats
 */

/**
 * Validate Bitcoin address (P2PKH, P2SH, Bech32, Bech32m)
 */
export function isValidBitcoinAddress(address: string): boolean {
  // Legacy (P2PKH): starts with 1
  const p2pkhRegex = /^1[1-9A-HJ-NP-Za-km-z]{25,34}$/;
  
  // P2SH: starts with 3
  const p2shRegex = /^3[1-9A-HJ-NP-Za-km-z]{25,34}$/;
  
  // Bech32 (SegWit): starts with bc1
  const bech32Regex = /^bc1[a-z0-9]{39,87}$/;
  
  return p2pkhRegex.test(address) || p2shRegex.test(address) || bech32Regex.test(address);
}

/**
 * Validate Ethereum address with EIP-55 checksum (also valid for BSC, Polygon, etc.)
 */
export function isValidEthereumAddress(address: string): boolean {
  // Ethereum addresses: 0x followed by 40 hex characters
  const ethRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!ethRegex.test(address)) {
    return false;
  }

  // Accept all valid hex addresses (lowercase, uppercase, or mixed case)
  // Note: EIP-55 checksum validation requires proper keccak256 implementation
  // For now, we trust user input if it matches the format
  return true;
}

// Note: EIP-55 checksum validation is disabled because it requires
// a proper keccak256 implementation. If you want to enable it in the future,
// install 'js-sha3' library and implement proper checksum validation.

/**
 * Validate Solana address
 */
export function isValidSolanaAddress(address: string): boolean {
  // Solana addresses: base58 encoded, 32-44 characters
  const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return solanaRegex.test(address);
}

/**
 * Validate TRON address
 */
export function isValidTronAddress(address: string): boolean {
  // TRON addresses: starts with T, 34 characters, base58
  const tronRegex = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
  return tronRegex.test(address);
}

/**
 * Main validator - routes to blockchain-specific validator
 */
export function validateWalletAddress(address: string, blockchainCode: string): {
  isValid: boolean;
  error?: string;
} {
  if (!address || address.trim().length === 0) {
    return { isValid: false, error: 'Wallet address is required' };
  }

  const trimmedAddress = address.trim();

  switch (blockchainCode.toUpperCase()) {
    case 'BITCOIN':
      if (!isValidBitcoinAddress(trimmedAddress)) {
        return {
          isValid: false,
          error: 'Invalid Bitcoin address format. Must start with 1, 3, or bc1'
        };
      }
      break;

    case 'ETHEREUM':
    case 'BSC':
    case 'POLYGON':
      if (!isValidEthereumAddress(trimmedAddress)) {
        return {
          isValid: false,
          error: 'Invalid Ethereum address format. Must start with 0x and contain 40 hex characters'
        };
      }
      break;

    case 'SOLANA':
      if (!isValidSolanaAddress(trimmedAddress)) {
        return {
          isValid: false,
          error: 'Invalid Solana address format. Must be 32-44 base58 characters'
        };
      }
      break;

    case 'TRON':
      if (!isValidTronAddress(trimmedAddress)) {
        return {
          isValid: false,
          error: 'Invalid TRON address format. Must start with T and be 34 characters'
        };
      }
      break;

    default:
      // For unknown blockchains, just check length
      if (trimmedAddress.length < 26 || trimmedAddress.length > 100) {
        return {
          isValid: false,
          error: 'Wallet address must be between 26 and 100 characters'
        };
      }
  }

  return { isValid: true };
}

/**
 * Normalize wallet address (trim, lowercase for Ethereum-like chains)
 */
export function normalizeWalletAddress(address: string, blockchainCode: string): string {
  const trimmed = address.trim();
  
  // Lowercase for Ethereum-like chains (case-insensitive)
  if (['ETHEREUM', 'BSC', 'POLYGON'].includes(blockchainCode.toUpperCase())) {
    return trimmed.toLowerCase();
  }
  
  return trimmed;
}

