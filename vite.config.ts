import { defineConfig } from "vite";

export default defineConfig(() => {
  // For GitHub Pages, the site is usually served under `/<repo>/`.
  // The deploy workflow sets BASE_PATH accordingly.
  const base = process.env.BASE_PATH ?? "/";

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
