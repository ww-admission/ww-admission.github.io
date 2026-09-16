import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import partytown from "@astrojs/partytown";
import tailwind from "@astrojs/tailwind";
import icon from "astro-icon";
import sitemap from "@astrojs/sitemap";

// Pages servies uniquement par l'hôte du back-office → jamais dans le sitemap public
const APP_ONLY = ["/login", "/register", "/admin", "/dashboard"];

// Seule la production publie un sitemap. En staging le site est entièrement
// interdit à l'indexation (robots.txt + X-Robots-Tag), un sitemap n'aurait aucun
// sens et risquerait d'exposer les URLs de test.
const IS_PRODUCTION = process.env.PUBLIC_ENV_NAME === "production";

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://worldwise-admission.com',
  base: '/',
  // deploy.sh construit dans un dossier à part puis bascule : le site en ligne
  // n'est jamais servi depuis un build en cours ou raté.
  outDir: process.env.WWA_OUT_DIR || 'dist',
  output: 'server',
  // Serveur Node autonome (systemd) derrière nginx sur le VPS OVH
  adapter: node({ mode: 'standalone' }),
  integrations: [
    tailwind(),
    icon(),
    ...(IS_PRODUCTION
      ? [
          sitemap({
            filter: (page) => {
              const { pathname } = new URL(page);
              return !APP_ONLY.some(
                (p) => pathname === p || pathname === p + '/' || pathname.startsWith(p + '/'),
              );
            },
          }),
        ]
      : []),
    partytown({
      config: {
        forward: ["dataLayer.push"],
      },
    }),
  ],
});