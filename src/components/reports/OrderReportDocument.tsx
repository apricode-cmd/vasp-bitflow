/**
 * Order Report PDF Document Component
 * 
 * Generates professional PDF reports for orders using @react-pdf/renderer
 * Based on UserReportDocument.tsx and InvoiceDocument.tsx patterns
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';

// Styles - Professional Design matching User Report
const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingHorizontal: 40,
    paddingBottom: 80,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  
  // Header
  header: {
    marginBottom: 25,
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 8,
    borderLeft: '4 solid #3b82f6',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logo: {
    width: 140,
    height: 45,
    marginBottom: 12,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  companyDetails: {
    fontSize: 9,
    lineHeight: 1.6,
    color: '#64748b',
  },
  reportTitle: {
    textAlign: 'right',
  },
  reportTitleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  reportId: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 2,
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 1,
    backgroundColor: '#f1f5f9',
    padding: 8,
    paddingLeft: 12,
    borderLeft: '3 solid #3b82f6',
  },

  // Info Grid
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  infoBlock: {
    width: '48%',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 4,
    borderLeft: '2 solid #cbd5e1',
  },
  infoLabel: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 10,
    color: '#0f172a',
    fontWeight: 'bold',
  },

  // Status Badge
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Table
  table: {
    marginTop: 8,
    borderRadius: 6,
    overflow: 'hidden',
    border: '1 solid #e2e8f0',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottom: '2 solid #cbd5e1',
    padding: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #e2e8f0',
    padding: 10,
  },
  tableRowEven: {
    backgroundColor: '#f9fafb',
  },
  tableCol: {
    fontSize: 9,
  },
  tableColHeader: {
    fontWeight: 'bold',
    color: '#475569',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Financial Summary
  financialBox: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 8,
    border: '1 solid #bae6fd',
    marginTop: 12,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  financialLabel: {
    fontSize: 10,
    color: '#0369a1',
  },
  financialValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0369a1',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTop: '2 solid #7dd3fc',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0c4a6e',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0c4a6e',
  },

  // Timeline
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottom: '1 solid #e2e8f0',
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginRight: 12,
    marginTop: 2,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 8,
    color: '#94a3b8',
    marginBottom: 2,
  },
  timelineDescription: {
    fontSize: 9,
    color: '#64748b',
    lineHeight: 1.4,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 12,
    borderTop: '1 solid #e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#94a3b8',
  },
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
  },
  pageNumber: {
    fontSize: 8,
    color: '#94a3b8',
  },

  // Notes
  notesBox: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 6,
    border: '1 solid #fde047',
    marginTop: 12,
  },
  notesText: {
    fontSize: 9,
    color: '#854d0e',
    lineHeight: 1.5,
  },
});

export interface OrderReportData {
  // Report metadata
  reportDate: string;
  reportId: string;

  // Company info
  companyLegalName: string;
  companyRegistrationNumber: string | null;
  companyTaxNumber: string | null;
  companyLicenseNumber: string | null;
  companyAddress: string | null;
  companyPhone: string | null;
  companyEmail: string | null;
  companyWebsite: string | null;
  brandLogo: string | null;
  brandName: string;
  primaryBrandColor: string;

  // Order information
  orderId: string;
  paymentReference: string;
  orderStatus: string;
  orderType: 'BUY' | 'SELL';
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  completedAt: string | null;

  // Customer information
  customerId: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string | null;
  customerCountry: string | null;
  kycStatus: string;

  // Financial details
  cryptoCurrency: string;
  cryptoAmount: string;
  fiatCurrency: string;
  fiatAmount: string;
  exchangeRate: string;
  platformFee: string;
  totalFiat: string;

  // Payment details
  paymentMethodName: string | null;
  paymentAccountName: string | null;
  paymentAccountDetails: string | null;
  
  // Wallet details
  walletAddress: string | null;
  walletLabel: string | null;
  blockchain: string | null;

  // PayIn details
  payInStatus: string | null;
  payInAmount: string | null;
  payInCurrency: string | null;
  payInReference: string | null;
  payInReceivedAt: string | null;

  // PayOut details
  payOutStatus: string | null;
  payOutAmount: string | null;
  payOutCurrency: string | null;
  payOutTxHash: string | null;
  payOutSentAt: string | null;

  // Timeline
  timeline: Array<{
    date: string;
    status: string;
    description: string;
    actor?: string;
  }>;

  // Notes
  adminNotes: string | null;
  customerNotes: string | null;
}

interface OrderReportDocumentProps {
  data: OrderReportData;
}

export const OrderReportDocument: React.FC<OrderReportDocumentProps> = ({ data }) => {
  
  // Get status color
  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      COMPLETED: { bg: '#d1fae5', text: '#065f46' },
      PROCESSING: { bg: '#dbeafe', text: '#1e40af' },
      PAYMENT_PENDING: { bg: '#fef3c7', text: '#92400e' },
      PAYMENT_RECEIVED: { bg: '#bfdbfe', text: '#1e3a8a' },
      PENDING: { bg: '#fef3c7', text: '#92400e' },
      CANCELLED: { bg: '#fee2e2', text: '#991b1b' },
      EXPIRED: { bg: '#f3f4f6', text: '#374151' },
    };
    return colors[status] || { bg: '#f3f4f6', text: '#374151' };
  };

  const statusColor = getStatusColor(data.orderStatus);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            {/* Company Info */}
            <View style={styles.companyInfo}>
              {data.brandLogo && (
                <Image src={data.brandLogo} style={styles.logo} />
              )}
              <Text style={styles.companyName}>{data.companyLegalName}</Text>
              <Text style={styles.companyDetails}>
                {data.companyAddress && `${data.companyAddress}\n`}
                {data.companyRegistrationNumber && `Reg: ${data.companyRegistrationNumber}\n`}
                {data.companyTaxNumber && `Tax: ${data.companyTaxNumber}\n`}
                {data.companyLicenseNumber && `License: ${data.companyLicenseNumber}\n`}
                {data.companyEmail && `Email: ${data.companyEmail}\n`}
                {data.companyPhone && `Phone: ${data.companyPhone}`}
              </Text>
            </View>

            {/* Report Title */}
            <View style={styles.reportTitle}>
              <Text style={styles.reportTitleText}>ORDER REPORT</Text>
              <Text style={styles.reportId}>{data.reportId}</Text>
              <Text style={styles.reportDate}>
                Generated: {new Date(data.reportDate).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Payment Reference</Text>
              <Text style={styles.infoValue}>{data.paymentReference}</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Order Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                <Text style={[styles.statusText, { color: statusColor.text }]}>
                  {data.orderStatus}
                </Text>
              </View>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Order Type</Text>
              <Text style={styles.infoValue}>{data.orderType}</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Created At</Text>
              <Text style={styles.infoValue}>
                {new Date(data.createdAt).toLocaleString('en-GB')}
              </Text>
            </View>
            {data.completedAt && (
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Completed At</Text>
                <Text style={styles.infoValue}>
                  {new Date(data.completedAt).toLocaleString('en-GB')}
                </Text>
              </View>
            )}
            {data.expiresAt && (
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Expires At</Text>
                <Text style={styles.infoValue}>
                  {new Date(data.expiresAt).toLocaleString('en-GB')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Customer Name</Text>
              <Text style={styles.infoValue}>{data.customerName}</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{data.customerEmail}</Text>
            </View>
            {data.customerPhone && (
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{data.customerPhone}</Text>
              </View>
            )}
            {data.customerCountry && (
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Country</Text>
                <Text style={styles.infoValue}>{data.customerCountry}</Text>
              </View>
            )}
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>KYC Status</Text>
              <Text style={styles.infoValue}>{data.kycStatus}</Text>
            </View>
          </View>
        </View>

        {/* Financial Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Details</Text>
          
          <View style={styles.financialBox}>
            <View style={styles.financialRow}>
              <Text style={styles.financialLabel}>Cryptocurrency</Text>
              <Text style={styles.financialValue}>{data.cryptoCurrency}</Text>
            </View>
            <View style={styles.financialRow}>
              <Text style={styles.financialLabel}>Crypto Amount</Text>
              <Text style={styles.financialValue}>{data.cryptoAmount} {data.cryptoCurrency}</Text>
            </View>
            <View style={styles.financialRow}>
              <Text style={styles.financialLabel}>Exchange Rate</Text>
              <Text style={styles.financialValue}>1 {data.cryptoCurrency} = {data.exchangeRate} {data.fiatCurrency}</Text>
            </View>
            <View style={styles.financialRow}>
              <Text style={styles.financialLabel}>Fiat Amount</Text>
              <Text style={styles.financialValue}>{data.fiatAmount} {data.fiatCurrency}</Text>
            </View>
            <View style={styles.financialRow}>
              <Text style={styles.financialLabel}>Platform Fee</Text>
              <Text style={styles.financialValue}>{data.platformFee} {data.fiatCurrency}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>{data.totalFiat} {data.fiatCurrency}</Text>
            </View>
          </View>
        </View>

        {/* Payment & Wallet Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment & Wallet Details</Text>
          
          <View style={styles.infoGrid}>
            {data.paymentMethodName && (
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Payment Method</Text>
                <Text style={styles.infoValue}>{data.paymentMethodName}</Text>
              </View>
            )}
            {data.paymentAccountName && (
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Payment Account</Text>
                <Text style={styles.infoValue}>{data.paymentAccountName}</Text>
              </View>
            )}
            {data.walletAddress && (
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Wallet Address</Text>
                <Text style={styles.infoValue}>{data.walletAddress}</Text>
              </View>
            )}
            {data.blockchain && (
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Blockchain</Text>
                <Text style={styles.infoValue}>{data.blockchain}</Text>
              </View>
            )}
          </View>
        </View>

        {/* PayIn Status */}
        {data.payInStatus && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PayIn Details</Text>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>PayIn Status</Text>
                <Text style={styles.infoValue}>{data.payInStatus}</Text>
              </View>
              {data.payInAmount && (
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>PayIn Amount</Text>
                  <Text style={styles.infoValue}>{data.payInAmount} {data.payInCurrency}</Text>
                </View>
              )}
              {data.payInReference && (
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>PayIn Reference</Text>
                  <Text style={styles.infoValue}>{data.payInReference}</Text>
                </View>
              )}
              {data.payInReceivedAt && (
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Received At</Text>
                  <Text style={styles.infoValue}>
                    {new Date(data.payInReceivedAt).toLocaleString('en-GB')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* PayOut Status */}
        {data.payOutStatus && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PayOut Details</Text>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>PayOut Status</Text>
                <Text style={styles.infoValue}>{data.payOutStatus}</Text>
              </View>
              {data.payOutAmount && (
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>PayOut Amount</Text>
                  <Text style={styles.infoValue}>{data.payOutAmount} {data.payOutCurrency}</Text>
                </View>
              )}
              {data.payOutTxHash && (
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Transaction Hash</Text>
                  <Text style={styles.infoValue}>{data.payOutTxHash.slice(0, 20)}...</Text>
                </View>
              )}
              {data.payOutSentAt && (
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Sent At</Text>
                  <Text style={styles.infoValue}>
                    {new Date(data.payOutSentAt).toLocaleString('en-GB')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Order Timeline */}
        {data.timeline && data.timeline.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Order Timeline</Text>
            
            {data.timeline.map((event, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>{event.status}</Text>
                  <Text style={styles.timelineDate}>
                    {new Date(event.date).toLocaleString('en-GB')}
                    {event.actor && ` • by ${event.actor}`}
                  </Text>
                  {event.description && (
                    <Text style={styles.timelineDescription}>{event.description}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {(data.adminNotes || data.customerNotes) && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Notes</Text>
            
            {data.adminNotes && (
              <View style={styles.notesBox}>
                <Text style={styles.infoLabel}>Admin Notes:</Text>
                <Text style={styles.notesText}>{data.adminNotes}</Text>
              </View>
            )}
            {data.customerNotes && (
              <View style={[styles.notesBox, { backgroundColor: '#e0f2fe', borderColor: '#bae6fd' }]}>
                <Text style={styles.infoLabel}>Customer Notes:</Text>
                <Text style={[styles.notesText, { color: '#0c4a6e' }]}>{data.customerNotes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {data.brandName} • {data.companyWebsite || data.companyEmail}
          </Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
            `Page ${pageNumber} of ${totalPages}`
          )} />
          <Text style={styles.footerText}>
            Confidential Document
          </Text>
        </View>
      </Page>
    </Document>
  );
};

