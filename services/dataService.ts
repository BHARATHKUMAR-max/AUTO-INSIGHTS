import * as XLSX from "xlsx";
import Papa from "papaparse";

export function godLevelClean(rawData: any[]) {
  if (!rawData || rawData.length === 0) return [];

  // 1. Normalize Column Names (lowercase, no spaces, no special chars)
  const originalCols = Object.keys(rawData[0]);
  const colMap = originalCols.reduce((acc, col) => {
    acc[col] = col.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    return acc;
  }, {} as Record<string, string>);

  const cleanedData = rawData.map(row => {
    const newRow: any = {};
    originalCols.forEach(col => {
      let val = row[col];
      const cleanCol = colMap[col];
      
      // Handle null-like values
      if (val === null || val === undefined || val === '') {
        newRow[cleanCol] = null;
        return;
      }

      if (typeof val === 'string') {
        val = val.trim();
        const nullLikes = ['n/a', 'na', 'null', 'none', '-', 'undefined', 'nan', '?', 'unknown'];
        if (nullLikes.includes(val.toLowerCase())) {
          newRow[cleanCol] = null;
          return;
        }

        // Handle Percentages
        let isPercent = false;
        if (val.endsWith('%')) {
          isPercent = true;
          val = val.slice(0, -1);
        }

        // Handle Parentheses for negatives: (100.00) -> -100.00
        if (val.startsWith('(') && val.endsWith(')')) {
          val = '-' + val.slice(1, -1);
        }

        // Numeric Cleaning: handle currency symbols, commas, and noise
        const numericStr = val.replace(/[$,\s]/g, '');
        const num = Number(numericStr);
        
        if (!isNaN(num) && numericStr !== '') {
          newRow[cleanCol] = isPercent ? num / 100 : num;
          return;
        }

        // Date Detection
        if (val.length > 5 && val.match(/\d/)) {
          const date = new Date(val);
          if (!isNaN(date.getTime())) {
            newRow[cleanCol] = date.toISOString();
            return;
          }
        }
      }

      newRow[cleanCol] = val;
    });
    return newRow;
  });

  return cleanedData;
}

export function profileData(data: any[]) {
  if (!data || data.length === 0) return null;
  const columns = Object.keys(data[0]);
  const stats: any = {};

  columns.forEach(col => {
    const values = data.map(d => d[col]).filter(v => v !== null && v !== undefined && v !== '');
    
    const numericValues = values.filter(v => typeof v === 'number') as number[];
    const dateValues = values.filter(v => typeof v === 'string' && v.match(/^\d{4}-\d{2}-\d{2}T/)) as string[];

    const isNumeric = numericValues.length > 0 && (numericValues.length / values.length) > 0.6;
    const isDate = dateValues.length > 0 && (dateValues.length / values.length) > 0.6;
    
    const uniqueValues = new Set(values);
    
    stats[col] = {
      type: isNumeric ? 'numeric' : (isDate ? 'date' : 'categorical'),
      missing: data.length - values.length,
      unique_count: uniqueValues.size,
      sample_values: Array.from(uniqueValues).slice(0, 5)
    };

    if (isNumeric) {
      stats[col].min = Math.min(...numericValues);
      stats[col].max = Math.max(...numericValues);
      stats[col].avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      stats[col].sum = numericValues.reduce((a, b) => a + b, 0);
    }
  });

  return {
    row_count: data.length,
    col_count: columns.length,
    columns: stats
  };
}

export function parseFile(buffer: Buffer, filename: string) {
  if (filename.endsWith('.csv')) {
    const csvStr = buffer.toString();
    return Papa.parse(csvStr, { header: true, dynamicTyping: true }).data;
  } else {
    const workbook = XLSX.read(buffer);
    const firstSheetName = workbook.SheetNames[0];
    return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);
  }
}
