import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "子育てノート";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a7a52 0%, #2d9e6b 60%, #4cc38a 100%)",
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        {/* アイコン */}
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: "24px",
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 56,
            marginBottom: 32,
          }}
        >
          🌿
        </div>

        {/* サービス名 */}
        <div
          style={{
            fontSize: 64,
            fontWeight: "bold",
            color: "white",
            marginBottom: 16,
            letterSpacing: "-1px",
          }}
        >
          子育てノート
        </div>

        {/* サブタイトル */}
        <div
          style={{
            fontSize: 30,
            color: "rgba(255,255,255,0.85)",
            marginBottom: 40,
          }}
        >
          KOSODATE NOTE
        </div>

        {/* 説明文 */}
        <div
          style={{
            fontSize: 24,
            color: "rgba(255,255,255,0.75)",
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          保育園・幼稚園・医療機関・子育て支援をまとめて確認
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            right: 60,
            fontSize: 20,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          kosodate-note.app
        </div>
      </div>
    ),
    size
  );
}
