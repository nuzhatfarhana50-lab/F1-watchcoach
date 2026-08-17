import { z } from "zod";

const logLevels = ["debug", "info", "warn", "error"] as const;

export const serverEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  LOG_LEVEL: z.enum(logLevels).default("info"),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export class EnvironmentConfigurationError extends Error {
  constructor(public readonly invalidKeys: readonly string[]) {
    super(`Invalid server environment: ${invalidKeys.join(", ")}`);
    this.name = "EnvironmentConfigurationError";
  }
}

export function parseServerEnvironment(
  input: Record<string, string | undefined>,
): ServerEnvironment {
  const parsed = serverEnvironmentSchema.safeParse(input);

  if (!parsed.success) {
    const invalidKeys = parsed.error.issues.map((issue) =>
      issue.path.length > 0 ? issue.path.join(".") : "environment",
    );
    throw new EnvironmentConfigurationError([...new Set(invalidKeys)]);
  }

  return parsed.data;
}
