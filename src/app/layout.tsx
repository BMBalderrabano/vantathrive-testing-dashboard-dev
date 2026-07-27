import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { QaProvider } from "@/context/qa-context";
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
  title: "Testing Dashboard (dev)",
  description: "VantaVerse mirror QA testing dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AnimatedBackground />
        <div className="relative z-10 min-h-screen">
          <QaProvider>{children}</QaProvider>
        </div>
      </body>
    </html>
  );
}
