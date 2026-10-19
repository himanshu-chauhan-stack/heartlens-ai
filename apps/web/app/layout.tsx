import type { Metadata } from "next";
import { BRAND } from "./lib/brand";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
export const metadata: Metadata = {
  title: `${BRAND.name} — Your cardiovascular profile`,
  description:
    "Explore a model-estimated cardiovascular disease likelihood with transparent inputs, assumptions and same-model scenarios.",
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/heartlens.svg` },
  openGraph: {
    title: BRAND.name,
    description: BRAND.tagline,
    siteName: BRAND.name,
    type: "website",
  },
  authors: [{ name: BRAND.author }],
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
