/**
 * User Report PDF Document Component
 * 
 * Generates professional PDF reports for banks/regulators using @react-pdf/renderer
 * Based on InvoiceDocument.tsx pattern
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

// Styles - Enhanced Professional Design
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  
  // Header - Enhanced with gradient-like effect
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

  // Section - Enhanced with colored accent
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

  // User Info Box - Enhanced card design
  userBox: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 6,
    marginBottom: 18,
    border: '1 solid #e2e8f0',
  },
  userRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottom: '0.5 solid #e2e8f0',
  },
  label: {
    fontSize: 9,
    color: '#64748b',
    width: '40%',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  value: {
    fontSize: 10,
    color: '#0f172a',
    width: '60%',
    fontWeight: 'normal',
  },

  // Grid layout (2 columns) - Enhanced spacing
  grid: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 18,
  },
  gridCol: {
    flex: 1,
  },

  // Stats cards - Enhanced design with shadows
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 6,
    border: '1.5 solid #e2e8f0',
    borderTop: '3 solid #3b82f6',
  },
  statLabel: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
    fontWeight: 'bold',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },

  // Table - Enhanced professional design
  table: {
    marginBottom: 18,
    border: '1 solid #e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 10,
    borderBottom: '2 solid #cbd5e1',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottom: '0.5 solid #f1f5f9',
    backgroundColor: '#ffffff',
  },
  tableCell: {
    fontSize: 9,
    color: '#1e293b',
    lineHeight: 1.4,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Badge - Enhanced with better colors
  badge: {
    fontSize: 8,
    padding: '3 8',
    borderRadius: 4,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  badgeSuccess: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    border: '0.5 solid #10b981',
  },
  badgeWarning: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    border: '0.5 solid #f59e0b',
  },
  badgeDanger: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    border: '0.5 solid #ef4444',
  },
  badgeInfo: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    border: '0.5 solid #3b82f6',
  },

  // Footer - Enhanced
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
    borderTop: '1.5 solid #e2e8f0',
    paddingTop: 12,
  },

  // Warning box (for PEP) - Enhanced
  warningBox: {
    backgroundColor: '#fef9c3',
    border: '1.5 solid #fbbf24',
    padding: 12,
    borderRadius: 6,
    marginBottom: 18,
    borderLeft: '4 solid #f59e0b',
  },
  warningText: {
    fontSize: 9,
    color: '#92400e',
    fontWeight: 'bold',
    lineHeight: 1.5,
  },
});

export interface UserReportData {
  // Report metadata
  reportDate: string;
  reportId: string;

  // Company info
  companyLegalName: string;
  companyRegistrationNumber?: string;
  companyTaxNumber?: string;
  companyLicenseNumber?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  brandLogo?: string;
  brandName: string;
  primaryBrandColor: string; // Brand color for accents

  // User account info
  userId: string;
  userEmail: string;
  userRole: string;
  accountStatus: string;
  registrationDate: string;
  lastLogin: string | null;

  // Personal information
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  country: string | null;
  city: string | null;

  // KYC information
  kycStatus: string;
  kycSubmittedAt: string | null;
  kycReviewedAt: string | null;

  // KYC Details
  dateOfBirth?: string | null;
  placeOfBirth?: string | null;
  nationality?: string | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressRegion?: string | null;
  addressPostalCode?: string | null;
  addressCountry?: string | null;
  
  // Identity Document
  idType?: string | null;
  idNumber?: string | null;
  idIssuingCountry?: string | null;
  idIssueDate?: string | null;
  idExpiryDate?: string | null;

  // PEP Status
  isPep?: boolean;
  pepRole?: string | null;

  // Employment & Source of Funds
  employmentStatus?: string | null;
  occupation?: string | null;
  employerName?: string | null;
  sourceOfFunds?: string | null;
  sourceOfWealth?: string | null;
  purposeOfAccount?: string | null;
  intendedUse?: string | null;

  // Financial statistics
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  processingOrders: number;
  cancelledOrders: number;
  totalVolume: number;
  averageOrderValue: number;

  // Transaction history
  orders: Array<{
    id: string;
    paymentReference: string;
    date: string;
    type: string;
    cryptoAmount: number;
    cryptoCurrency: string;
    fiatAmount: number;
    fiatCurrency: string;
    status: string;
  }>;

  // Crypto wallets
  wallets: Array<{
    address: string;
    label: string | null;
    currency: string;
    blockchain: string;
    isDefault: boolean;
  }>;

  // Security & login history
  loginHistory: Array<{
    date: string;
    ipAddress: string;
    location: string;
  }>;
}

export const UserReportDocument: React.FC<{ data: UserReportData }> = ({ data }) => {
  const formatDate = (dateString: string | null | Date) => {
    if (!dateString) return 'N/A';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-GB');
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${amount.toFixed(2)} ${currency}`;
  };

  const getStatusBadgeStyle = (status: string) => {
    if (status === 'COMPLETED' || status === 'APPROVED' || status === 'ACTIVE') {
      return [styles.badge, styles.badgeSuccess];
    }
    if (status === 'PENDING' || status === 'PAYMENT_PENDING') {
      return [styles.badge, styles.badgeWarning];
    }
    if (status === 'CANCELLED' || status === 'FAILED' || status === 'REJECTED' || status === 'INACTIVE') {
      return [styles.badge, styles.badgeDanger];
    }
    return [styles.badge, styles.badgeInfo];
  };

  // Helper for section titles with brand color
  const sectionTitleWithBrand = {
    ...styles.sectionTitle,
    borderLeft: `3 solid ${data.primaryBrandColor}`,
  };

  // Helper for stat cards with brand color
  const statCardWithBrand = {
    ...styles.statCard,
    borderTop: `3 solid ${data.primaryBrandColor}`,
  };

  // Footer component for reusability
  const renderFooter = (pageNumber: number, totalPages: number) => (
    <View style={styles.footer} fixed>
      <Text>
        This report is generated by {data.brandName} platform • Confidential Document
      </Text>
      <Text style={{ marginTop: 2 }}>
        Generated on {formatDate(data.reportDate)} at {new Date(data.reportDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} • Page {pageNumber} of {totalPages}
      </Text>
    </View>
  );

  // Total pages in this document
  const TOTAL_PAGES = 4;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Compact Professional Header */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          paddingBottom: 12,
          borderBottom: `2 solid ${data.primaryBrandColor}`,
        }}>
          {/* Left Side - Company Info */}
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: '#0f172a',
              marginBottom: 3,
            }}>
              {data.companyLegalName}
            </Text>
            <Text style={{
              fontSize: 7,
              color: '#64748b',
              lineHeight: 1.4,
            }}>
              {data.companyRegistrationNumber && `Reg: ${data.companyRegistrationNumber}`}
              {data.companyRegistrationNumber && data.companyLicenseNumber && ' • '}
              {data.companyLicenseNumber && `License: ${data.companyLicenseNumber}`}
            </Text>
            {data.companyEmail && (
              <Text style={{
                fontSize: 7,
                color: '#64748b',
                marginTop: 2,
              }}>
                {data.companyEmail}
                {data.companyPhone && ` • ${data.companyPhone}`}
              </Text>
            )}
          </View>
          
          {/* Right Side - Report Info */}
          <View style={{
            alignItems: 'flex-end',
          }}>
            <View style={{
              backgroundColor: data.primaryBrandColor,
              paddingVertical: 6,
              paddingHorizontal: 14,
              borderRadius: 4,
              marginBottom: 6,
            }}>
              <Text style={{
                fontSize: 14,
                fontWeight: 'bold',
                color: '#ffffff',
                letterSpacing: 1.5,
              }}>
                USER REPORT
              </Text>
            </View>
            <Text style={{
              fontSize: 8,
              color: '#64748b',
              fontFamily: 'Courier',
            }}>
              {data.reportId}
            </Text>
            <Text style={{
              fontSize: 7,
              color: '#94a3b8',
              marginTop: 2,
            }}>
              {formatDate(data.reportDate)} • {new Date(data.reportDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        {/* User Account Information */}
        <View style={styles.section}>
          <Text style={sectionTitleWithBrand}>User Account Information</Text>
          <View style={styles.userBox}>
            <View style={styles.userRow}>
              <Text style={styles.label}>Full Name:</Text>
              <Text style={styles.value}>
                {data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : 'N/A'}
              </Text>
            </View>
            <View style={styles.userRow}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{data.userEmail}</Text>
            </View>
            <View style={styles.userRow}>
              <Text style={styles.label}>User ID:</Text>
              <Text style={styles.value}>{data.userId}</Text>
            </View>
            <View style={styles.userRow}>
              <Text style={styles.label}>Account Status:</Text>
              <Text style={[styles.value, getStatusBadgeStyle(data.accountStatus)]}>
                {data.accountStatus}
              </Text>
            </View>
            <View style={styles.userRow}>
              <Text style={styles.label}>Registration Date:</Text>
              <Text style={styles.value}>{formatDate(data.registrationDate)}</Text>
            </View>
            <View style={styles.userRow}>
              <Text style={styles.label}>Last Login:</Text>
              <Text style={styles.value}>{formatDate(data.lastLogin)}</Text>
            </View>
          </View>
        </View>

        {/* Financial Summary Stats */}
        <View style={styles.section}>
          <Text style={sectionTitleWithBrand}>Financial Summary</Text>
          <View style={styles.statsRow}>
            <View style={statCardWithBrand}>
              <Text style={styles.statLabel}>Total Volume</Text>
              <Text style={styles.statValue}>€{data.totalVolume.toFixed(2)}</Text>
            </View>
            <View style={statCardWithBrand}>
              <Text style={styles.statLabel}>Total Orders</Text>
              <Text style={styles.statValue}>{data.totalOrders}</Text>
            </View>
            <View style={statCardWithBrand}>
              <Text style={styles.statLabel}>Completed</Text>
              <Text style={styles.statValue}>{data.completedOrders}</Text>
            </View>
            <View style={statCardWithBrand}>
              <Text style={styles.statLabel}>Avg Order</Text>
              <Text style={styles.statValue}>€{data.averageOrderValue.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* KYC Verification Status */}
        <View style={styles.section}>
          <Text style={sectionTitleWithBrand}>KYC Verification Status</Text>
          <View style={styles.grid}>
            <View style={styles.gridCol}>
              <View style={styles.userRow}>
                <Text style={styles.label}>KYC Status:</Text>
                <Text style={[styles.value, getStatusBadgeStyle(data.kycStatus)]}>
                  {data.kycStatus}
                </Text>
              </View>
              <View style={styles.userRow}>
                <Text style={styles.label}>Submitted:</Text>
                <Text style={styles.value}>{formatDate(data.kycSubmittedAt)}</Text>
              </View>
            </View>
            <View style={styles.gridCol}>
              <View style={styles.userRow}>
                <Text style={styles.label}>Reviewed:</Text>
                <Text style={styles.value}>{formatDate(data.kycReviewedAt)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* PEP Warning (if applicable) */}
        {data.isPep && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ POLITICALLY EXPOSED PERSON (PEP) IDENTIFIED
            </Text>
            {data.pepRole && (
              <Text style={{ fontSize: 8, color: '#92400e', marginTop: 4 }}>
                Role/Position: {data.pepRole}
              </Text>
            )}
          </View>
        )}

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={sectionTitleWithBrand}>Personal Information</Text>
          <View style={styles.grid}>
            <View style={styles.gridCol}>
              <View style={styles.userRow}>
                <Text style={styles.label}>Date of Birth:</Text>
                <Text style={styles.value}>{data.dateOfBirth || 'N/A'}</Text>
              </View>
              <View style={styles.userRow}>
                <Text style={styles.label}>Place of Birth:</Text>
                <Text style={styles.value}>{data.placeOfBirth || 'N/A'}</Text>
              </View>
              <View style={styles.userRow}>
                <Text style={styles.label}>Nationality:</Text>
                <Text style={styles.value}>{data.nationality || 'N/A'}</Text>
              </View>
              <View style={styles.userRow}>
                <Text style={styles.label}>Phone:</Text>
                <Text style={styles.value}>{data.phoneNumber || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.gridCol}>
              <View style={styles.userRow}>
                <Text style={styles.label}>Address:</Text>
                <Text style={styles.value}>
                  {data.addressStreet || 'N/A'}
                  {data.addressCity && `, ${data.addressCity}`}
                  {data.addressPostalCode && ` ${data.addressPostalCode}`}
                </Text>
              </View>
              <View style={styles.userRow}>
                <Text style={styles.label}>Region:</Text>
                <Text style={styles.value}>{data.addressRegion || 'N/A'}</Text>
              </View>
              <View style={styles.userRow}>
                <Text style={styles.label}>Country:</Text>
                <Text style={styles.value}>{data.addressCountry || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Identity Document */}
        <View style={styles.section}>
          <Text style={sectionTitleWithBrand}>Identity Document</Text>
          <View style={styles.grid}>
            <View style={styles.gridCol}>
              <View style={styles.userRow}>
                <Text style={styles.label}>Document Type:</Text>
                <Text style={styles.value}>{data.idType || 'N/A'}</Text>
              </View>
              <View style={styles.userRow}>
                <Text style={styles.label}>Document Number:</Text>
                <Text style={styles.value}>{data.idNumber || 'N/A'}</Text>
              </View>
              <View style={styles.userRow}>
                <Text style={styles.label}>Issuing Country:</Text>
                <Text style={styles.value}>{data.idIssuingCountry || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.gridCol}>
              <View style={styles.userRow}>
                <Text style={styles.label}>Issue Date:</Text>
                <Text style={styles.value}>{data.idIssueDate || 'N/A'}</Text>
              </View>
              <View style={styles.userRow}>
                <Text style={styles.label}>Expiry Date:</Text>
                <Text style={styles.value}>{data.idExpiryDate || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        {renderFooter(1, TOTAL_PAGES)}
      </Page>

      {/* Page 2: Employment, Source of Funds & Transaction History */}
      <Page size="A4" style={styles.page}>
        {/* Employment & Financial Information */}
        <View style={styles.section}>
          <Text style={sectionTitleWithBrand}>Employment & Source of Funds</Text>
          <View style={styles.grid}>
            <View style={styles.gridCol}>
              <View style={styles.userRow}>
                <Text style={styles.label}>Employment Status:</Text>
                <Text style={styles.value}>{data.employmentStatus || 'N/A'}</Text>
              </View>
              <View style={styles.userRow}>
                <Text style={styles.label}>Occupation:</Text>
                <Text style={styles.value}>{data.occupation || 'N/A'}</Text>
              </View>
              <View style={styles.userRow}>
                <Text style={styles.label}>Employer:</Text>
                <Text style={styles.value}>{data.employerName || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.gridCol}>
              <View style={styles.userRow}>
                <Text style={styles.label}>Source of Funds:</Text>
                <Text style={styles.value}>{data.sourceOfFunds || 'N/A'}</Text>
              </View>
              <View style={styles.userRow}>
                <Text style={styles.label}>Source of Wealth:</Text>
                <Text style={styles.value}>{data.sourceOfWealth || 'N/A'}</Text>
              </View>
            </View>
          </View>
          <View style={{ marginTop: 8 }}>
            <View style={styles.userRow}>
              <Text style={styles.label}>Purpose of Account:</Text>
              <Text style={styles.value}>{data.purposeOfAccount || 'N/A'}</Text>
            </View>
            <View style={styles.userRow}>
              <Text style={styles.label}>Intended Use:</Text>
              <Text style={styles.value}>{data.intendedUse || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.section}>
          <Text style={sectionTitleWithBrand}>Transaction History (Last 20 Orders)</Text>
          {data.orders.length > 0 ? (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Date</Text>
                <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Reference</Text>
                <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Crypto Amount</Text>
                <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Fiat Amount</Text>
                <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Status</Text>
              </View>
              {data.orders.map((order, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '15%' }]}>
                    {formatDate(order.date)}
                  </Text>
                  <Text style={[styles.tableCell, { width: '20%' }]}>
                    {order.paymentReference}
                  </Text>
                  <Text style={[styles.tableCell, { width: '20%' }]}>
                    {order.cryptoAmount} {order.cryptoCurrency}
                  </Text>
                  <Text style={[styles.tableCell, { width: '20%' }]}>
                    {formatCurrency(order.fiatAmount, order.fiatCurrency)}
                  </Text>
                  <Text style={[styles.tableCell, getStatusBadgeStyle(order.status), { width: '25%' }]}>
                    {order.status}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 8, color: '#6b7280', textAlign: 'center' }}>
              No transaction history available
            </Text>
          )}
        </View>

        {/* Crypto Wallets */}
        <View style={styles.section}>
          <Text style={sectionTitleWithBrand}>Registered Crypto Wallets</Text>
          {data.wallets.length > 0 ? (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Currency</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Blockchain</Text>
                <Text style={[styles.tableHeaderCell, { width: '55%' }]}>Wallet Address</Text>
                <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Label / Status</Text>
              </View>
              {data.wallets.map((wallet, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '10%', fontWeight: 'bold' }]}>
                    {wallet.currency}
                  </Text>
                  <Text style={[styles.tableCell, { width: '15%', fontSize: 7 }]}>
                    {wallet.blockchain}
                  </Text>
                  <Text style={[styles.tableCell, { width: '55%', fontSize: 7, fontFamily: 'Courier' }]}>
                    {wallet.address}
                  </Text>
                  <Text style={[styles.tableCell, { width: '20%', fontSize: 7 }]}>
                    {wallet.label || (wallet.isDefault ? 'Default' : '-')}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 8, color: '#6b7280', textAlign: 'center' }}>
              No crypto wallets registered
            </Text>
          )}
        </View>

        {/* Login History */}
        <View style={styles.section}>
          <Text style={sectionTitleWithBrand}>Recent Login Activity (Last 5 Sessions)</Text>
          {data.loginHistory.length > 0 ? (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Date & Time</Text>
                <Text style={[styles.tableHeaderCell, { width: '30%' }]}>IP Address</Text>
                <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Location</Text>
              </View>
              {data.loginHistory.map((login, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '30%' }]}>
                    {formatDate(login.date)}
                  </Text>
                  <Text style={[styles.tableCell, { width: '30%' }]}>
                    {login.ipAddress}
                  </Text>
                  <Text style={[styles.tableCell, { width: '40%' }]}>
                    {login.location}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 8, color: '#6b7280', textAlign: 'center' }}>
              No login history available
            </Text>
          )}
        </View>

        {/* Footer */}
        {renderFooter(2, TOTAL_PAGES)}
      </Page>
    </Document>
  );
};

