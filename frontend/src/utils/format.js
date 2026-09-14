export const plainText = (value) => {
  if (value == null) return '';
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/[<>]/g, '');
};

export const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export const isOverdue = (value) => value && new Date(value) < new Date();

export const dueLabel = (value) => {
  if (!value) return '';
  if (isOverdue(value)) return 'Overdue';
  const ms = new Date(value) - Date.now();
  const days = Math.ceil(ms / 86400000);
  if (days <= 1) return 'Due today';
  return `${days} days left`;
};
