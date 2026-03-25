import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gerald — Book Publishing Strategy Call",
  description:
    "Speak with Gerald to explore how we can help you write and publish your book.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
