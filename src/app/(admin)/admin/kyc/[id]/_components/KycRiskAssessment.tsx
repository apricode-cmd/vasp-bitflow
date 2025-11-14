/**
 * KycRiskAssessment
 * 
 * Visual risk score display with color-coded indicators
 */

'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface KycRiskAssessmentProps {
  riskScore: number;
}

export function KycRiskAssessment({ riskScore }: KycRiskAssessmentProps): JSX.Element {
  // Determine risk level
  const getRiskLevel = (score: number): {
    label: string;
    variant: 'default' | 'secondary' | 'destructive';
    color: string;
    icon: JSX.Element;
  } => {
    if (score <= 30) {
      return {
        label: 'Low Risk',
        variant: 'default',
        color: 'bg-green-500',
        icon: <CheckCircle className="h-4 w-4" />
      };
    } else if (score <= 60) {
      return {
        label: 'Medium Risk',
        variant: 'secondary',
        color: 'bg-yellow-500',
        icon: <AlertTriangle className="h-4 w-4" />
      };
    } else {
      return {
        label: 'High Risk',
        variant: 'destructive',
        color: 'bg-red-500',
        icon: <AlertTriangle className="h-4 w-4" />
      };
    }
  };

  const risk = getRiskLevel(riskScore);

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Shield className="h-4 w-4" />
        Risk Assessment
      </h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Risk Level</span>
          <Badge variant={risk.variant} className="flex items-center gap-1">
            {risk.icon}
            {risk.label}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Risk Score</span>
          <Badge variant="outline" className="font-mono">
            {riskScore} / 100
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div 
              className={`h-3 rounded-full transition-all ${risk.color}`}
              style={{ width: `${riskScore}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {riskScore <= 30 && 'This user presents a low risk profile'}
            {riskScore > 30 && riskScore <= 60 && 'This user presents a medium risk profile - additional verification may be needed'}
            {riskScore > 60 && 'This user presents a high risk profile - enhanced due diligence required'}
          </p>
        </div>
      </div>
    </Card>
  );
}

