import { z } from 'zod';

export const User = z.object({
  _id: z.string(),
  name: z.string(),
  email: z.string(),
  age: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type User = z.infer<typeof User>;

export const Task = z.object({
  _id: z.string(),
  description: z.string(),
  completed: z.boolean(),
  owner: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Task = z.infer<typeof Task>;

export const AuthResponse = z.object({ user: User, token: z.string() });
export type AuthResponse = z.infer<typeof AuthResponse>;

export const TaskList = z.object({ count: z.number(), data: z.array(Task) });

export const TaskEnvelope = z.object({ data: Task });

export type Credentials = { email: string; password: string };
export type Registration = Credentials & { name: string; age?: number };
export type TaskPatch = Partial<Pick<Task, 'description' | 'completed'>>;
