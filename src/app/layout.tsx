import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AtuiProvider } from "@/components/AtuiProvider";

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
        <AtuiProvider>
          {children}
        </AtuiProvider>
      </body>
    </html>
  );
}
