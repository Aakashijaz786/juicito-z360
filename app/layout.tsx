import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Juicito Order Agent",
  description: "AI-powered restaurant ordering agent (Z360)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
