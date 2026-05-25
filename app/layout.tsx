import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: {
    default: "Memorable Pictures — AI-Powered Wedding Photography",
    template: "%s | Memorable Pictures",
  },
  description:
    "Premium AI-powered wedding photography management platform. Face recognition, instant photo delivery, and beautiful gallery experiences for your special day.",
  keywords: [
    "wedding photography",
    "AI face recognition",
    "photo management",
    "wedding gallery",
    "event photography",
  ],
  authors: [{ name: "Memorable Pictures" }],
  creator: "Memorable Pictures",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://memorablepictures.com",
    title: "Memorable Pictures — AI-Powered Wedding Photography",
    description:
      "Premium AI-powered wedding photography management platform with instant face recognition photo delivery.",
    siteName: "Memorable Pictures",
  },
  twitter: {
    card: "summary_large_image",
    title: "Memorable Pictures",
    description: "AI-Powered Wedding Photography Platform",
    creator: "@memorablepics",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f1a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange={false}
        >
          <QueryProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "hsl(var(--card))",
                  color: "hsl(var(--card-foreground))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  fontSize: "14px",
                },
                success: {
                  iconTheme: {
                    primary: "hsl(var(--primary))",
                    secondary: "white",
                  },
                },
              }}
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
