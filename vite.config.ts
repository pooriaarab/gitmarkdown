import { defineConfig, type Plugin } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { cdnAdapter } from "@vinext/cloudflare/cache/cdn-adapter";
const serverShiki: Plugin = {
  name: "server-shiki",
  enforce: "pre" as const,
  resolveId(source: string) {
    return source === "shiki" && this.environment.name !== "client"
      ? new URL("./src/lib/shiki-server.ts", import.meta.url).pathname : undefined;
  },
};
export default defineConfig({
  plugins: [
    serverShiki,
    vinext({ cache: { cdn: cdnAdapter() } }),
    cloudflare({ viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] } }),
  ],
});
