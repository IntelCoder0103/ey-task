import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  findOwned,
  isPermutationOf,
  nextPosition,
  ownedBy,
  patchTask,
  queryTasks,
  removeTask,
  reorderTasks,
  toPublicTask,
} from '../domain/tasks';
import type { Task } from '../domain/types';
import { authOf } from '../http/auth';
import { httpError, required } from '../http/errors';
import { reply, route } from '../http/route';
import type { Store } from '../store/store';

const description = z
  .string({ required_error: 'Description is required.' })
  .trim()
  .min(1, 'Description is required.')
  .max(500, 'Keep descriptions under 500 characters.');

const Params = z.object({ id: z.string().min(1) });

const Query = z.object({
  q: z.string().max(200).optional(),
  completed: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

const NewTask = z.object({ description });

const Patch = z
  .object({ description: description.optional(), completed: z.boolean().optional() })
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, 'Nothing to update.');

const Order = z.object({ ids: z.array(z.string()).max(10_000) });

const notFound = () => httpError(404, 'Task not found.');

const page = (tasks: Task[], owner: string, query = {}) => {
  const { data, total } = queryTasks(tasks, owner, query);
  return { data: data.map(toPublicTask), total };
};

export const taskRoutes = ({ store, now }: { store: Store; now: () => Date }) =>
  Router()
    .get(
      '/',
      route({ query: Query }, ({ query }, res) =>
        reply.ok(page(store.read().tasks, authOf(res).user.id, query)),
      ),
    )
    .post(
      '/',
      route({ body: NewTask }, ({ body }, res) =>
        store.update((state) => {
          const owner = authOf(res).user.id;
          const timestamp = now().toISOString();
          const task: Task = {
            id: randomUUID(),
            owner,
            description: body.description,
            completed: false,
            position: nextPosition(state.tasks, owner),
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          return [{ ...state, tasks: [...state.tasks, task] }, reply.created(toPublicTask(task))] as const;
        }),
      ),
    )
    .put(
      '/order',
      route({ body: Order }, ({ body }, res) =>
        store.update((state) => {
          const owner = authOf(res).user.id;
          if (!isPermutationOf(body.ids, state.tasks.filter(ownedBy(owner)))) {
            throw httpError(400, 'ids must list every task exactly once.');
          }
          const tasks = reorderTasks(state.tasks, owner, body.ids);
          return [{ ...state, tasks }, reply.ok(page(tasks, owner))] as const;
        }),
      ),
    )
    .get(
      '/:id',
      route({ params: Params }, ({ params }, res) =>
        reply.ok(
          toPublicTask(required(findOwned(store.read().tasks, authOf(res).user.id, params.id), notFound)),
        ),
      ),
    )
    .patch(
      '/:id',
      route({ params: Params, body: Patch }, ({ params, body }, res) =>
        store.update((state) => {
          const task = required(findOwned(state.tasks, authOf(res).user.id, params.id), notFound);
          const tasks = patchTask(state.tasks, task.id, body, now().toISOString());
          const updated = required(findOwned(tasks, task.owner, task.id), notFound);
          return [{ ...state, tasks }, reply.ok(toPublicTask(updated))] as const;
        }),
      ),
    )
    .delete(
      '/:id',
      route({ params: Params }, ({ params }, res) =>
        store.update((state) => {
          const task = required(findOwned(state.tasks, authOf(res).user.id, params.id), notFound);
          return [{ ...state, tasks: removeTask(state.tasks, task) }, reply.noContent()] as const;
        }),
      ),
    );
