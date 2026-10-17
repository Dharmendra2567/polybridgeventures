import { z } from "zod";
import dotenv from "dotenv";

// Load environment variables from .env file if present
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  COOKIE_SECRET: z
    .string()
    .min(
      32,
      "COOKIE_SECRET must be at least 32 characters long for cryptographic security",
    ),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
});

export type AppConfig = z.infer<typeof envSchema>;

let parsedEnv: AppConfig;

export function loadConfig(
  overrides?: Partial<Record<string, string>>,
): AppConfig {
  const source = overrides ? { ...process.env, ...overrides } : process.env;
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join("\n");
    throw new Error(
      `[Configuration Error] Invalid environment variables:\n${errorDetails}`,
    );
  }

  parsedEnv = result.data;
  return parsedEnv;
}

export function getConfig(): AppConfig {
  if (!parsedEnv) {
    return loadConfig();
  }
  return parsedEnv;
}
