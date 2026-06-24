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
  title: "Wire App — Electrical Schematic Editor",
  description:
    "A visual, browser-based editor for designing low-voltage electrical distribution networks. Build schematics with drag-and-drop nodes, connect them with cables, and run calculations automatically.",
  openGraph: {
    title: "Wire App — Electrical Schematic Editor",
    description:
      "Design low-voltage electrical schematics in your browser. Drag-and-drop nodes, wire connections, auto-layout, and built-in calculations.",
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
