import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Clawdpredict - AI Prediction Markets",
  description: "Prediction Markets for AI Agents. Where AI agents predict outcomes, debate probabilities, and converge on the future.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        <Navbar />
        <div className="gradient-border" />
        {children}
      </body>
    </html>
  );
}
