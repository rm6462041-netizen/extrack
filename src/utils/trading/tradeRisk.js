export function calculateRMultiples({ entry, exit, stop, target, side }) {
  const number = (value) => value === "" || value === null || value === undefined ? null : Number(value);
  const entryPrice = number(entry);
  const stopPrice = number(stop);
  const targetPrice = number(target);
  const exitPrice = number(exit);
  const direction = String(side).toLowerCase() === "sell" ? -1 : 1;
  const risk = direction * (entryPrice - stopPrice);

  if (!Number.isFinite(entryPrice) || !Number.isFinite(stopPrice) || risk <= 0) {
    return { planned: null, realized: null };
  }

  const plannedReward = targetPrice === null ? null : direction * (targetPrice - entryPrice);
  const realizedReward = exitPrice === null ? null : direction * (exitPrice - entryPrice);
  return {
    planned: plannedReward !== null && Number.isFinite(plannedReward) && plannedReward > 0 ? plannedReward / risk : null,
    realized: realizedReward !== null && Number.isFinite(realizedReward) ? realizedReward / risk : null,
  };
}
