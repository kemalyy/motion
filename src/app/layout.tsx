import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "LayerMotion — AI Destekli SVG Animasyon Stüdyosu",
  description:
    "SVG ve AI dosyalarınızı katman katman animasyonlara dönüştürün. Gemini AI ile doğal dilde animasyon oluşturun, MP4 olarak dışa aktarın.",
  keywords: ["SVG animasyon", "AI animasyon", "MP4 dönüştürücü", "motion graphics", "katman animasyonu"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cabin:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&family=Lato:wght@300;400;700;900&family=Merriweather:wght@300;400;700;900&family=Montserrat:wght@300;400;500;600;700;800;900&family=Nunito:wght@400;600;700;800&family=Open+Sans:wght@300;400;600;700;800&family=Oswald:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800;900&family=Quicksand:wght@400;500;600;700&family=Raleway:wght@300;400;500;600;700;800;900&family=Roboto:wght@300;400;500;700;900&family=Source+Sans+3:wght@300;400;600;700;900&family=Space+Grotesk:wght@400;500;600;700&family=Ubuntu:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
