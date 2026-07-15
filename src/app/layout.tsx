import type { Metadata } from "next";
import { EB_Garamond, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Providers } from "@/components/Providers";
import "./globals.css";

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Metalurgica",
  description: "Sistema de gestión empresarial",
};

const themeBootstrapScript = `
(function() {
  try {
    var t = sessionStorage.getItem('metalu-theme') || 'azul';
    var themes = {
      azul:    { primary: '#14679C', dark: '#2A4059', darker: '#004C63', light: '#4FB5E0' },
      verde:   { primary: '#10B981', dark: '#047857', darker: '#065F46', light: '#D1FAE5' },
      purpura: { primary: '#8B5CF6', dark: '#6D28D9', darker: '#4C1D95', light: '#EDE9FE' },
      naranja: { primary: '#F97316', dark: '#C2410C', darker: '#9A3412', light: '#FED7AA' }
    };
    var c = themes[t] || themes.azul;
    var r = document.documentElement;
    r.style.setProperty('--theme-primary', c.primary);
    r.style.setProperty('--theme-dark', c.dark);
    r.style.setProperty('--theme-darker', c.darker);
    r.style.setProperty('--theme-light', c.light);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${ebGaramond.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('metalu.fontScale');if(s&&/^0\\.(90|95)$|^1\\.(00|05|10)$/.test(s)){document.documentElement.setAttribute('data-font-scale',s);}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          <Providers>{children}</Providers>
        </TooltipProvider>
      </body>
    </html>
  );
}