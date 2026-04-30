import type { Metadata } from "next";
import { ToastProvider } from "./_components/ToastProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Here it! | あなたは今、ここにいる。",
  description: "空間の魅力を、体験へ",
  openGraph: {
    title: "Here it! | あなたは今、ここにいる。",
    description: "空間の魅力を、体験へ",
    siteName: "Here it!",
    images: [
      {
        url: "https://pub-7f4fa38bd5a243cda2e892120e611775.r2.dev/site/ogp.png",
        width: 1200,
        height: 630,
        alt: "Here it!",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Here it! | あなたは今、ここにいる。",
    description: "空間の魅力を、体験へ",
    images: ["https://pub-7f4fa38bd5a243cda2e892120e611775.r2.dev/site/ogp.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
