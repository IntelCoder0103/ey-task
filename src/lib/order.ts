import { by } from './fp';

type Identified = { _id: string };

export const reconcile = (order: readonly string[], ids: readonly string[]): string[] => {
  const present = new Set(ids);
  const kept = order.filter((id) => present.has(id));
  const known = new Set(kept);
  return [...kept, ...ids.filter((id) => !known.has(id))];
};

export const applyOrder = <T extends Identified>(order: readonly string[], items: readonly T[]): T[] => {
  const rank = new Map(
    reconcile(
      order,
      items.map((item) => item._id),
    ).map((id, index) => [id, index]),
  );
  return [...items].sort(by((item) => rank.get(item._id) ?? Infinity));
};

export const move = (order: string[], activeId: string, overId: string): string[] => {
  const from = order.indexOf(activeId);
  const to = order.indexOf(overId);
  if (from < 0 || to < 0 || from === to) return order;
  const without = order.filter((id) => id !== activeId);
  return [...without.slice(0, to), activeId, ...without.slice(to)];
};
