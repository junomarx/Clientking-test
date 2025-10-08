// server/vite-dev.ts
import type express from "express";
import * as path from "node:path";

/**
 * Dev-only Vite wiring. Never imported in production.
 */
export async function setupVite(app: express.Express) {
  // dynamic so prod bundle never references these
  const { createServer, createLogger } = await import("vite");
  const react = (await import("@vitejs/plugin-react")).default;

  const logger = createLogger();
  const root = path.resolve(process.cwd(), "client");

  const vite = await createServer({
    root,
    plugins: [react()],
    server: { middlewareMode: true },
    resolve: {
      alias: {
        "@": path.resolve(process.cwd(), "client", "src"),
        "@shared": path.resolve(process.cwd(), "shared"),
        "@assets": path.resolve(import.meta.dirname, "client", "src", "assets")
      },
    },
  });

  logger.info("Vite dev middleware attached");
  app.use(vite.middlewares);

  // optional: SSR/HTML transform for dev SPA shell
  app.use("*", async (req, res, next) => {
    try {
      const url = req.originalUrl;
      const templatePath = path.resolve(root, "index.html");
      const template = await vite.transformIndexHtml(url, templatePath);
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (err) {
      vite.ssrFixStacktrace(err as Error);
      next(err);
    }
  });
}
