/**
 * Top Up Invoice PDF Document Component
 * 
 * Generates PDF invoice for Virtual IBAN top-up with user's IBAN details
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

// Styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1f2937',
  },
  
  // Header
  header: {
    marginBottom: 25,
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
    fontSize: 22,
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
    marginBottom: 25,
    gap: 15,
  },
  party: {
    flex: 1,
    padding: 12,
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

  // Amount section
  amountSection: {
    marginBottom: 25,
    padding: 20,
    backgroundColor: '#f0fdf4',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    textAlign: 'center',
  },
  amountLabel: {
    fontSize: 10,
    color: '#166534',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#15803d',
  },
  amountNote: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 5,
  },
  
  // Payment instructions - MAIN SECTION
  paymentSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#eff6ff',
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  paymentTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1e40af',
  },
  paymentDetails: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#1e3a8a',
  },
  paymentRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },
  paymentRowLast: {
    borderBottomWidth: 0,
  },
  paymentLabel: {
    width: 130,
    fontWeight: 'bold',
    fontSize: 9,
  },
  paymentValue: {
    flex: 1,
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Important notice
  noticeSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
  },
  noticeTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 6,
  },
  noticeText: {
    fontSize: 8,
    lineHeight: 1.5,
    color: '#78350f',
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 30,
    right: 30,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 1.4,
  },
});

// Types
export interface TopUpInvoiceData {
  // Invoice info
  invoiceNumber: string;
  invoiceDate: string;
  
  // Company info (from SystemSettings)
  companyLegalName: string;
  companyRegistrationNumber?: string;
  companyTaxNumber?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyWebsite?: string;
  
  // Customer info
  customerName: string;
  customerEmail: string;
  customerAddress?: string;
  customerCountry?: string;
  
  // Top-up amount (optional - user can choose)
  amount?: number;
  currency: string;
  
  // Virtual IBAN details (user's own IBAN for receiving)
  iban: string;
  bic: string;
  bankName: string;
  accountHolder: string;
  
  // Unique reference for payment matching (e.g., TU-7890-ABC123)
  reference?: string;
}

/**
 * Top Up Invoice PDF Document Component
 */
export const TopUpInvoiceDocument: React.FC<{ data: TopUpInvoiceData }> = ({ data }) => {
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: data.currency,
      minimumFractionDigits: 2,
    }).format(amount);
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
                {data.companyAddress && (
                  <Text>{data.companyAddress}</Text>
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
              <Text style={styles.invoiceTitleText}>TOP UP INVOICE</Text>
              <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
              <Text style={styles.invoiceDate}>Date: {formatDate(data.invoiceDate)}</Text>
            </View>
          </View>
        </View>

        {/* Parties (From Service / To Customer) */}
        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.partyLabel}>Service Provider</Text>
            <Text style={styles.partyName}>{data.companyLegalName}</Text>
            <View style={styles.partyDetails}>
              {data.companyAddress && <Text>{data.companyAddress}</Text>}
              {data.companyEmail && <Text>{data.companyEmail}</Text>}
            </View>
          </View>
          
          <View style={styles.party}>
            <Text style={styles.partyLabel}>Account Holder</Text>
            <Text style={styles.partyName}>{data.customerName}</Text>
            <View style={styles.partyDetails}>
              <Text>{data.customerEmail}</Text>
              {data.customerAddress && <Text>{data.customerAddress}</Text>}
              {data.customerCountry && <Text>{data.customerCountry}</Text>}
            </View>
          </View>
        </View>

        {/* Amount Section (if specified) */}
        {data.amount && data.amount > 0 && (
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Amount to Transfer</Text>
            <Text style={styles.amountValue}>{formatAmount(data.amount)}</Text>
            <Text style={styles.amountNote}>Transfer exactly this amount for automatic processing</Text>
          </View>
        )}

        {/* Payment Instructions - YOUR VIRTUAL IBAN */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Your Virtual IBAN Details</Text>
          <Text style={{ fontSize: 8, color: '#4b5563', marginBottom: 10 }}>
            Transfer funds to the following account to top up your balance:
          </Text>
          <View style={styles.paymentDetails}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Account Holder:</Text>
              <Text style={styles.paymentValue}>{data.accountHolder}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>IBAN:</Text>
              <Text style={styles.paymentValue}>{data.iban}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>BIC/SWIFT:</Text>
              <Text style={styles.paymentValue}>{data.bic}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Bank Name:</Text>
              <Text style={styles.paymentValue}>{data.bankName}</Text>
            </View>
            <View style={[styles.paymentRow, styles.paymentRowLast]}>
              <Text style={styles.paymentLabel}>Payment Reference:</Text>
              <Text style={styles.paymentValue}>
                {data.reference || `${data.customerEmail} or "TOPUP"`}
              </Text>
            </View>
          </View>
        </View>

        {/* Important Notice */}
        <View style={styles.noticeSection}>
          <Text style={styles.noticeTitle}>Important Information</Text>
          <Text style={styles.noticeText}>
            {data.reference 
              ? `• USE REFERENCE: ${data.reference} - Required for automatic matching\n`
              : ''
            }
            • SEPA transfers typically arrive within 1 business day{'\n'}
            • SWIFT transfers may take 2-5 business days{'\n'}
            • Your balance will update automatically upon receipt{'\n'}
            • Currency must be {data.currency}{'\n'}
            • Minimum top-up: €10 | Maximum: €100,000{'\n'}
            • Transfers from third-party accounts may be rejected
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This document was generated electronically.{'\n'}
            {data.companyLegalName} • {data.companyWebsite || data.companyEmail || ''}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

