export const limitVisibleColumns = (options, columns, limit) => {
  const selected = options.map(([key]) => key).filter((key) => columns[key]).slice(0, limit);
  return Object.fromEntries(options.map(([key]) => [key, selected.includes(key)]));
};
