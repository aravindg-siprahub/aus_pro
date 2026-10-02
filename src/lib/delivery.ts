export function addBusinessDays(from: Date, days: number) {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d;
}

/** Placeholder delivery window shown until real fulfilment dates exist. */
export function estimateDelivery(from: Date) {
  return {
    from: addBusinessDays(from, 6).toISOString(),
    to: addBusinessDays(from, 9).toISOString(),
  };
}
