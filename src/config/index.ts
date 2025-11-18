import { z } from "zod";

const ensureTestKey = (): void => {
  if (process.env.NODE_ENV === "test" && !process.env.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = "test-openai-key";
  }
};

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(10, "OPENAI_API_KEY is required"),
  OPENAI_MODEL: z.string().optional(),
  PORT: z
    .string()
    .optional()
    .transform((value) => Number(value ?? "4000")),
  SERP_API_URL: z
    .string()
    .optional()
    .transform((value) => {
      if (!value || value.trim() === "") {
        return undefined;
      }
      try {
        return new URL(value).toString();
      } catch {
        return value;
      }
    }),
  SERP_API_KEY: z.string().optional(),
});

export type AppConfig = z.infer<typeof envSchema>;

export const loadConfig = (): AppConfig => {
  ensureTestKey();
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Environment validation failed", result.error.format());
    throw new Error("Invalid environment configuration. See logs for details.");
  }
  return result.data;
};
