import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@xyflow/react/dist/style.css";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { AuthProviders } from "@/components/providers/AuthProviders";
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
          <LayoutShell>{children}</LayoutShell>
        </AuthProviders>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
