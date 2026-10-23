export default {
  worker: {
    name: "discord-buildnumber",
    compatibilityDate: "2026-10-22",
    entrypoint: "./main.js",
    observability: { enabled: true },
    domains: ["dbn.ht1.top"],
  },
};
