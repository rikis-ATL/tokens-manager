import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
