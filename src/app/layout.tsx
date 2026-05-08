import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "AMC Motors AI Sales Advisor",
  description: "Proof-of-concept automotive brand website with an embedded agentic AI sales advisor."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
