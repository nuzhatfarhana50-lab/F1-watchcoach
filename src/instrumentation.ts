export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logger } = await import("@/lib/observability/logger");
  logger.info("Server instrumentation registered", {
    runtime: process.env.NEXT_RUNTIME,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  });
}
