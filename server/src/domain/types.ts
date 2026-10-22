export type User = {
  id: string;
  name: string;
  email: string;
  age?: number;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

export type Session = { tokenHash: string; userId: string; createdAt: string };

export type Task = {
  id: string;
  owner: string;
  description: string;
  completed: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type State = { users: User[]; sessions: Session[]; tasks: Task[] };

export const emptyState: State = { users: [], sessions: [], tasks: [] };
