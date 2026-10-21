import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_JP, Noto_Sans_SC, Plus_Jakarta_Sans } from "next/font/google";
import { en } from "@/modules/i18n/en";
import "./globals.css";

// Self-hosted at build time by next/font (DEC-027); no runtime request to Google.
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin", "vietnamese"], variable: "--font-jakarta", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// CJK families are large: not preloaded, fetched only when lang-tagged text needs them.
const notoJp = Noto_Sans_JP({ subsets: ["latin"], variable: "--font-noto-jp", display: "swap", preload: false });
const notoSc = Noto_Sans_SC({ subsets: ["latin"], variable: "--font-noto-sc", display: "swap", preload: false });

export const metadata: Metadata = {
  title: en.app.name,
  description: en.app.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// UI language is English (DEC-029); learning-language text sets its own lang.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${inter.variable} ${notoJp.variable} ${notoSc.variable} h-full antialiased`}
    >
      <body className="min-h-full text-ink">{children}</body>
    </html>
  );
}
