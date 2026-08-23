import "./globals.css";
import Providers from "./providers";
import Navbar from "./components/Navbar";
import SiteFooter from "./components/SiteFooter";
import { Manrope, Playfair_Display } from "next/font/google";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Sunni Brothers Association | Learn, live, and give well",
    template: "%s | Sunni Brothers Association",
  },
  description: "A welcoming digital home for Quran education, Islamic learning, family support, and community care.",
  openGraph: {
    title: "Sunni Brothers Association",
    description: "Faith, knowledge, and community in one welcoming digital home.",
    type: "website",
  },
};

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${playfair.variable}`} style={{ margin: 0 }}>
        <Providers>
          <Navbar />
          {children}
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
