export const move = <T>(items: T[], active: T, over: T): T[] => {
  const from = items.indexOf(active);
  const to = items.indexOf(over);
  if (from < 0 || to < 0 || from === to) return items;
  const without = items.filter((item) => item !== active);
  return [...without.slice(0, to), active, ...without.slice(to)];
};
