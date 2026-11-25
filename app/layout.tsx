import type { Metadata, Viewport } from "next";
import { LangProvider, ToastProvider } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daybook",
  description: "Income, expenses and loans for small businesses, in Khmer and English.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Runs before the page paints: applies the saved theme and language so nothing flashes.
const boot = `try{var t=localStorage.getItem('daybook-theme');if(t==='auto'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}
try{var l=null;try{l=localStorage.getItem('daybook-lang');}catch(e){}if(l!=='km'&&l!=='en')l=String(navigator.language||'').toLowerCase().indexOf('km')===0?'km':'en';document.documentElement.lang=l;}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Kantumruy+Pro:wght@400;500;700&display=swap"
        />
      </head>
      <body>
        <LangProvider>
          <ToastProvider>{children}</ToastProvider>
        </LangProvider>
      </body>
    </html>
  );
}
