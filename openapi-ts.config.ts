import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "./docs/llama_openapi.json",
  output: "src/client",
  plugins: [
    {name: "@hey-api/sdk", validator: true},
    "@hey-api/typescript",
    "@hey-api/client-fetch",
    "@tanstack/react-query",
    "zod",
  ]
});
