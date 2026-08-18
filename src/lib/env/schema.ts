import { z } from "zod";

const logLevels = ["debug", "info", "warn", "error"] as const;
const optionalSecret = z.preprocess((value) => value === "" ? undefined : value, z.string().min(20).optional());

export const serverEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  LOG_LEVEL: z.enum(logLevels).default("info"),
  OPENAI_API_KEY: optionalSecret,
  AI_WORKFLOW_SECRET: z.preprocess((value) => value === "" ? undefined : value, z.string().min(32).optional()),
  OPENAI_GENERATION_MODEL: z.string().min(1).default("gpt-5-mini"),
  OPENAI_EMBEDDING_MODEL: z.string().min(1).default("text-embedding-3-small"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: optionalSecret,
  CLERK_SECRET_KEY: optionalSecret,
}).superRefine((environment, context) => {
  const hasPublishableKey = Boolean(environment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const hasSecretKey = Boolean(environment.CLERK_SECRET_KEY);
  if (hasPublishableKey !== hasSecretKey) {
    context.addIssue({
      code: "custom",
      path: [hasPublishableKey ? "CLERK_SECRET_KEY" : "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"],
      message: "Clerk publishable and secret keys must be configured together",
    });
  }
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
