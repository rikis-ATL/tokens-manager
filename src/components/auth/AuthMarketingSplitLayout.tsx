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
      className="flex overflow-hidden flex-col min-h-screen bg-background lg:flex-row"
    >
      {/* Form — left on large screens */}
      <div className="flex relative flex-col justify-center items-center px-4 py-10 w-full min-h-screen lg:flex-1">
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

      {/* Hero image — right on large screens */}
      {/* <div className="relative hidden min-h-[min(40vh,320px)] w-full shrink-0 lg:block lg:min-h-screen lg:w-1/2 p-6">
      <div className="flex overflow-hidden relative flex-1 h-full rounded-xl"> 
        <Image
          src="/tokenflow.png"
          alt=""
          fill
          className="background-cover"
          sizes="50vw"
          priority
        />
        </div>
      </div> */}
    </div>
  );
}
