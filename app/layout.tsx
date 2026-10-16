import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kiko",
  description: "Không gian tự học tiếng Trung, tiếng Nhật và tiếng Anh.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// UI language is Vietnamese (proposal); learning-language text sets its own lang.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full bg-background text-text">{children}</body>
    </html>
  );
}
