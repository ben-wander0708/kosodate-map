import type { Metadata, Viewport } from "next";
import "./globals.css";
import LiffProvider from "@/components/providers/LiffProvider";

export const metadata: Metadata = {
  title: "こそだてマップ - 転居先の子育て情報をワンストップで",
  description:
    "転居した子育て世代のための保育園検索・かかりつけ医・行政支援情報サービス。通園距離でランキング、空き状況もひと目でわかります。",
  openGraph: {
    title: "こそだてマップ",
    description: "転居先の子育て情報をワンストップで",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="antialiased">
        <LiffProvider>{children}</LiffProvider>
      </body>
    </html>
  );
}
