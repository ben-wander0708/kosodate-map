import type { Metadata, Viewport } from "next";
import "./globals.css";
import LiffProvider from "@/components/providers/LiffProvider";

export const metadata: Metadata = {
  title: "総社子育てノート｜転入前から使える子育て情報",
  description:
    "総社市への転入前から保育園の空き状況・転入手続き・子育て支援をまとめて確認。住所が決まったその日から使えます。",
  keywords: ["保育園", "引越し", "転居", "子育て", "空き状況", "総社市", "岡山", "転入", "子育てノート"],

  openGraph: {
    title: "総社子育てノート｜転入前から使える子育て情報",
    description: "総社市への転入前から保育園の空き状況・転入手続き・子育て支援をまとめて確認。住所が決まったその日から使えます。",
    type: "website",
    url: "https://kosodate-note.app",
    siteName: "総社子育てノート",
    images: [
      {
        url: "https://kosodate-note.app/opengraph-image",
        width: 1200,
        height: 630,
        alt: "総社子育てノート",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "総社子育てノート｜転入前から使える子育て情報",
    description: "総社市への転入前から保育園の空き状況・転入手続き・子育て支援をまとめて確認。住所が決まったその日から使えます。",
    images: ["https://kosodate-note.app/opengraph-image"],
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
