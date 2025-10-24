
/**
 * Converts an array of objects to a CSV string.
 * @param data Array of objects.
 * @returns A string in CSV format.
 */
function convertToCSV(data: any[]): string {
    if (!data || data.length === 0) {
        return '';
    }
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')]; // Header row

    for (const row of data) {
        const values = headers.map(header => {
            let cell = row[header] === null || row[header] === undefined ? '' : String(row[header]);
            cell = cell.replace(/"/g, '""'); // Escape double quotes
            if (cell.search(/("|,|\n)/g) >= 0) {
                cell = `"${cell}"`; // Quote fields with commas, double quotes, or newlines
            }
            return cell;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
}

/**
 * Creates a blob from a CSV string and triggers a download.
 * @param data Array of objects to export.
 * @param filename The name of the downloaded file.
 */
export function exportToCSV(data: any[], filename: string): void {
    const csvString = convertToCSV(data);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    if (link.download !== undefined) { // feature detection
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
