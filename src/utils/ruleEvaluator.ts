import { RuleCondition, RuleGroup, EvaluationResult, ReferenceFile } from '../types';
import { evaluateReferenceCondition } from './referenceEvaluator';
import { evaluateGroupCondition, getGroupStatistics } from './groupEvaluator';

// Enhanced date parsing function that handles multiple formats
const parseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  
  // If already a Date object
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue;
  }
  
  const dateStr = String(dateValue).trim();
  if (!dateStr) return null;
  
  // Try different date formats
  const formats = [
    // ISO formats
    /^\d{4}-\d{2}-\d{2}$/,           // YYYY-MM-DD
    /^\d{4}-\d{2}-\d{2}T/,           // YYYY-MM-DDTHH:mm:ss
    // US formats
    /^\d{1,2}\/\d{1,2}\/\d{4}$/,     // MM/DD/YYYY or M/D/YYYY
    /^\d{1,2}\/\d{1,2}\/\d{2}$/,     // MM/DD/YY or M/D/YY
    // European formats
    /^\d{1,2}-\d{1,2}-\d{4}$/,       // DD-MM-YYYY or D-M-YYYY
    /^\d{1,2}\.\d{1,2}\.\d{4}$/,     // DD.MM.YYYY or D.M.YYYY
    // Other common formats
    /^\d{4}\/\d{2}\/\d{2}$/,         // YYYY/MM/DD
    /^\d{2}\/\d{2}\/\d{4}$/,         // DD/MM/YYYY
  ];
  
  // Check if it matches any known date format
  const hasDateFormat = formats.some(format => format.test(dateStr));
  if (!hasDateFormat) return null;
  
  // Try parsing with different methods
  let date: Date | null = null;
  
  // Method 1: Direct Date constructor (works well with ISO formats)
  date = new Date(dateStr);
  if (!isNaN(date.getTime())) return date;
  
  // Method 2: Handle MM/DD/YYYY format explicitly
  const mmddyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const [, month, day, year] = mmddyyyy;
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  // Method 3: Handle DD/MM/YYYY format (European)
  const ddmmyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  // Method 4: Handle YYYY-MM-DD format explicitly
  const yyyymmdd = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yyyymmdd) {
    const [, year, month, day] = yyyymmdd;
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  // Method 5: Handle DD-MM-YYYY format
  const ddmmyyyy2 = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyy2) {
    const [, day, month, year] = ddmmyyyy2;
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  return null;
};

// Check if a value looks like a date
const isDateLike = (value: any): boolean => {
  if (!value) return false;
  const str = String(value).trim();
  
  // Common date patterns
  const datePatterns = [
    /^\d{4}-\d{1,2}-\d{1,2}$/,       // YYYY-MM-DD
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,   // MM/DD/YY or MM/DD/YYYY
    /^\d{1,2}-\d{1,2}-\d{4}$/,       // DD-MM-YYYY
    /^\d{1,2}\.\d{1,2}\.\d{4}$/,     // DD.MM.YYYY
    /^\d{4}\/\d{1,2}\/\d{1,2}$/,     // YYYY/MM/DD
  ];
  
  return datePatterns.some(pattern => pattern.test(str));
};

