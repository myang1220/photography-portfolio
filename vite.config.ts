import { defineConfig } from "vite";

export default defineConfig(() => {
  // Prefer explicit BASE_PATH; otherwise auto-detect repo path on GitHub Actions.
  const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
  const inferredBase =
    process.env.GITHUB_ACTIONS === "true" && repo ? `/${repo}/` : "/";
  const base = process.env.BASE_PATH ?? inferredBase;

  return {
    base,
    root: ".",
    publicDir: "public",
    build: {
      outDir: "dist",
      assetsDir: "assets",
    },
  };
});
