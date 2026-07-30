import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Juicito Order Agent",
  description: "AI-powered restaurant ordering agent (Z360)",
  icons: {
    icon: "/favicon.svg",
  },
};

const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        {children}
        <Toaster richColors position="top-right" theme="system" />
      </body>
    </html>
  );
}