// Normalize date to start of day for comparison
const normalizeDate = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const evaluateCondition = (row: Record<string, any>, condition: RuleCondition): boolean => {
  const columnValue = row[condition.column];
  const targetValue = condition.value;
  const targetValue2 = condition.value2;

  // Handle empty/null checks first
  const isEmpty = columnValue === null || columnValue === undefined || String(columnValue).trim() === '';
  
  switch (condition.operator) {
    case 'is_empty':
      return isEmpty;
    case 'is_not_empty':
      return !isEmpty;
  }

  // If column is empty and we're not checking for emptiness, return false
  if (isEmpty) return false;

  // Determine if we're dealing with dates
  const columnIsDate = isDateLike(columnValue);
  const targetIsDate = isDateLike(targetValue);
  const target2IsDate = targetValue2 ? isDateLike(targetValue2) : false;
  
  // Date comparison logic
  if (columnIsDate && targetIsDate) {
    const columnDate = parseDate(columnValue);
    const targetDate = parseDate(targetValue);
    
    if (!columnDate || !targetDate) {
      // If date parsing failed, fall back to string comparison
      return evaluateAsString(columnValue, targetValue, targetValue2, condition.operator);
    }
    
    // Normalize dates for comparison (remove time component)
    const normalizedColumnDate = normalizeDate(columnDate);
    const normalizedTargetDate = normalizeDate(targetDate);
    
    switch (condition.operator) {
      case 'equals':
        return normalizedColumnDate.getTime() === normalizedTargetDate.getTime();
      case 'not_equals':
        return normalizedColumnDate.getTime() !== normalizedTargetDate.getTime();
      case 'greater_than':
        return normalizedColumnDate.getTime() > normalizedTargetDate.getTime();
      case 'less_than':
        return normalizedColumnDate.getTime() < normalizedTargetDate.getTime();
      case 'greater_equal':
        return normalizedColumnDate.getTime() >= normalizedTargetDate.getTime();
      case 'less_equal':
        return normalizedColumnDate.getTime() <= normalizedTargetDate.getTime();
      case 'between':
        if (!targetValue2 || !target2IsDate) return false;
        const targetDate2 = parseDate(targetValue2);
        if (!targetDate2) return false;
        
        const normalizedTargetDate2 = normalizeDate(targetDate2);
        const minDate = normalizedTargetDate.getTime() <= normalizedTargetDate2.getTime() 
          ? normalizedTargetDate : normalizedTargetDate2;
        const maxDate = normalizedTargetDate.getTime() > normalizedTargetDate2.getTime() 
          ? normalizedTargetDate : normalizedTargetDate2;
        
        return normalizedColumnDate.getTime() >= minDate.getTime() && 
               normalizedColumnDate.getTime() <= maxDate.getTime();
      case 'not_between':
        if (!targetValue2 || !target2IsDate) return true;
        const targetDate2NotBetween = parseDate(targetValue2);
        if (!targetDate2NotBetween) return true;
        
        const normalizedTargetDate2NotBetween = normalizeDate(targetDate2NotBetween);
        const minDateNotBetween = normalizedTargetDate.getTime() <= normalizedTargetDate2NotBetween.getTime() 
          ? normalizedTargetDate : normalizedTargetDate2NotBetween;
        const maxDateNotBetween = normalizedTargetDate.getTime() > normalizedTargetDate2NotBetween.getTime() 
          ? normalizedTargetDate : normalizedTargetDate2NotBetween;
        
        return !(normalizedColumnDate.getTime() >= minDateNotBetween.getTime() && 
                 normalizedColumnDate.getTime() <= maxDateNotBetween.getTime());
      default:
        // For text operations on dates, convert to string
        return evaluateAsString(columnValue, targetValue, targetValue2, condition.operator);
    }
  }
  
  // Numeric comparison logic
  const numericColumnValue = parseFloat(String(columnValue));
  const numericTargetValue = parseFloat(String(targetValue));
  const numericTargetValue2 = targetValue2 ? parseFloat(String(targetValue2)) : 0;
  const isNumeric = !isNaN(numericColumnValue) && !isNaN(numericTargetValue);
  
  if (isNumeric && ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'between', 'not_between'].includes(condition.operator)) {
    switch (condition.operator) {
      case 'equals':
        return numericColumnValue === numericTargetValue;
      case 'not_equals':
        return numericColumnValue !== numericTargetValue;
      case 'greater_than':
        return numericColumnValue > numericTargetValue;
      case 'less_than':
        return numericColumnValue < numericTargetValue;
      case 'greater_equal':
        return numericColumnValue >= numericTargetValue;
      case 'less_equal':
        return numericColumnValue <= numericTargetValue;
      case 'between':
        if (!targetValue2 || isNaN(numericTargetValue2)) return false;
        return numericColumnValue >= Math.min(numericTargetValue, numericTargetValue2) && 
               numericColumnValue <= Math.max(numericTargetValue, numericTargetValue2);
      case 'not_between':
        if (!targetValue2 || isNaN(numericTargetValue2)) return true;
        return !(numericColumnValue >= Math.min(numericTargetValue, numericTargetValue2) && 
                 numericColumnValue <= Math.max(numericTargetValue, numericTargetValue2));
    }
  }
  
  // Fall back to string comparison
  return evaluateAsString(columnValue, targetValue, targetValue2, condition.operator);
};

