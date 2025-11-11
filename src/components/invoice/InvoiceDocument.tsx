/**
 * Invoice PDF Document Component
 * 
 * Generates professional PDF invoices using @react-pdf/renderer
 * Includes company info, customer details, order breakdown, and payment instructions
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font
} from '@react-pdf/renderer';

// Register fonts (optional - for better typography)
// Font.register({
//   family: 'Inter',
//   src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2'
// });

// Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1f2937',
  },
  
  // Header
  header: {
    marginBottom: 30,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#111827',
  },
  companyDetails: {
    fontSize: 9,
    lineHeight: 1.4,
    color: '#6b7280',
  },
  invoiceTitle: {
    textAlign: 'right',
  },
  invoiceTitleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 11,
    color: '#6b7280',
  },
  invoiceDate: {
    fontSize: 9,
    color: '#9ca3af',
    marginTop: 2,
  },
  
  // Parties section
  parties: {
    flexDirection: 'row',
    marginBottom: 30,
    gap: 20,
  },
  party: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  partyLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#6b7280',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  partyName: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#111827',
  },
  partyDetails: {
    fontSize: 9,
    lineHeight: 1.4,
    color: '#4b5563',
  },
  
  // Invoice details table
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 10,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    fontWeight: 'bold',
    fontSize: 9,
    textTransform: 'uppercase',
    color: '#374151',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 10,
    fontSize: 10,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  col1: { flex: 3 },
  col2: { flex: 2, textAlign: 'right' },
  col3: { flex: 2, textAlign: 'right' },
  col4: { flex: 2, textAlign: 'right' },
  
  // Totals
  totalsSection: {
    marginTop: 20,
    marginBottom: 30,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
    paddingRight: 10,
  },
  totalLabel: {
    width: 150,
    textAlign: 'right',
    fontSize: 10,
    color: '#6b7280',
  },
  totalValue: {
    width: 120,
    textAlign: 'right',
    fontSize: 10,
    color: '#111827',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 12,
    paddingRight: 10,
    borderTopWidth: 2,
    borderTopColor: '#d1d5db',
    marginTop: 8,
  },
  grandTotalLabel: {
    width: 150,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
  },
  grandTotalValue: {
    width: 120,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
  },
  
  // Payment instructions
  paymentSection: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#eff6ff',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  paymentTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1e40af',
  },
  paymentDetails: {
    fontSize: 9,
    lineHeight: 1.6,
    color: '#1e3a8a',
  },
  paymentRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  paymentLabel: {
    width: 120,
    fontWeight: 'bold',
  },
  paymentValue: {
    flex: 1,
  },
  
  // Wallet section
  walletSection: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#f0fdf4',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  walletTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#065f46',
  },
  walletAddress: {
    fontSize: 8,
    fontFamily: 'Courier',
    color: '#064e3b',
    backgroundColor: '#dcfce7',
    padding: 8,
    borderRadius: 3,
    wordBreak: 'break-all',
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 1.4,
  },
  
  // Notes
  notes: {
    marginBottom: 30,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#92400e',
  },
  notesText: {
    fontSize: 8,
    lineHeight: 1.5,
    color: '#78350f',
  },
});

// Types
export interface InvoiceData {
  // Order info
  orderId: string;
  orderDate: string;
  status: string;
  
  // Company info (from SystemSettings)
  companyLegalName: string;
  companyRegistrationNumber?: string;
  companyTaxNumber?: string;
  companyLicenseNumber?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  
  // Customer info
  customerName: string;
  customerEmail: string;
  customerAddress?: string;
  customerCountry?: string;
  
  // Order details
  cryptoCurrency: string;
  cryptoAmount: number;
  fiatCurrency: string;
  exchangeRate: number;
  subtotal: number;
  platformFee: number;
  platformFeePercent: number;
  totalAmount: number;
  
  // Payment info
  bankName?: string;
  accountHolder?: string;
  iban?: string;
  swift?: string;
  paymentReference: string;
  
  // Wallet info
  walletAddress: string;
  blockchainNetwork?: string;
}

/**
 * Invoice PDF Document Component
 */
