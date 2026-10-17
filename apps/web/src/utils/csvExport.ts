export function exportToCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns: Array<{ key: keyof T | string; header: string }>
): void {
  if (!rows || rows.length === 0) return;

  const headerLine = columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(',');
  const rowLines = rows.map((row) =>
    columns
      .map((col) => {
        const val = row[col.key as keyof T];
        if (val === null || val === undefined) return '""';
        if (typeof val === 'object') {
          return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        }
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent([headerLine, ...rowLines].join('\n'));
  const link = document.createElement('a');
  link.setAttribute('href', csvContent);
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `${filename}-${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
