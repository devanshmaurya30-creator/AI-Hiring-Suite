'use client';

import React from 'react';
import Logo from '@/components/ui/Logo';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050816] backdrop-blur-3xl overflow-hidden">
      {/* Ambient Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Cinematic Logo Reveal */}
      <Logo variant="splash" />
    </div>
  );
}
