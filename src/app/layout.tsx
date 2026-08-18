import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { isClerkConfigured } from "@/lib/auth/configuration";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "F1 Watchcoach",
    template: "%s · F1 Watchcoach",
  },
  description: "Turn real Formula 1 race moments into lasting understanding.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const content = <>{children}</>;
  return (
    <html lang="en" className="dark">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {isClerkConfigured() ? <ClerkProvider>{content}</ClerkProvider> : content}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
