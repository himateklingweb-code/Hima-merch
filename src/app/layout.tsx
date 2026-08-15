import type { Metadata } from "next";
import { Source_Serif_4 } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";

const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "HIMA Teknik Lingkungan UNTAN",
    template: "%s — HIMA Teknik Lingkungan UNTAN",
  },
  description:
    "Website resmi Himpunan Mahasiswa Teknik Lingkungan, Universitas Tanjungpura, Pontianak.",
  keywords: [
    "himatl untan",
    "teknik lingkungan untan",
    "hima teknik lingkungan pontianak",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${sourceSerif.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