// Helper function for string-based comparisons
const evaluateAsString = (columnValue: any, targetValue: string, targetValue2: string | undefined, operator: string): boolean => {
  const stringColumnValue = String(columnValue).toLowerCase();
  const stringTargetValue = String(targetValue).toLowerCase();
  const stringTargetValue2 = targetValue2 ? String(targetValue2).toLowerCase() : '';
  
  switch (operator) {
    case 'equals':
      return stringColumnValue === stringTargetValue;
    case 'not_equals':
      return stringColumnValue !== stringTargetValue;
    case 'greater_than':
      return stringColumnValue > stringTargetValue;
    case 'less_than':
      return stringColumnValue < stringTargetValue;
    case 'greater_equal':
      return stringColumnValue >= stringTargetValue;
    case 'less_equal':
      return stringColumnValue <= stringTargetValue;
    case 'contains':
      return stringColumnValue.includes(stringTargetValue);
    case 'not_contains':
      return !stringColumnValue.includes(stringTargetValue);
    case 'starts_with':
      return stringColumnValue.startsWith(stringTargetValue);
    case 'ends_with':
      return stringColumnValue.endsWith(stringTargetValue);
    case 'between':
      return false; // String between doesn't make much sense
    case 'not_between':
      return true; // String not between defaults to true
    default:
      return false;
  }
};

export const evaluateRuleGroup = (
  row: Record<string, any>, 
  ruleGroup: RuleGroup, 
  referenceFiles: ReferenceFile[] = [],
  allData: Record<string, any>[] = [],
  groupConditionResults: Map<string, Set<string>> = new Map()
): boolean => {
  const conditionResults = ruleGroup.conditions.map(condition => evaluateCondition(row, condition));
  const referenceResults = ruleGroup.referenceConditions.map(condition => 
    evaluateReferenceCondition(row, condition, referenceFiles)
  );
  
  // Evaluate group conditions
  const groupResults = ruleGroup.groupConditions.map(condition => {
    // Get or compute the matching groups for this condition
    let matchingGroups = groupConditionResults.get(condition.id);
    if (!matchingGroups) {
      matchingGroups = evaluateGroupCondition(allData, condition);
      groupConditionResults.set(condition.id, matchingGroups);
    }
    
    // Check if this row's group is in the matching groups
    const groupKey = String(row[condition.groupBy] || '').trim();
    const isInMatchingGroup = matchingGroups.has(groupKey);
    
    // Return based on action type
    return condition.action === 'keep_matching_groups' ? isInMatchingGroup : !isInMatchingGroup;
  });
  
  const subGroupResults = ruleGroup.groups.map(group => 
    evaluateRuleGroup(row, group, referenceFiles, allData, groupConditionResults)
  );
  
  const allResults = [...conditionResults, ...referenceResults, ...groupResults, ...subGroupResults];
  
  if (allResults.length === 0) return true;
  
  let result = ruleGroup.logic === 'AND' 
    ? allResults.every(result => result)
    : allResults.some(result => result);
  
  // Apply negation if specified
  if (ruleGroup.negated) {
    result = !result;
  }
  
  return result;
};

// Enhanced evaluation for extremely large datasets with streaming support
export const evaluateRules = async (
  data: Record<string, any>[] | any, // Can be array or LazyCSVLoader
  rules: RuleGroup, 
  referenceFiles: ReferenceFile[] = []
): Promise<EvaluationResult> => {
  // Check if data is a LazyCSVLoader (for very large files)
  const isLazyLoader = data && typeof data.filter === 'function' && typeof data.length === 'number' && !Array.isArray(data);
  
  if (isLazyLoader) {
    return evaluateRulesLazy(data, rules, referenceFiles);
  }
  
  // Standard array processing
  return evaluateRulesArray(data as Record<string, any>[], rules, referenceFiles);
};

