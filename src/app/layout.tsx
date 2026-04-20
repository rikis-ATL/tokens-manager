import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@xyflow/react/dist/style.css";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { AuthProviders } from "@/components/providers/AuthProviders";
import { AppThemeProvider } from "@/components/providers/AppThemeProvider";
import { UpgradeModalProvider } from "@/components/billing/UpgradeModalProvider";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Design Token Manager",
  description: "Visual design token editor and manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <AuthProviders>
          <AppThemeProvider>
            <UpgradeModalProvider>
              <LayoutShell>{children}</LayoutShell>
            </UpgradeModalProvider>
          </AppThemeProvider>
        </AuthProviders>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
