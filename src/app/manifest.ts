import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "総社子育てノート",
    short_name: "子育てノート",
    description: "引越し前から使える保育園・子育て情報。住所が決まったその日から。",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f9fc",
    theme_color: "#4CAF82",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
