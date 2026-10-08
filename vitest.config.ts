import { defineConfig, type Plugin } from "vitest/config";

function resolveProjectJsToTs(): Plugin {
  return {
    name: "resolve-project-js-to-ts",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!importer || importer.includes("node_modules")) return null;
      if (!source.startsWith(".") || !source.endsWith(".js")) return null;
      const resolved = await this.resolve(
        source.slice(0, -3) + ".ts",
        importer,
        {
          ...options,
          skipSelf: true,
        },
      );
      return resolved ?? null;
    },
  };
}

export default defineConfig({
  plugins: [resolveProjectJsToTs()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
