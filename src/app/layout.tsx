import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PwaRegistrar } from "@/app/pwa-registrar";
import { SiteShell } from "@/components/layout/site-shell";
import "@/app/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: {
    default: "Eso Me Sirve",
    template: "%s · Eso Me Sirve"
  },
  description: "Una comunidad para darle una nueva vida a las cosas que ya no usas.",
  applicationName: "Eso Me Sirve",
  manifest: "/manifest.webmanifest",
  robots: {
    index: false,
    follow: false
  }
};

export const viewport: Viewport = {
  themeColor: "#126B5A",
  colorScheme: "light"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es-CL" data-scroll-behavior="smooth">
      <body>
        <SiteShell>{children}</SiteShell>
        <PwaRegistrar />
      </body>
    </html>
  );
}
