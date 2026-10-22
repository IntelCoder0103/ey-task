import { randomUUID } from 'node:crypto';
import { hashPassword } from './domain/security';
import type { State } from './domain/types';

export const DEMO = { email: 'demo@atelier.studio', password: 'atelier2026' } as const;

const DAY_MS = 86_400_000;

const seedTasks: [string, boolean][] = [
  ['Book the fitting for the wool overcoat', true],
  ['Return the linen swatches to the mill', false],
  ['Draft the autumn moodboard', false],
  ['Call the tailor about the trouser hem', false],
  ['Photograph the capsule wardrobe for the archive', true],
];

export const seedDemo = async ({
  rounds,
  now = new Date(),
}: {
  rounds: number;
  now?: Date;
}): Promise<State> => {
  const daysAgo = (days: number) => new Date(now.getTime() - days * DAY_MS).toISOString();
  const owner = randomUUID();

  return {
    users: [
      {
        id: owner,
        name: 'Margaux Ellery',
        email: DEMO.email,
        age: 29,
        passwordHash: await hashPassword(DEMO.password, rounds),
        createdAt: daysAgo(44),
        updatedAt: daysAgo(44),
      },
    ],
    sessions: [],
    tasks: seedTasks.map(([description, completed], position) => ({
      id: randomUUID(),
      owner,
      description,
      completed,
      position,
      createdAt: daysAgo(20 - position * 3),
      updatedAt: daysAgo(10 - position),
    })),
  };
};
