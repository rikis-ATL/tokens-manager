import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth";
import "./globals.css";
import "@xyflow/react/dist/style.css";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { AuthProviders } from "@/components/providers/AuthProviders";
import { AppThemeProvider } from "@/components/providers/AppThemeProvider";
import { UpgradeModalProvider } from "@/components/billing/UpgradeModalProvider";
import { authOptions } from "@/lib/auth/nextauth.config";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "tokenflow",
  description: "Visual design token editor and manager",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        <AuthProviders>
          <AppThemeProvider>
            <UpgradeModalProvider>
              <LayoutShell hasSession={Boolean(session)}>{children}</LayoutShell>
            </UpgradeModalProvider>
          </AppThemeProvider>
        </AuthProviders>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
