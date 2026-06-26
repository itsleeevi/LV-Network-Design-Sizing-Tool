import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LV Network Design & Sizing Tool",
  description:
    "Browser-based tool for low-voltage (0.4 kV) distribution network design and sizing. Lay out the cable network as a schematic and get cable sizing, voltage drop, loop impedance, and short-circuit calculations automatically.",
  openGraph: {
    title: "LV Network Design & Sizing Tool",
    description:
      "Design and size low-voltage (0.4 kV) cable distribution networks in your browser, with schematic layout, auto-layout, and built-in electrical calculations.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
