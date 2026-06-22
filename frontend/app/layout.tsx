import type { Metadata } from 'next';
import './globals.css';
import LenisProvider from '@/components/layout/LenisProvider';
import BackgroundEffects from '@/components/ui/BackgroundEffects';
import CustomCursor from '@/components/ui/CustomCursor';
import ThemeRoot from '@/components/layout/ThemeRoot';

export const metadata: Metadata = {
  title: 'AI Hiring Assistant',
  description: 'AI-Powered Resume Analysis, Skill Matching & Technical Interview Bot',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-surface text-slate-100 antialiased selection:bg-brand-cyan/30 selection:text-white relative min-h-screen">
        <LenisProvider>
          <ThemeRoot>
            <BackgroundEffects />
            <CustomCursor />
            {children}
          </ThemeRoot>
        </LenisProvider>
      </body>
    </html>
  );
}
