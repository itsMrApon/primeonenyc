export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",

  // WebGL + scroll-driven homepage — client SPA only.
  ssr: false,

  devtools: { enabled: true },

  // NUXT_PUBLIC_SERVICES_URL: dashboard endpoint for /calendar (services, forms, key dates;
  // same JSON shape as content/services.json). Empty = bundled JSON.
  runtimeConfig: {
    public: { servicesUrl: "" }
  },

  css: ["~/assets/css/main.css"],

  app: {
    head: {
      title: "Lando Norris | McLaren Formula 1 Driver",
      htmlAttrs: { lang: "en" },
      meta: [
        { charset: "utf-8" },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1, maximum-scale=1"
        },
        {
          name: "description",
          content:
            "Official hub for British racing star Lando Norris: news, race wins, campaigns, helmets, and store."
        },
        { property: "og:title", content: "Lando Norris | McLaren Formula 1 Driver" },
        { property: "og:type", content: "website" },
        { property: "og:image", content: "/og.webp" },
        { name: "theme-color", content: "#d2ff00" }
      ],
      link: [{ rel: "icon", type: "image/png", href: "/favicon.png" }]
    }
  },

  vite: {
    optimizeDeps: {
      include: ["three", "gsap", "gsap/ScrollTrigger", "lenis"]
    }
  },

  routeRules: {
    "/gl/**": { headers: { "Access-Control-Allow-Origin": "*" } }
  },

  typescript: {
    strict: true
  }
});
