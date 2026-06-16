export function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  return new Date(value);
}
export const fmt = (value) => {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat('es-AR').format(date) : '-';
};
export const daysUntil = (value) => {
  const date = toDate(value);
  return date ? Math.ceil((date - new Date()) / 86400000) : '-';
};
