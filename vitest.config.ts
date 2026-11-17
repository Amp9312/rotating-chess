import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
plugins: [react(), cloudflare({ viteEnvironment: { name: "worker" } })],

    test: {
        environment: "node",
        globals: true,
    },
});
