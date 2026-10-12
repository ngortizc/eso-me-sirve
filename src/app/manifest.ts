import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Eso Me Sirve",
    short_name: "EMS",
    description: "Dale una nueva vida a lo que ya no usas.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8f5",
    theme_color: "#126b5a",
    lang: "es-CL",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      }
    ]
  };
}
