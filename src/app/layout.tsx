import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  applicationName: "PatchSignal",
  title: {
    default: "PatchSignal",
    template: "%s | PatchSignal",
  },
  description:
    "Structured Overwatch patch note analysis by hero and meta impact.",
  openGraph: {
    title: "PatchSignal",
    description:
      "Structured Overwatch patch note analysis by hero and meta impact.",
    siteName: "PatchSignal",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
