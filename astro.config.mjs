import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import partytown from "@astrojs/partytown";
import tailwind from "@astrojs/tailwind";
import icon from "astro-icon";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: 'https://worldwise-admission.com',
  base: '/',
  outDir: 'dist',
  output: 'server',
  adapter: vercel(),
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
