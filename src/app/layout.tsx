import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Water Advisor",
  description: "Water source diagnosis and corrective protocols for aquaculture stocking plans.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
