/**
 * KYC Resubmission Helper
 * 
 * Maps Sumsub rejectLabels to required document types for resubmission
 * Based on: https://docs.sumsub.com/docs/receive-and-interpret-results-via-api
 */

export type ResubmitAction = 
  | 'LAUNCH_SDK'           // For selfie/liveness - use Sumsub SDK
  | 'UPLOAD_IDENTITY'      // Upload ID document (passport or ID card)
  | 'UPLOAD_ADDRESS'       // Upload proof of address
  | 'EDIT_FORM'            // Edit form data (PROBLEMATIC_APPLICANT_DATA)
  | 'FULL_RESET';          // FINAL rejection - full reset required

export interface ResubmitRequirement {
  action: ResubmitAction;
  label: string;
  description: string;
  documentType?: 'IDENTITY' | 'SELFIE' | 'PROOF_OF_ADDRESS';
  isCritical?: boolean; // For FINAL rejections
}

/**
 * Map Sumsub rejectLabel to resubmit requirement
 */
export function mapRejectLabelToRequirement(label: string): ResubmitRequirement {
  // Selfie/Liveness issues → Launch SDK
  if (label === 'BAD_SELFIE' || 
      label === 'BAD_VIDEO_SELFIE' || 
      label === 'FRAUDULENT_LIVENESS' ||
      label === 'BAD_FACE_MATCHING' ||
      label === 'SELFIE_MISMATCH') {
    return {
      action: 'LAUNCH_SDK',
      label,
      description: 'Retake selfie using verification tool',
      documentType: 'SELFIE'
    };
  }

  // Identity document issues → Upload new ID
  if (label === 'BAD_PROOF_OF_IDENTITY' ||
      label === 'FRONT_SIDE_MISSING' ||
      label === 'BACK_SIDE_MISSING' ||
      label === 'ID_INVALID' ||
      label === 'EXPIRATION_DATE' ||
      label === 'DOCUMENT_DAMAGED' ||
      label === 'LOW_QUALITY' ||
      label === 'BLACK_AND_WHITE' ||
      label === 'INCOMPLETE_DOCUMENT' ||
      label === 'UNSATISFACTORY_PHOTOS' ||
      label === 'SCREENSHOTS' ||
      label === 'DIGITAL_DOCUMENT' ||
      label === 'GRAPHIC_EDITOR') {
    return {
      action: 'UPLOAD_IDENTITY',
      label,
      description: 'Upload clear photo of your ID document',
      documentType: 'IDENTITY'
    };
  }

  // Address document issues → Upload new proof of address
  if (label === 'BAD_PROOF_OF_ADDRESS' ||
      label === 'WRONG_ADDRESS' ||
      label === 'INCOMPATIBLE_LANGUAGE' ||
      label === 'DOCUMENT_PAGE_MISSING') {
    return {
      action: 'UPLOAD_ADDRESS',
      label,
      description: 'Upload valid proof of address',
      documentType: 'PROOF_OF_ADDRESS'
    };
  }

  // Form data issues → Edit form
  if (label === 'PROBLEMATIC_APPLICANT_DATA' ||
      label === 'REQUESTED_DATA_MISMATCH' ||
      label === 'INCORRECT_SOCIAL_NUMBER') {
    return {
      action: 'EDIT_FORM',
      label,
      description: 'Update your personal information',
    };
  }

  // FINAL rejection labels → Full reset required
  if (label === 'FORGERY' ||
      label === 'DOCUMENT_TEMPLATE' ||
      label === 'FRAUDULENT_PATTERNS' ||
      label === 'INCONSISTENT_PROFILE' ||
      label === 'SPAM' ||
      label === 'THIRD_PARTY_INVOLVED' ||
      label === 'PEP' ||
      label === 'SANCTIONS' ||
      label === 'BLOCKLIST' ||
      label === 'DUPLICATE' ||
      label === 'CRIMINAL' ||
      label === 'ADVERSE_MEDIA') {
    return {
      action: 'FULL_RESET',
      label,
      description: 'This rejection is final. Contact support.',
      isCritical: true
    };
  }

  // Default: treat as document upload
  return {
    action: 'UPLOAD_IDENTITY',
    label,
    description: 'Upload corrected document',
    documentType: 'IDENTITY'
  };
}

/**
 * Analyze rejectLabels and determine what user needs to do
 */
export interface ResubmitAnalysis {
  canResubmit: boolean;
  reviewRejectType: 'RETRY' | 'FINAL' | null;
  primaryAction: ResubmitAction;
  requirements: ResubmitRequirement[];
  needsSdk: boolean;
  needsDocumentUpload: boolean;
  needsFormEdit: boolean;
  isFinal: boolean;
}

export function analyzeRejection(
  reviewRejectType: string | null | undefined,
  rejectLabels: string[] = []
): ResubmitAnalysis {
  // FINAL rejection
  if (reviewRejectType === 'FINAL') {
    return {
      canResubmit: false,
      reviewRejectType: 'FINAL',
      primaryAction: 'FULL_RESET',
      requirements: rejectLabels.map(mapRejectLabelToRequirement),
      needsSdk: false,
      needsDocumentUpload: false,
      needsFormEdit: false,
      isFinal: true
    };
  }

  // RETRY rejection
  if (reviewRejectType === 'RETRY') {
    const requirements = rejectLabels.map(mapRejectLabelToRequirement);
    
    const needsSdk = requirements.some(r => r.action === 'LAUNCH_SDK');
    const needsDocumentUpload = requirements.some(
      r => r.action === 'UPLOAD_IDENTITY' || r.action === 'UPLOAD_ADDRESS'
    );
    const needsFormEdit = requirements.some(r => r.action === 'EDIT_FORM');

    // Determine primary action
    let primaryAction: ResubmitAction = 'UPLOAD_IDENTITY';
    if (needsSdk) {
      primaryAction = 'LAUNCH_SDK';
    } else if (needsFormEdit) {
      primaryAction = 'EDIT_FORM';
    } else if (needsDocumentUpload) {
      primaryAction = 'UPLOAD_IDENTITY';
    }

    return {
      canResubmit: true,
      reviewRejectType: 'RETRY',
      primaryAction,
      requirements,
      needsSdk,
      needsDocumentUpload,
      needsFormEdit,
      isFinal: false
    };
  }

  // Unknown or no reviewRejectType
  return {
    canResubmit: false,
    reviewRejectType: null,
    primaryAction: 'FULL_RESET',
    requirements: [],
    needsSdk: false,
    needsDocumentUpload: false,
    needsFormEdit: false,
    isFinal: false
  };
}

/**
 * Format reject label for display
 */
export function formatRejectLabel(label: string): string {
  return label
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase());
}

