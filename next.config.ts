import type { NextConfig } from "next";

const config: NextConfig = {
  // Drivers com binários/WASM: não empacotar.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
};

export default config;
