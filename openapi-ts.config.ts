import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "./docs/llama_openapi.json",
  output: "src/client",
});
