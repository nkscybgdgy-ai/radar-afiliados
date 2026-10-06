import type { NextConfig } from "next";

const config: NextConfig = {
  // Drivers com binários/WASM: não empacotar.
  serverExternalPackages: ["@electric-sql/pglite", "pg", "@resvg/resvg-js"],
  // A fonte do pin é lida do disco em tempo de execução: inclui no pacote de deploy.
  outputFileTracingIncludes: { "/api/pin/**": ["./assets/fonts/**"] },
};

export default config;