// Optimized evaluation for standard arrays
const evaluateRulesArray = async (
  data: Record<string, any>[], 
  rules: RuleGroup, 
  referenceFiles: ReferenceFile[] = []
): Promise<EvaluationResult> => {
  const batchSize = 10000;
  const matchedRows: Record<string, any>[] = [];
  
  // Pre-compute all group condition results to avoid recalculation
  const groupConditionResults = new Map<string, Set<string>>();
  const allGroupConditions = getAllGroupConditions(rules);
  
  for (const condition of allGroupConditions) {
    const matchingGroups = evaluateGroupCondition(data, condition);
    groupConditionResults.set(condition.id, matchingGroups);
  }
  
  // Calculate group statistics if there are group conditions
  let groupStats: { totalGroups: number; matchedGroups: number; groupPercentage: number } | undefined;
  if (allGroupConditions.length > 0) {
    const firstGroupCondition = allGroupConditions[0];
    const allMatchingGroups = new Set<string>();
    
    for (const matchingGroups of groupConditionResults.values()) {
      for (const group of matchingGroups) {
        allMatchingGroups.add(group);
      }
    }
    
    groupStats = getGroupStatistics(data, firstGroupCondition.groupBy, allMatchingGroups);
  }
  
  // Process in batches for large datasets
  if (data.length > 50000) {
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const batchMatches = batch.filter(row => 
        evaluateRuleGroup(row, rules, referenceFiles, data, groupConditionResults)
      );
      matchedRows.push(...batchMatches);
      
      // Allow UI to update between batches
      if (i % (batchSize * 4) === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  } else {
    const matches = data.filter(row => 
      evaluateRuleGroup(row, rules, referenceFiles, data, groupConditionResults)
    );
    matchedRows.push(...matches);
  }
  
  return {
    matchedRows,
    totalRows: data.length,
    matchedCount: matchedRows.length,
    percentage: data.length > 0 ? (matchedRows.length / data.length) * 100 : 0,
    groupStats
  };
};

// Specialized evaluation for LazyCSVLoader (very large files)
const evaluateRulesLazy = async (
  lazyData: any,
  rules: RuleGroup, 
  referenceFiles: ReferenceFile[] = []
): Promise<EvaluationResult> => {
  console.log(`Starting lazy evaluation for ${lazyData.length.toLocaleString()} records`);
  
  const matchedRows: Record<string, any>[] = [];
  const batchSize = 25000; // Larger batches for lazy loading
  const totalRows = lazyData.length;
  
  // Pre-compute group conditions using batched approach
  const groupConditionResults = new Map<string, Set<string>>();
  const allGroupConditions = getAllGroupConditions(rules);
  
  if (allGroupConditions.length > 0) {
    console.log('Pre-computing group conditions for large dataset...');
    
    for (const condition of allGroupConditions) {
      const matchingGroups = new Set<string>();
      
      // Process in batches to compute group conditions
      for (let i = 0; i < totalRows; i += batchSize) {
        const batch = lazyData.getBatch(i, batchSize);
        const batchGroups = evaluateGroupCondition(batch, condition);
        
        for (const group of batchGroups) {
          matchingGroups.add(group);
        }
        
        // Clear cache periodically
        if (i % (batchSize * 4) === 0) {
          lazyData.clearCache();
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      groupConditionResults.set(condition.id, matchingGroups);
    }
  }
  
  // Process data in batches
  console.log('Processing data in batches...');
  
  for (let i = 0; i < totalRows; i += batchSize) {
    const batch = lazyData.getBatch(i, batchSize);
    
    const batchMatches = batch.filter(row => 
      evaluateRuleGroup(row, rules, referenceFiles, [], groupConditionResults)
    );
    
    matchedRows.push(...batchMatches);
    
    // Progress logging and cache management
    if (i % (batchSize * 4) === 0) {
      const progress = ((i / totalRows) * 100).toFixed(1);
      console.log(`Progress: ${progress}% (${matchedRows.length.toLocaleString()} matches so far)`);
      
      lazyData.clearCache();
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  // Calculate group statistics
  let groupStats: { totalGroups: number; matchedGroups: number; groupPercentage: number } | undefined;
  if (allGroupConditions.length > 0) {
    const firstGroupCondition = allGroupConditions[0];
    const allMatchingGroups = new Set<string>();
    
    for (const matchingGroups of groupConditionResults.values()) {
      for (const group of matchingGroups) {
        allMatchingGroups.add(group);
      }
    }
    
    // For group stats, we need to count all groups in the dataset
    const allGroups = new Set<string>();
    for (let i = 0; i < totalRows; i += batchSize) {
      const batch = lazyData.getBatch(i, batchSize);
      for (const row of batch) {
        const groupKey = String(row[firstGroupCondition.groupBy] || '').trim();
        if (groupKey) allGroups.add(groupKey);
      }
      
      if (i % (batchSize * 4) === 0) {
        lazyData.clearCache();
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    }
    
    groupStats = {
      totalGroups: allGroups.size,
      matchedGroups: allMatchingGroups.size,
      groupPercentage: allGroups.size > 0 ? (allMatchingGroups.size / allGroups.size) * 100 : 0
    };
  }
  
  console.log(`Evaluation complete: ${matchedRows.length.toLocaleString()} matches out of ${totalRows.toLocaleString()} records`);
  
  return {
    matchedRows,
    totalRows,
    matchedCount: matchedRows.length,
    percentage: totalRows > 0 ? (matchedRows.length / totalRows) * 100 : 0,
    groupStats
  };
};

// Helper function to collect all group conditions from a rule tree
const getAllGroupConditions = (ruleGroup: RuleGroup): any[] => {
  const conditions = [...ruleGroup.groupConditions];
  
  for (const subGroup of ruleGroup.groups) {
    conditions.push(...getAllGroupConditions(subGroup));
  }
  
  return conditions;
};