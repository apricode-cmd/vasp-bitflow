/**
 * Wallet Address Validator Service
 * 
 * Validates cryptocurrency wallet addresses
 */

class WalletValidatorService {
  /**
   * Validate Bitcoin address
   */
  validateBtcAddress(address: string): boolean {
    // P2PKH (starts with 1)
    const p2pkhRegex = /^[1][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
    // P2SH (starts with 3)
    const p2shRegex = /^[3][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
    // Bech32 (starts with bc1)
    const bech32Regex = /^(bc1)[a-z0-9]{39,87}$/;

    return p2pkhRegex.test(address) || p2shRegex.test(address) || bech32Regex.test(address);
  }

  /**
   * Validate Ethereum address
   */
  validateEthAddress(address: string): boolean {
    // Ethereum address: 0x followed by 40 hex characters
    const ethRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethRegex.test(address);
  }

  /**
   * Validate Solana address
   */
  validateSolAddress(address: string): boolean {
    // Solana address: base58 string, 32-44 characters
    const solRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return solRegex.test(address);
  }

  /**
   * Validate USDT address (ERC-20, same as ETH)
   */
  validateUsdtAddress(address: string, blockchain: string): boolean {
    // USDT can be on different blockchains
    if (blockchain === 'ETHEREUM' || blockchain === 'BSC' || blockchain === 'POLYGON') {
      return this.validateEthAddress(address);
    }
    // TRC-20 USDT on Tron
    if (blockchain === 'TRON') {
      const tronRegex = /^T[a-zA-Z0-9]{33}$/;
      return tronRegex.test(address);
    }
    return false;
  }

  /**
   * Validate wallet address based on currency and blockchain
   */
  validateAddress(address: string, currencyCode: string, blockchainCode: string): {
    valid: boolean;
    error?: string;
  } {
    if (!address || address.trim() === '') {
      return { valid: false, error: 'Address is required' };
    }

    try {
      let isValid = false;

      switch (currencyCode.toUpperCase()) {
        case 'BTC':
          isValid = this.validateBtcAddress(address);
          break;

        case 'ETH':
          isValid = this.validateEthAddress(address);
          break;

        case 'SOL':
          isValid = this.validateSolAddress(address);
          break;

        case 'USDT':
          isValid = this.validateUsdtAddress(address, blockchainCode);
          break;

        case 'BNB':
        case 'MATIC':
          // BNB and MATIC use same format as ETH
          isValid = this.validateEthAddress(address);
          break;

        default:
          return {
            valid: false,
            error: `Validation not implemented for ${currencyCode}`
          };
      }

      if (!isValid) {
        return {
          valid: false,
          error: `Invalid ${currencyCode} address format for ${blockchainCode} blockchain`
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: 'Address validation failed'
      };
    }
  }

  /**
   * Get address format description for a currency
   */
  getAddressFormat(currencyCode: string, blockchainCode: string): string {
    switch (currencyCode.toUpperCase()) {
      case 'BTC':
        return 'Bitcoin address (starts with 1, 3, or bc1)';
      
      case 'ETH':
        return 'Ethereum address (0x followed by 40 hexadecimal characters)';
      
      case 'SOL':
        return 'Solana address (base58 encoded, 32-44 characters)';
      
      case 'USDT':
        if (blockchainCode === 'ETHEREUM') {
          return 'ERC-20 USDT address (Ethereum format)';
        } else if (blockchainCode === 'TRON') {
          return 'TRC-20 USDT address (starts with T)';
        }
        return 'USDT address';
      
      case 'BNB':
        return 'BNB address (Binance Smart Chain format)';
      
      case 'MATIC':
        return 'MATIC address (Polygon format)';
      
      default:
        return `${currencyCode} address`;
    }
  }
}

// Export singleton instance
export const walletValidatorService = new WalletValidatorService();






