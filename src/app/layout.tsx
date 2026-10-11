import type { Metadata } from 'next';
import './globals.css';
import { ClientProviders } from '../components/ClientProviders';

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=JetBrains+Mono:wght@400&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#FAF8F5] text-[#1E1B18] antialiased selection:bg-[#231F1D] selection:text-[#FAF8F5] min-h-screen w-full overflow-x-hidden">
        <ClientProviders>
          <div className="max-w-[1920px] mx-auto w-full min-h-screen flex flex-col">
            {children}
          </div>
        </ClientProviders>
      </body>
    </html>
  );
}
