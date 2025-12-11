"use client";

import { LanguageProvider } from '@/contexts/LanguageContext';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      {children}
      <Toaster position="top-center" richColors />
    </LanguageProvider>
  );
}
