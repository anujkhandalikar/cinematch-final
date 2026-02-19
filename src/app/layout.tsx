import type { Metadata } from "next";
import "./globals.css";
import { inter } from "@/lib/fonts";
import { Toaster } from "@/components/ui/sonner";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "CineMatch",
  description: "Find a movie to watch in 3 minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased text-foreground bg-background`}>
        <SiteHeader />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
