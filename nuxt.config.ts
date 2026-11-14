const ADDRESS = {
  "@type": "PostalAddress",
  streetAddress: "69-03 Woodside Ave",
  addressLocality: "Woodside",
  addressRegion: "NY",
  postalCode: "11377",
  addressCountry: "US"
};

// schema.org JSON-LD for Google (check with the Rich Results Test after deploy).
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "InsuranceAgency",
      "@id": "#agency",
      name: "Delowar Hossain Agency",
      alternateName: "Prime One",
      slogan: "Your trusted partner for TLC, DMV and exceptional service. Where protection meets perfection.",
      address: ADDRESS,
      telephone: ["+1-917-745-0549", "+1-347-400-7830"],
      email: "dhossain143@yahoo.com",
      areaServed: "New York City",
      knowsLanguage: ["en", "bn"],
      employee: [{ "@type": "Person", name: "Delowar Hossain", jobTitle: "Founder" }],
      sameAs: [
        "https://www.facebook.com/delowar.bai",
        "https://www.instagram.com/delowar_hossain_agency/"
      ]
    },
    {
      "@type": "InsuranceAgency",
      name: "PrimeOne Brokerage Inc",
      alternateName: ["PrimeOne TLC", "PrimeOne TLC Express"],
      address: ADDRESS,
      telephone: "+1-917-745-0549",
      email: "primeoneinsurance@gmail.com"
    },
    {
      "@type": "AccountingService",
      name: "Friends & Family Tax Service",
      address: ADDRESS,
      telephone: ["+1-917-745-0549", "+1-347-400-7830"],
      email: "helpfortax1040@gmail.com",
      knowsLanguage: ["en", "bn"],
      employee: [{ "@type": "Person", name: "Kamrun Bithi", jobTitle: "Co-founder" }],
      sameAs: ["https://www.facebook.com/profile.php?id=100063516761659"]
    },
    {
      "@type": "TravelAgency",
      name: "PrimeOne Travels",
      address: ADDRESS,
      telephone: "+1-917-745-0549",
      email: "primeoneinsurance@gmail.com"
    }
  ]
};

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
      title: "Insurance, TLC, DMV & Tax in Woodside, Queens",
      titleTemplate: "%s | Prime One",
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
            "Insurance, TLC, DMV, tax, travel, courses and notary under one roof at 69-03 Woodside Ave, Queens. English and Bangla. Call (917) 745-0549."
        },
        { property: "og:title", content: "Prime One | Insurance, TLC, DMV & Tax in Woodside, Queens" },
        {
          property: "og:description",
          content: "Delowar Hossain Agency, PrimeOne TLC and Friends & Family Tax: one front door on Woodside Ave."
        },
        { property: "og:type", content: "website" },
        { property: "og:image", content: "/og.webp" },
        { name: "theme-color", content: "#d2ff00" }
      ],
      link: [{ rel: "icon", type: "image/png", href: "/favicon.png" }],
      // Name, address and phone must match the Google Business Profile and Facebook pages exactly.
      script: [{ type: "application/ld+json", innerHTML: JSON.stringify(structuredData) }]
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
