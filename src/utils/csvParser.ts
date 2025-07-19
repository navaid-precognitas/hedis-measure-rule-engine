export const parseCSV = (csvText: string): { headers: string[]; rows: Record<string, any>[] } => {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map(header => header.trim().replace(/['"]/g, ''));
  const rows: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(value => value.trim().replace(/['"]/g, ''));
    const row: Record<string, any> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }

  return { headers, rows };
};

// Enhanced CSV parser for extremely large files (100M+ records)
export const parseCSVWithLimits = (csvText: string, displayLimit: number = 10000): { 
  headers: string[]; 
  rows: Record<string, any>[]; 
  allRows: Record<string, any>[]; 
  totalRows: number;
  isLimited: boolean;
} => {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return { 
    headers: [], 
    rows: [], 
    allRows: [], 
    totalRows: 0, 
    isLimited: false 
  };

  const headers = lines[0].split(',').map(header => header.trim().replace(/['"]/g, ''));
  const totalRows = lines.length - 1; // Exclude header
  
  // For extremely large files, we'll use a different strategy
  if (totalRows > 1000000) { // 1M+ records
    return parseVeryLargeCSV(lines, headers, displayLimit);
  }

  const allRows: Record<string, any>[] = [];

  // Parse all rows for smaller files
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(value => value.trim().replace(/['"]/g, ''));
    const row: Record<string, any> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    allRows.push(row);
  }

  // Create display rows (limited)
  const displayRows = allRows.slice(0, displayLimit);
  const isLimited = allRows.length > displayLimit;

  return { 
    headers, 
    rows: displayRows, 
    allRows, 
    totalRows: allRows.length, 
    isLimited 
  };
};

// Specialized parser for very large CSV files (1M+ records)
const parseVeryLargeCSV = (lines: string[], headers: string[], displayLimit: number) => {
  const totalRows = lines.length - 1;
  const displayRows: Record<string, any>[] = [];
  
  // Parse only the first displayLimit rows for display
  const rowsToDisplay = Math.min(displayLimit, totalRows);
  
  for (let i = 1; i <= rowsToDisplay; i++) {
    const values = lines[i].split(',').map(value => value.trim().replace(/['"]/g, ''));
    const row: Record<string, any> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    displayRows.push(row);
  }

  // Create a lazy loader for all rows that parses on demand
  const lazyAllRows = new LazyCSVLoader(lines, headers);

  return {
    headers,
    rows: displayRows,
    allRows: lazyAllRows as any, // This will be handled specially
    totalRows,
    isLimited: true
  };
};

// Lazy loader class for extremely large CSV files
class LazyCSVLoader {
  private lines: string[];
  private headers: string[];
  private cache: Map<number, Record<string, any>> = new Map();
  private batchCache: Map<string, Record<string, any>[]> = new Map();

  constructor(lines: string[], headers: string[]) {
    this.lines = lines;
    this.headers = headers;
  }

  // Get total length
  get length(): number {
    return this.lines.length - 1; // Exclude header
  }

  // Get a specific row by index
  getRow(index: number): Record<string, any> | undefined {
    if (index < 0 || index >= this.length) return undefined;
    
    if (this.cache.has(index)) {
      return this.cache.get(index);
    }

    const lineIndex = index + 1; // +1 to skip header
    const values = this.lines[lineIndex].split(',').map(value => value.trim().replace(/['"]/g, ''));
    const row: Record<string, any> = {};
    
    this.headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    
    this.cache.set(index, row);
    return row;
  }

  // Get a batch of rows efficiently
  getBatch(startIndex: number, batchSize: number): Record<string, any>[] {
    const cacheKey = `${startIndex}-${batchSize}`;
    
    if (this.batchCache.has(cacheKey)) {
      return this.batchCache.get(cacheKey)!;
    }

    const batch: Record<string, any>[] = [];
    const endIndex = Math.min(startIndex + batchSize, this.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      const row = this.getRow(i);
      if (row) batch.push(row);
    }
    
    this.batchCache.set(cacheKey, batch);
    return batch;
  }

  // Filter method for rule evaluation
  filter(predicate: (row: Record<string, any>) => boolean): Record<string, any>[] {
    const results: Record<string, any>[] = [];
    const batchSize = 10000; // Process in 10K batches
    
    for (let i = 0; i < this.length; i += batchSize) {
      const batch = this.getBatch(i, batchSize);
      const filteredBatch = batch.filter(predicate);
      results.push(...filteredBatch);
      
      // Clear cache periodically to prevent memory buildup
      if (i % 100000 === 0) {
        this.clearCache();
      }
    }
    
    return results;
  }

  // Convert to array (use with caution for large datasets)
  toArray(): Record<string, any>[] {
    console.warn('Converting large dataset to array - this may consume significant memory');
    const result: Record<string, any>[] = [];
    
    for (let i = 0; i < this.length; i++) {
      const row = this.getRow(i);
      if (row) result.push(row);
    }
    
    return result;
  }

  // Clear cache to free memory
  clearCache(): void {
    this.cache.clear();
    this.batchCache.clear();
  }

  // Implement array-like methods for compatibility
  map<T>(callback: (row: Record<string, any>, index: number) => T): T[] {
    const results: T[] = [];
    const batchSize = 10000;
    
    for (let i = 0; i < this.length; i += batchSize) {
      const batch = this.getBatch(i, batchSize);
      batch.forEach((row, batchIndex) => {
        results.push(callback(row, i + batchIndex));
      });
      
      // Clear cache periodically
      if (i % 100000 === 0) {
        this.clearCache();
      }
    }
    
    return results;
  }

  // Slice method for getting a range of rows
  slice(start: number = 0, end?: number): Record<string, any>[] {
    const actualEnd = end !== undefined ? Math.min(end, this.length) : this.length;
    const actualStart = Math.max(0, start);
    
    if (actualStart >= actualEnd) return [];
    
    const batchSize = Math.min(10000, actualEnd - actualStart);
    return this.getBatch(actualStart, batchSize);
  }
}

export const generateSampleCSV = (): string => {
  const sampleData = `Patient_ID,MemberAge,EnrollmentStatus,EnrollmentStartDate,EnrollmentEndDate,EnrollmentGapDays,DepressionDiagnosisDate,BipolarDisorderDate,DeathDate,HospiceStartDate,HospiceEndDate
P001,45,Active,2023-01-01,2024-12-31,0,,,,
P002,32,Active,2023-06-15,2024-12-31,30,,,,
P003,67,Active,2023-01-01,2024-12-31,0,2023-05-15,,,
P004,29,Active,2023-01-01,2024-12-31,0,,2023-03-10,,
P005,55,Active,2023-01-01,2024-12-31,0,,,2024-06-15,
P006,41,Active,2023-01-01,2024-12-31,60,,,,
P007,73,Active,2023-01-01,2024-12-31,0,,,,
P008,38,Active,2023-01-01,2024-12-31,0,,,2024-03-20,2024-08-15
P009,52,Active,2023-01-01,2024-12-31,0,,,,
P010,15,Active,2023-01-01,2024-12-31,0,,,,
P011,8,Active,2023-01-01,2024-12-31,0,,,,
P012,25,Inactive,2023-01-01,2024-12-31,0,,,,`;
  
  return sampleData;
};

// Utility function to estimate memory usage
export const estimateMemoryUsage = (totalRows: number, columnCount: number): string => {
  // Rough estimate: each cell ~50 bytes average
  const bytesPerRow = columnCount * 50;
  const totalBytes = totalRows * bytesPerRow;
  
  if (totalBytes < 1024) return `${totalBytes} B`;
  if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(1)} KB`;
  if (totalBytes < 1024 * 1024 * 1024) return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(totalBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};