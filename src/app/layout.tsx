import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ClientProviders } from '../components/ClientProviders';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#FAF8F5',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || 'https://aabhaclothing.in'),
  title: "AABHA CLOTHING — Premium Indian Women's Ethnic Wear",
  description:
    "A contemporary Indian women's ethnic-wear house crafting minimal silhouettes, handwoven Chanderi silks, and timeless everyday elegance.",
  icons: {
    icon: '/logo.svg',
  },
  openGraph: {
    title: "AABHA CLOTHING — Premium Indian Women's Ethnic Wear",
    description:
      "A contemporary Indian women's ethnic-wear house crafting minimal silhouettes, handwoven Chanderi silks, and timeless everyday elegance.",
    type: 'website',
    url: 'https://aabhaclothing.in',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=JetBrains+Mono:wght@400&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          rel="preload"
          as="image"
          href="/images/hero_editorial_banner_1791119088652.jpg"
          fetchPriority="high"
        />
      </head>
      <body className="bg-[#FAF8F5] text-[#1E1B18] antialiased selection:bg-[#231F1D] selection:text-[#FAF8F5] min-h-screen w-full max-w-full overflow-x-hidden">
        <ClientProviders>
          <div className="max-w-[1920px] mx-auto w-full min-h-screen flex flex-col overflow-x-hidden">
            {children}
          </div>
        </ClientProviders>
      </body>
    </html>
  );
}
