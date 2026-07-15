import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { resolveCompany } from "@/lib/company-context";
import { buildThemeStyle } from "@/lib/theme";
import { Providers } from "@/components/providers";
import "./globals.css";

const display = Space_Grotesk({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const viewport: Viewport = {
  themeColor: "#2563EB",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const company = await resolveCompany();
  const title = company
    ? `${company.name} · WorkPilot`
    : "WorkPilot - White-Label HRMS";
  const icons =
    company?.faviconUrl || company?.logoUrl
      ? {
          icon: [
            {
              url: `/api/brand/icon?kind=favicon&companyId=${company.id}`,
            },
            { url: "/favicon.svg", type: "image/svg+xml" },
          ],
          shortcut: `/api/brand/icon?kind=favicon&companyId=${company.id}`,
          apple: `/api/brand/icon?kind=logo&companyId=${company.id}`,
        }
      : {
          icon: [
            { url: "/favicon.svg", type: "image/svg+xml" },
            { url: "/icons/icon.svg", type: "image/svg+xml" },
          ],
          shortcut: "/favicon.svg",
          apple: "/icons/icon.svg",
        };

  return {
    title,
    description: company
      ? `${company.name} WorkPilot portal - punch, leave, payslips`
      : "White-label multi-tenant WorkPilot platform",
    applicationName: company ? `${company.name} Portal` : "WorkPilot",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: company?.name?.slice(0, 12) || "WorkPilot",
    },
    formatDetection: { telephone: false },
    icons,
    manifest: "/manifest.webmanifest",
    other: {
      "mobile-web-app-capable": "yes",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const company = await resolveCompany();

  const themeStyle = buildThemeStyle(
    company
      ? {
          primaryColor: company.primaryColor,
          secondaryColor: company.secondaryColor,
          logoUrl: company.logoUrl,
          faviconUrl: company.faviconUrl,
        }
      : null
  );

  return (
    <html
      lang="en"
      className={`${display.variable} ${mono.variable} h-full antialiased`}
      style={themeStyle}
      suppressHydrationWarning
    >
      <body
        className="flex min-h-full flex-col text-[var(--foreground)]"
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
