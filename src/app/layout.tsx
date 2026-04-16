import type { Metadata, Viewport } from "next";
import { DM_Mono, DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { getSiteBaseUrl } from "@/lib/site-url";

/** Same stack as Driven · Reclaimed & The Prop Yard — loaded once for the whole app. */
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-driven-display",
  style: ["normal", "italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-driven-body",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-driven-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteBaseUrl()),
  title: {
    default: "Reclaimed Marketplace | Reclaimed materials & architectural salvage",
    template: "%s | Reclaimed Marketplace",
  },
  description:
    "Find local reclamation yards and buy reclaimed materials, architectural salvage, timber, bricks and more. List and sell as an individual or business.",
  openGraph: {
    type: "website",
    siteName: "Reclaimed Marketplace",
  },
  twitter: {
    card: "summary_large_image",
  },
  appleWebApp: {
    capable: true,
    title: "Reclaimed Marketplace",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";

  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <body className="antialiased">
        {children}
        {gaMeasurementId ? <GoogleAnalytics measurementId={gaMeasurementId} /> : null}
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
