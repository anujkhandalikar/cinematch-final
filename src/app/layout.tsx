import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { inter } from "@/lib/fonts";
import { Toaster } from "@/components/ui/sonner";
import SiteHeader from "@/components/SiteHeader";
import { GA_MEASUREMENT_ID, GA_SECONDARY_ID } from "@/lib/analytics";

export const metadata: Metadata = {
  title: "CineMatch",
  description: "Find a movie to watch in 3 minutes.",
  icons: {
    icon: "/cinematch_logo.png",
    apple: "/cinematch_logo.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
            gtag('config', '${GA_SECONDARY_ID}', {
              page_path: window.location.pathname,
            });
          `}
        </Script>
      </head>
      <body className={`${inter.variable} font-sans antialiased text-foreground bg-background flex flex-col min-h-[100dvh]`}>
        <SiteHeader />
        <main className="flex-1 flex flex-col">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
