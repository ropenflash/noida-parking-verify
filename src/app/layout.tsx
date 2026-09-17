import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
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

const assistantName =
  process.env.NEXT_PUBLIC_ASSISTANT_NAME?.trim() || "Assistant";

export const metadata: Metadata = {
  title: assistantName,
  description: "Personal AI assistant for voice and text conversations.",
  applicationName: assistantName,
};

export const viewport: Viewport = {
  themeColor: "#05060d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#05060d] text-zinc-100">{children}</body>
    </html>
  );
}
