import { z } from 'zod';

const schema = z.object({
  SEARCHSTAX_BASE_URL: z.string().url(),
  SEARCHSTAX_API_TOKEN: z.string().min(1),
  HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  HTTP_RETRIES: z.coerce.number().int().min(0).max(5).default(1),
  PORT: z.coerce.number().int().positive().default(3000)
});

export type AppConfig = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  return schema.parse(env);
}
