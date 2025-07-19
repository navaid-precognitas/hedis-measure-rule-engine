import React from 'react';
import { Users, Trash2, Copy, AlertCircle, TrendingUp } from 'lucide-react';
import { GroupCondition, GROUP_AGGREGATION_TYPES, OPERATORS } from '../types';

interface GroupConditionBuilderProps {
  condition: GroupCondition;
  columns: string[];
  onUpdate: (updates: Partial<GroupCondition>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}

export const GroupConditionBuilder: React.FC<GroupConditionBuilderProps> = ({
  condition,
  columns,
  onUpdate,
  onRemove,
  onDuplicate
}) => {
  const aggregationType = GROUP_AGGREGATION_TYPES.find(t => t.value === condition.aggregationType);
  const operator = OPERATORS.find(op => op.value === condition.operator);

  const getExampleDescription = () => {
    const groupCol = condition.groupBy || 'patient_id';
    const targetCol = condition.targetColumn || 'Code';
    const aggType = aggregationType?.label || 'Count of Distinct Values';
    const opSymbol = operator?.symbol || '≥';
    const value = condition.value || 2;
    const withinCol = condition.withinDistinct ? ` across different ${condition.withinDistinct}` : '';
    const action = condition.action === 'keep_matching_groups' ? 'Keep' : 'Exclude';
    
    return `${action} ${groupCol} groups where ${aggType.toLowerCase()} of ${targetCol}${withinCol} ${opSymbol} ${value}`;
  };

  return (
    <div className="bg-orange-50 rounded-lg p-4 border border-orange-200 hover:border-orange-300 transition-colors">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-orange-600" />
        <span className="font-medium text-orange-900">Group-Based Condition</span>
        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
          Multi-Row Analysis
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Group By Column */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Group By Column *
          </label>
          <select
            value={condition.groupBy}
            onChange={(e) => onUpdate({ groupBy: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">Select grouping column...</option>
            {columns.map(column => (
              <option key={column} value={column}>{column}</option>
            ))}
          </select>
          <div className="text-xs text-gray-500 mt-1">
            Column to group records by (e.g., patient_id, member_id)
          </div>
        </div>

        {/* Target Column */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target Column *
          </label>
          <select
            value={condition.targetColumn}
            onChange={(e) => onUpdate({ targetColumn: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">Select target column...</option>
            {columns.map(column => (
              <option key={column} value={column}>{column}</option>
            ))}
          </select>
          <div className="text-xs text-gray-500 mt-1">
            Column to analyze within each group
          </div>
        </div>

        {/* Aggregation Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Aggregation Type *
          </label>
          <select
            value={condition.aggregationType}
            onChange={(e) => onUpdate({ aggregationType: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            {GROUP_AGGREGATION_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <div className="text-xs text-gray-500 mt-1">
            {aggregationType?.description}
          </div>
        </div>

        {/* Operator */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Condition *
          </label>
          <select
            value={condition.operator}
            onChange={(e) => onUpdate({ operator: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            {OPERATORS.filter(op => ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal'].includes(op.value)).map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        </div>

        {/* Threshold Value */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Threshold Value *
          </label>
          <input
            type="number"
            value={condition.value}
            onChange={(e) => onUpdate({ value: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="Enter threshold..."
            min="0"
            step="0.1"
          />
        </div>

        {/* Within Distinct Column (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Within Distinct Column (Optional)
          </label>
          <select
            value={condition.withinDistinct || ''}
            onChange={(e) => onUpdate({ withinDistinct: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">No additional constraint</option>
            {columns.map(column => (
              <option key={column} value={column}>{column}</option>
            ))}
          </select>
          <div className="text-xs text-gray-500 mt-1">
            Require distinct values in this column (e.g., diagnosis_date)
          </div>
        </div>

        {/* Action */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Action *
          </label>
          <select
            value={condition.action}
            onChange={(e) => onUpdate({ action: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="keep_matching_groups">Keep Matching Groups</option>
            <option value="exclude_matching_groups">Exclude Matching Groups</option>
          </select>
        </div>
      </div>

      {/* Description */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description (Optional)
        </label>
        <input
          type="text"
          value={condition.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          placeholder="Describe this group condition..."
        />
      </div>

      {/* Example Preview */}
      {condition.groupBy && condition.targetColumn && (
        <div className="mb-4 bg-white rounded-lg border border-orange-200 p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-900">Rule Preview</span>
          </div>
          
          <div className="text-sm text-orange-800 bg-orange-50 px-3 py-2 rounded border border-orange-200">
            {getExampleDescription()}
          </div>

          <div className="mt-3 text-xs text-orange-700">
            <div className="font-medium mb-1">How this works:</div>
            <ol className="list-decimal list-inside space-y-1">
              <li>Group all records by <strong>{condition.groupBy}</strong></li>
              <li>For each group, calculate {aggregationType?.label.toLowerCase()} of <strong>{condition.targetColumn}</strong>
                {condition.withinDistinct && (
                  <span> (only counting records with distinct <strong>{condition.withinDistinct}</strong> values)</span>
                )}
              </li>
              <li>Check if result {operator?.symbol} {condition.value}</li>
              <li>{condition.action === 'keep_matching_groups' ? 'Keep all records' : 'Exclude all records'} from groups that meet the condition</li>
            </ol>
          </div>
        </div>
      )}

      {/* Validation Warning */}
      {(!condition.groupBy || !condition.targetColumn || !condition.value) && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              Please complete all required fields to enable this group condition.
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-orange-100">
        <button
          onClick={onDuplicate}
          className="flex items-center px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
        >
          <Copy className="w-4 h-4 mr-1" />
          Copy
        </button>
        
        <button
          onClick={onRemove}
          className="flex items-center px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Remove
        </button>
      </div>
    </div>
  );
};