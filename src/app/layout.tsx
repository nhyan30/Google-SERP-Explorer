import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Google SERP Explorer — INIZIO Practical Test",
  description:
    "Enter a keyword phrase and get the first page of Google organic results, exportable to JSON or CSV. Built for the INIZIO practical test.",
  keywords: [
    "Google SERP",
    "organic search results",
    "SerpAPI",
    "Google Custom Search",
    "SEO",
    "Next.js",
    "TypeScript",
    "Jest",
  ],
  authors: [{ name: "INIZIO Practical Test" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Google SERP Explorer",
    description:
      "First-page Google organic results, exportable to JSON/CSV. INIZIO practical test.",
    siteName: "Google SERP Explorer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Google SERP Explorer",
    description:
      "First-page Google organic results, exportable to JSON/CSV.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
