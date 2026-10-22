import { z } from 'zod';

export const User = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  age: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type User = z.infer<typeof User>;

export const Task = z.object({
  id: z.string(),
  description: z.string(),
  completed: z.boolean(),
  position: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Task = z.infer<typeof Task>;

export const AuthResponse = z.object({ user: User, token: z.string() });
export type AuthResponse = z.infer<typeof AuthResponse>;

export const TaskPage = z.object({ data: z.array(Task), total: z.number() });

export type Credentials = { email: string; password: string };
export type Registration = Credentials & { name: string; age?: number };
export type TaskPatch = Partial<Pick<Task, 'description' | 'completed'>>;
