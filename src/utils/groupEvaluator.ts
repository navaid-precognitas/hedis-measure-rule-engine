import { GroupCondition } from '../types';

export const evaluateGroupCondition = (
  data: Record<string, any>[],
  condition: GroupCondition
): Set<string> => {
  // Group data by the specified column
  const groups = new Map<string, Record<string, any>[]>();
  
  for (const row of data) {
    const groupKey = String(row[condition.groupBy] || '').trim();
    if (!groupKey) continue; // Skip rows with empty group keys
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(row);
  }

  const matchingGroups = new Set<string>();

  // Evaluate each group
  for (const [groupKey, groupRows] of groups) {
    let aggregatedValue: number;
    
    switch (condition.aggregationType) {
      case 'distinct_count':
        aggregatedValue = calculateDistinctCount(groupRows, condition);
        break;
      case 'count':
        aggregatedValue = groupRows.length;
        break;
      case 'sum':
        aggregatedValue = calculateSum(groupRows, condition.targetColumn);
        break;
      case 'avg':
        aggregatedValue = calculateAverage(groupRows, condition.targetColumn);
        break;
      case 'min':
        aggregatedValue = calculateMin(groupRows, condition.targetColumn);
        break;
      case 'max':
        aggregatedValue = calculateMax(groupRows, condition.targetColumn);
        break;
      default:
        aggregatedValue = 0;
    }

    // Check if the condition is met
    const conditionMet = evaluateNumericCondition(aggregatedValue, condition.operator, condition.value);
    
    if (conditionMet) {
      matchingGroups.add(groupKey);
    }
  }

  return matchingGroups;
};

const calculateDistinctCount = (rows: Record<string, any>[], condition: GroupCondition): number => {
  const distinctValues = new Set<string>();
  const seenDistinctConstraints = new Set<string>();

  for (const row of rows) {
    const targetValue = row[condition.targetColumn];
    if (targetValue === null || targetValue === undefined || String(targetValue).trim() === '') {
      continue;
    }

    // If withinDistinct is specified, only count values with distinct constraint values
    if (condition.withinDistinct) {
      const constraintValue = String(row[condition.withinDistinct] || '').trim();
      if (!constraintValue || seenDistinctConstraints.has(constraintValue)) {
        continue;
      }
      seenDistinctConstraints.add(constraintValue);
    }

    distinctValues.add(String(targetValue).trim());
  }

  return distinctValues.size;
};

const calculateSum = (rows: Record<string, any>[], targetColumn: string): number => {
  let sum = 0;
  for (const row of rows) {
    const value = parseFloat(String(row[targetColumn] || '0'));
    if (!isNaN(value)) {
      sum += value;
    }
  }
  return sum;
};

const calculateAverage = (rows: Record<string, any>[], targetColumn: string): number => {
  const sum = calculateSum(rows, targetColumn);
  const validCount = rows.filter(row => {
    const value = parseFloat(String(row[targetColumn] || ''));
    return !isNaN(value);
  }).length;
  
  return validCount > 0 ? sum / validCount : 0;
};

const calculateMin = (rows: Record<string, any>[], targetColumn: string): number => {
  let min = Infinity;
  for (const row of rows) {
    const value = parseFloat(String(row[targetColumn] || ''));
    if (!isNaN(value) && value < min) {
      min = value;
    }
  }
  return min === Infinity ? 0 : min;
};

const calculateMax = (rows: Record<string, any>[], targetColumn: string): number => {
  let max = -Infinity;
  for (const row of rows) {
    const value = parseFloat(String(row[targetColumn] || ''));
    if (!isNaN(value) && value > max) {
      max = value;
    }
  }
  return max === -Infinity ? 0 : max;
};

const evaluateNumericCondition = (
  actualValue: number,
  operator: string,
  targetValue: number
): boolean => {
  switch (operator) {
    case 'equals':
      return actualValue === targetValue;
    case 'not_equals':
      return actualValue !== targetValue;
    case 'greater_than':
      return actualValue > targetValue;
    case 'less_than':
      return actualValue < targetValue;
    case 'greater_equal':
      return actualValue >= targetValue;
    case 'less_equal':
      return actualValue <= targetValue;
    default:
      return false;
  }
};

export const getGroupStatistics = (
  data: Record<string, any>[],
  groupBy: string,
  matchingGroups: Set<string>
): { totalGroups: number; matchedGroups: number; groupPercentage: number } => {
  const allGroups = new Set<string>();
  
  for (const row of data) {
    const groupKey = String(row[groupBy] || '').trim();
    if (groupKey) {
      allGroups.add(groupKey);
    }
  }

  const totalGroups = allGroups.size;
  const matchedGroups = matchingGroups.size;
  const groupPercentage = totalGroups > 0 ? (matchedGroups / totalGroups) * 100 : 0;

  return { totalGroups, matchedGroups, groupPercentage };
};