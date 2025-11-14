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
    marginBottom: 20,
    borderBottom: '2 solid #e5e7eb',
    paddingBottom: 15,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logo: {
    width: 120,
    height: 40,
    marginBottom: 10,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#111827',
  },
  companyDetails: {
    fontSize: 8,
    lineHeight: 1.4,
    color: '#6b7280',
  },
  reportTitle: {
    textAlign: 'right',
  },
  reportTitleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  reportId: {
    fontSize: 10,
    color: '#6b7280',
  },
  reportDate: {
    fontSize: 8,
    color: '#9ca3af',
    marginTop: 2,
  },

  // Section
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottom: '1 solid #e5e7eb',
    paddingBottom: 4,
  },

  // User Info Box
  userBox: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 4,
    marginBottom: 15,
  },
  userRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    fontSize: 8,
    color: '#6b7280',
    width: '40%',
    fontWeight: 'bold',
  },
  value: {
    fontSize: 9,
    color: '#111827',
    width: '60%',
  },

  // Grid layout (2 columns)
  grid: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  gridCol: {
    flex: 1,
  },

  // Stats cards
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 4,
    border: '1 solid #e5e7eb',
  },
  statLabel: {
    fontSize: 7,
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },

  // Table
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 6,
    borderBottom: '1 solid #d1d5db',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottom: '1 solid #e5e7eb',
  },
  tableCell: {
    fontSize: 7,
    color: '#374151',
  },
  tableHeaderCell: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#111827',
    textTransform: 'uppercase',
  },

  // Badge
  badge: {
    fontSize: 7,
    padding: '2 6',
    borderRadius: 4,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  badgeSuccess: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  badgeWarning: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  badgeDanger: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  badgeInfo: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    fontSize: 7,
    color: '#9ca3af',
    textAlign: 'center',
    borderTop: '1 solid #e5e7eb',
    paddingTop: 10,
  },

  // Warning box (for PEP)
  warningBox: {
    backgroundColor: '#fef3c7',
    border: '1 solid #fbbf24',
    padding: 10,
    borderRadius: 4,
    marginBottom: 15,
  },
  warningText: {
    fontSize: 8,
    color: '#92400e',
    fontWeight: 'bold',
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.companyInfo}>
              {data.brandLogo && (
                <Image src={data.brandLogo} style={styles.logo} />
              )}
              <Text style={styles.companyName}>{data.companyLegalName}</Text>
              <Text style={styles.companyDetails}>
                {data.companyRegistrationNumber && `Reg: ${data.companyRegistrationNumber}\n`}
                {data.companyTaxNumber && `Tax: ${data.companyTaxNumber}\n`}
                {data.companyLicenseNumber && `License: ${data.companyLicenseNumber}\n`}
                {data.companyAddress && `${data.companyAddress}\n`}
                {data.companyEmail && `${data.companyEmail} | `}
                {data.companyPhone && data.companyPhone}
              </Text>
            </View>
            <View style={styles.reportTitle}>
              <Text style={styles.reportTitleText}>USER REPORT</Text>
              <Text style={styles.reportId}>Report ID: {data.reportId}</Text>
              <Text style={styles.reportDate}>Generated: {formatDate(data.reportDate)}</Text>
            </View>
          </View>
        </View>

        {/* User Account Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Account Information</Text>
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
          <Text style={styles.sectionTitle}>Financial Summary</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Volume</Text>
              <Text style={styles.statValue}>€{data.totalVolume.toFixed(2)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Orders</Text>
              <Text style={styles.statValue}>{data.totalOrders}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Completed</Text>
              <Text style={styles.statValue}>{data.completedOrders}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Avg Order</Text>
              <Text style={styles.statValue}>€{data.averageOrderValue.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* KYC Verification Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KYC Verification Status</Text>
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
          <Text style={styles.sectionTitle}>Personal Information</Text>
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
          <Text style={styles.sectionTitle}>Identity Document</Text>
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
        <View style={styles.footer}>
          <Text>
            This report is generated by {data.brandName} platform • Confidential Document
          </Text>
          <Text style={{ marginTop: 2 }}>
            Generated on {formatDate(data.reportDate)} • Page 1 of 2
          </Text>
        </View>
      </Page>

      {/* Page 2: Employment, Source of Funds & Transaction History */}
      <Page size="A4" style={styles.page}>
        {/* Employment & Financial Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employment & Source of Funds</Text>
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
          <Text style={styles.sectionTitle}>Transaction History (Last 20 Orders)</Text>
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

        {/* Login History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Login Activity (Last 5 Sessions)</Text>
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
        <View style={styles.footer}>
          <Text>
            This report is generated by {data.brandName} platform • Confidential Document
          </Text>
          <Text style={{ marginTop: 2 }}>
            Generated on {formatDate(data.reportDate)} • Page 2 of 2
          </Text>
        </View>
      </Page>
    </Document>
  );
};

