export function isClerkConfigured(environment: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(
    environment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && environment.CLERK_SECRET_KEY,
  );
}
