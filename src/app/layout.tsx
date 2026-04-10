import type { Metadata } from "next";
import { DM_Mono, DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";

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
  title: {
    default: "Reclaimed Marketplace | Reclaimed materials & architectural salvage",
    template: "%s | Reclaimed Marketplace",
  },
  description:
    "Find local reclamation yards and buy reclaimed materials, architectural salvage, timber, bricks and more. List and sell as an individual or business.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
