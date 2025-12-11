"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle, Clock, XCircle, Package, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getApplicationByRefNo } from '@/lib/api/applications';

export default function StatusChecker() {
  const { t } = useLanguage();
  const [refNumber, setRefNumber] = useState('');
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheck = async () => {
    if (!refNumber) return;
    
    setLoading(true);
    setError('');
    setStatus(null);
    
    try {
      // Get from Supabase
      const app = await getApplicationByRefNo(refNumber);
      
      // Map to display format
      setStatus({
        refNumber: app.ref_no,
        name: app.pemohon.name,
        status: app.status,
        submittedDate: new Date(app.submitted_date).toLocaleDateString('ms-MY'),
        updatedDate: app.approved_date ? new Date(app.approved_date).toLocaleDateString('ms-MY') : new Date(app.submitted_date).toLocaleDateString('ms-MY'),
        adminNotes: app.admin_notes,
        noSiri: app.no_siri
      });
    } catch (err: any) {
      console.error('Error checking status:', err);
      setError('No. Id tidak dijumpai. Sila semak semula.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'Dalam Proses':
        return {
          label: 'Dalam Proses',
          icon: <Clock className="h-4 w-4" />,
          variant: 'secondary' as const
        };
      case 'Diluluskan':
        return {
          label: 'Diluluskan',
          icon: <CheckCircle className="h-4 w-4" />,
          variant: 'default' as const
        };
      case 'Sedia Diambil':
        return {
          label: 'Sedia Diambil',
          icon: <Package className="h-4 w-4" />,
          variant: 'default' as const
        };
      case 'Telah Diambil':
        return {
          label: 'Telah Diambil',
          icon: <CheckCircle className="h-4 w-4" />,
          variant: 'default' as const
        };
      case 'Tidak Berjaya':
        return {
          label: 'Permohonan Tidak Berjaya',
          icon: <XCircle className="h-4 w-4" />,
          variant: 'destructive' as const
        };
      default:
        return {
          label: status,
          icon: <Clock className="h-4 w-4" />,
          variant: 'secondary' as const
        };
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t('status.title')}</CardTitle>
        <CardDescription>
          {t('language') === 'ms' 
            ? 'Masukkan nombor rujukan permohonan anda'
            : 'Enter your application reference number'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Input
            placeholder={t('status.refNumber')}
            value={refNumber}
            onChange={(e) => setRefNumber(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCheck()}
          />
          <Button onClick={handleCheck} disabled={loading || !refNumber}>
            <Search className="h-4 w-4 mr-2" />
            {t('status.check')}
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {status && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('status.refNumber')}</p>
                <p className="font-mono font-bold">{status.refNumber}</p>
              </div>
              <Badge variant={getStatusInfo(status.status).variant} className="flex items-center space-x-1">
                {getStatusInfo(status.status).icon}
                <span>{getStatusInfo(status.status).label}</span>
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('form.fullName')}</p>
              <p className="font-medium">{status.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">
                  {t('language') === 'ms' ? 'Tarikh Mohon' : 'Submitted'}
                </p>
                <p>{status.submittedDate}</p>
              </div>
              <div>
                <p className="text-muted-foreground">
                  {t('language') === 'ms' ? 'Kemaskini Terakhir' : 'Last Updated'}
                </p>
                <p>{status.updatedDate}</p>
              </div>
            </div>

            {/* Show No Siri if approved */}
            {status.status === 'approved' && status.noSiri && (
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground">No. Siri</p>
                <p className="font-mono font-bold text-lg text-green-600">{status.noSiri}</p>
              </div>
            )}

            {/* Show Admin Notes if rejected */}
            {status.status === 'rejected' && status.adminNotes && (
              <div className="pt-3 border-t">
                <div className="p-4 bg-red-50 border-l-4 border-l-red-500 rounded">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-red-800 mb-2">
                        Sebab Permohonan Tidak Berjaya:
                      </h4>
                      <p className="text-sm text-red-700">{status.adminNotes}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
