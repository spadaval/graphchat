import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import {nitro} from "nitro/vite";

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart({
      // FIXME spa prerender can't be disabled, and prerender currently fails quite often due to port conflicts (spams thousands of ports). Need to fix it and/or report the issue.
      spa: {
         enabled: true,
     },
      prerender: {
        enabled: false
      }
    }),
    viteReact(),
    tailwindcss(),
    nitro()
  ],
});
