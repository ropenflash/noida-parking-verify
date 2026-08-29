import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/app-shell";
import { PwaRegister } from "@/components/pwa-register";
import { getSessionUser } from "@/lib/auth/session";
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
  title: {
    default: "Noida Parking Verify",
    template: "%s · Noida Parking Verify",
  },
  description:
    "Evidence-based parking verification and reporting for Noida, Uttar Pradesh. Not a legal determination.",
  applicationName: "Noida Parking Verify",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Noida Parking Verify",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#18181b",
  width: "device-width",
  initialScale: 1,
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: LayoutProps<"/">) {
  const { profile } = await getSessionUser();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-50 text-zinc-900">
        <PwaRegister />
        <AppShell profile={profile}>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  );
}