export const InvoiceDocument: React.FC<{ data: InvoiceData }> = ({ data }) => {
  // Format currency
  const formatFiat = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.fiatCurrency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatCrypto = (amount: number): string => {
    return `${amount.toFixed(8)} ${data.cryptoCurrency}`;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            {/* Company Info */}
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{data.companyLegalName}</Text>
              <View style={styles.companyDetails}>
                {data.companyRegistrationNumber && (
                  <Text>{data.companyRegistrationNumber}</Text>
                )}
                {data.companyTaxNumber && (
                  <Text>{data.companyTaxNumber}</Text>
                )}
                {data.companyLicenseNumber && (
                  <Text>License: {data.companyLicenseNumber}</Text>
                )}
                {data.companyAddress && (
                  <Text>{data.companyAddress}</Text>
                )}
                {data.companyPhone && (
                  <Text>Tel: {data.companyPhone}</Text>
                )}
                {data.companyEmail && (
                  <Text>Email: {data.companyEmail}</Text>
                )}
                {data.companyWebsite && (
                  <Text>{data.companyWebsite}</Text>
                )}
              </View>
            </View>
            
            {/* Invoice Title */}
            <View style={styles.invoiceTitle}>
              <Text style={styles.invoiceTitleText}>INVOICE</Text>
              <Text style={styles.invoiceNumber}>#{data.orderId}</Text>
              <Text style={styles.invoiceDate}>
                Date: {new Date(data.orderDate).toLocaleDateString('en-GB')}
              </Text>
            </View>
          </View>
        </View>

        {/* Parties (From / To) */}
        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.partyLabel}>From (Service Provider)</Text>
            <Text style={styles.partyName}>{data.companyLegalName}</Text>
            <View style={styles.partyDetails}>
              {data.companyAddress && <Text>{data.companyAddress}</Text>}
              {data.companyEmail && <Text>{data.companyEmail}</Text>}
            </View>
          </View>
          
          <View style={styles.party}>
            <Text style={styles.partyLabel}>To (Customer)</Text>
            <Text style={styles.partyName}>{data.customerName}</Text>
            <View style={styles.partyDetails}>
              <Text>{data.customerEmail}</Text>
              {data.customerAddress && <Text>{data.customerAddress}</Text>}
              {data.customerCountry && <Text>{data.customerCountry}</Text>}
            </View>
          </View>
        </View>

        {/* Invoice Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Description</Text>
            <Text style={styles.col2}>Quantity</Text>
            <Text style={styles.col3}>Rate</Text>
            <Text style={styles.col4}>Amount</Text>
          </View>
          
          <View style={styles.tableRow}>
            <Text style={styles.col1}>
              {data.cryptoCurrency} Purchase
            </Text>
            <Text style={styles.col2}>{formatCrypto(data.cryptoAmount)}</Text>
            <Text style={styles.col3}>{formatFiat(data.exchangeRate)}</Text>
            <Text style={styles.col4}>{formatFiat(data.subtotal)}</Text>
          </View>
          
          <View style={[styles.tableRow, styles.tableRowLast]}>
            <Text style={styles.col1}>
              Platform Fee ({data.platformFeePercent}%)
            </Text>
            <Text style={styles.col2}>-</Text>
            <Text style={styles.col3}>-</Text>
            <Text style={styles.col4}>{formatFiat(data.platformFee)}</Text>
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatFiat(data.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Platform Fee:</Text>
            <Text style={styles.totalValue}>{formatFiat(data.platformFee)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total Amount:</Text>
            <Text style={styles.grandTotalValue}>{formatFiat(data.totalAmount)}</Text>
          </View>
        </View>

        {/* Payment Instructions */}
        {data.bankName && data.iban && (
          <View style={styles.paymentSection}>
            <Text style={styles.paymentTitle}>Payment Instructions</Text>
            <View style={styles.paymentDetails}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Bank Name:</Text>
                <Text style={styles.paymentValue}>{data.bankName}</Text>
              </View>
              {data.accountHolder && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Account Holder:</Text>
                  <Text style={styles.paymentValue}>{data.accountHolder}</Text>
                </View>
              )}
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>IBAN:</Text>
                <Text style={styles.paymentValue}>{data.iban}</Text>
              </View>
              {data.swift && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>SWIFT/BIC:</Text>
                  <Text style={styles.paymentValue}>{data.swift}</Text>
                </View>
              )}
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Reference:</Text>
                <Text style={styles.paymentValue}>{data.paymentReference}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Amount:</Text>
                <Text style={styles.paymentValue}>{formatFiat(data.totalAmount)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Wallet Address */}
        <View style={styles.walletSection}>
          <Text style={styles.walletTitle}>
            Cryptocurrency Delivery Address
          </Text>
          <Text style={styles.walletAddress}>{data.walletAddress}</Text>
          {data.blockchainNetwork && (
            <Text style={{ fontSize: 8, marginTop: 6, color: '#065f46' }}>
              Network: {data.blockchainNetwork}
            </Text>
          )}
        </View>

        {/* Notes */}
        <View style={styles.notes}>
          <Text style={styles.notesTitle}>Important Notes:</Text>
          <View style={styles.notesText}>
            <Text>• Please include the payment reference in your bank transfer.</Text>
            <Text>• Cryptocurrency will be sent to your wallet after payment confirmation.</Text>
            <Text>• Processing time: 1-3 business days after payment received.</Text>
            <Text>• For questions, contact: {data.companyEmail || 'support@apricode.exchange'}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This invoice was generated electronically and is valid without signature.{'\n'}
            {data.companyLegalName} • {data.companyTaxNumber || 'Tax ID on file'}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

