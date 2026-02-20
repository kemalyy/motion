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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=Montserrat:wght@400;600;700;800;900&family=Poppins:wght@400;600;700;800;900&family=Outfit:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
