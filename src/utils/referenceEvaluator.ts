import { ReferenceCondition, ReferenceFile } from '../types';

export const evaluateReferenceCondition = (
  row: Record<string, any>,
  condition: ReferenceCondition,
  referenceFiles: ReferenceFile[]
): boolean => {
  // Find the reference file
  const referenceFile = referenceFiles.find(f => f.id === condition.referenceFileId);
  if (!referenceFile) {
    console.warn(`Reference file not found: ${condition.referenceFileId}`);
    return false;
  }

  // Get the value from the main data row
  const mainValue = row[condition.column];
  if (mainValue === null || mainValue === undefined || String(mainValue).trim() === '') {
    return condition.type === 'reference_not_match';
  }

  // Use allRows if available (for large files), otherwise use rows
  const referenceData = referenceFile.allRows || referenceFile.rows;
  
  // Filter reference data if filter conditions are specified
  let filteredReferenceData = referenceData;
  if (condition.filterColumn && condition.filterValue) {
    filteredReferenceData = referenceData.filter(refRow => {
      const filterValue = refRow[condition.filterColumn!];
      return String(filterValue).toLowerCase().trim() === 
             condition.filterValue!.toLowerCase().trim();
    });
  }

  // Check if the main value exists in the reference data
  const mainValueStr = String(mainValue).toLowerCase().trim();
  const hasMatch = filteredReferenceData.some(refRow => {
    const refValue = refRow[condition.referenceColumn];
    if (refValue === null || refValue === undefined) return false;
    
    const refValueStr = String(refValue).toLowerCase().trim();
    return refValueStr === mainValueStr;
  });

  // Return result based on condition type
  switch (condition.type) {
    case 'reference_match':
      return hasMatch;
    case 'reference_not_match':
      return !hasMatch;
    default:
      return false;
  }
};

export const getReferenceMatchDetails = (
  value: any,
  condition: ReferenceCondition,
  referenceFiles: ReferenceFile[]
): { matched: boolean; matchedRecords: Record<string, any>[] } => {
  const referenceFile = referenceFiles.find(f => f.id === condition.referenceFileId);
  if (!referenceFile) {
    return { matched: false, matchedRecords: [] };
  }

  if (value === null || value === undefined || String(value).trim() === '') {
    return { matched: false, matchedRecords: [] };
  }

  // Use allRows if available (for large files), otherwise use rows
  const referenceData = referenceFile.allRows || referenceFile.rows;
  
  // Filter reference data if filter conditions are specified
  let filteredReferenceData = referenceData;
  if (condition.filterColumn && condition.filterValue) {
    filteredReferenceData = referenceData.filter(refRow => {
      const filterValue = refRow[condition.filterColumn!];
      return String(filterValue).toLowerCase().trim() === 
             condition.filterValue!.toLowerCase().trim();
    });
  }

  // Find matching records
  const valueStr = String(value).toLowerCase().trim();
  const matchedRecords = filteredReferenceData.filter(refRow => {
    const refValue = refRow[condition.referenceColumn];
    if (refValue === null || refValue === undefined) return false;
    
    const refValueStr = String(refValue).toLowerCase().trim();
    return refValueStr === valueStr;
  });

  return {
    matched: matchedRecords.length > 0,
    matchedRecords
  };
};