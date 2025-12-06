import { defineConfig } from "astro/config";
import partytown from "@astrojs/partytown";
import tailwind from "@astrojs/tailwind";
import icon from "astro-icon";

import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  // Le nom de domaine sur lequel le site est déployé
  site: 'https://worldwise-admission.com', 
  // Le chemin de base du site
  base: '/', 
  // Le dossier de destination
  outDir: 'dist', 
  integrations: [
    tailwind(),
    icon(),
    sitemap(),
    partytown({
      config: {
        forward: ["dataLayer.push"],
      },
    }),
  ],
});
