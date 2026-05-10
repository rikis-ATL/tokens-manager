'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';

type AuthMarketingSplitLayoutProps = {
  children: ReactNode;
};

export function AuthMarketingSplitLayout({ children }: AuthMarketingSplitLayoutProps) {
  return (
    <div
      data-marketing="true"
      className="flex overflow-hidden relative justify-center items-center px-4 py-10 min-h-screen bg-background"
    >
      <div className="absolute inset-0" aria-hidden>
        <Image
          src="/tokenflow.png"
          alt=""
          fill
          className="object-cover object-center"
          sizes="100vw"
          priority
        />
      </div>

      {/* Slight wash so the card and inputs stay readable on a busy screenshot */}
      <div className="absolute inset-0 bg-background/50" aria-hidden />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        aria-hidden
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 w-full max-w-xl">{children}</div>
    </div>
  );
}
