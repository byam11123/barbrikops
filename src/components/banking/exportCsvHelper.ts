/**
 * Formatted CSV Export Utility for Bank Payments, Beneficiary Master, and Interbank Transfer (IBT)
 */

export function downloadCsv(filename: string, rows: (string | number | boolean | null | undefined)[][]) {
  const csvContent = rows
    .map(row =>
      row
        .map(field => {
          const stringified = field === null || field === undefined ? '' : String(field);
          // Escape quotes and wrap in quotes if contains comma, quote or newline
          if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
            return `"${stringified.replace(/"/g, '""')}"`;
          }
          return stringified;
        })
        .join(',')
    )
    .join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
