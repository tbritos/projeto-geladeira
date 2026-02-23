export const exportToCSV = (
  data: any[],
  filename: string = 'export.csv'
) => {
  if (data.length === 0) {
    alert('Nenhum dado para exportar');
    return;
  }

  // Pega as colunas do primeiro objeto
  const headers = Object.keys(data[0]);

  // Cria o CSV
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escapa aspas e adiciona entre aspas se contiver vírgula
          const escaped = String(value).replace(/"/g, '""');
          return escaped.includes(',') ? `"${escaped}"` : escaped;
        })
        .join(',')
    ),
  ].join('\n');

  // Cria blob e download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const usePagination = (items: any[], itemsPerPage: number = 50) => {
  const totalPages = Math.ceil(items.length / itemsPerPage);

  const getPaginatedItems = (page: number) => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  };

  return {
    totalPages,
    itemsPerPage,
    totalItems: items.length,
    getPaginatedItems,
  };
};
