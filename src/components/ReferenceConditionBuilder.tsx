import React from 'react';
import { Database, Filter, Trash2, Copy, AlertCircle } from 'lucide-react';
import { ReferenceCondition, ReferenceFile, REFERENCE_OPERATORS } from '../types';

interface ReferenceConditionBuilderProps {
  condition: ReferenceCondition;
  referenceFiles: ReferenceFile[];
  columns: string[];
  onUpdate: (updates: Partial<ReferenceCondition>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}

export const ReferenceConditionBuilder: React.FC<ReferenceConditionBuilderProps> = ({
  condition,
  referenceFiles,
  columns,
  onUpdate,
  onRemove,
  onDuplicate
}) => {
  const selectedReferenceFile = referenceFiles.find(f => f.id === condition.referenceFileId);
  const operatorInfo = REFERENCE_OPERATORS.find(op => op.value === condition.type);

  const getUniqueValues = (columnName: string): string[] => {
    if (!selectedReferenceFile) return [];
    
    // Use allRows if available (for large files), otherwise use rows
    const dataToUse = selectedReferenceFile.allRows || selectedReferenceFile.rows;
    
    const values = dataToUse
      .map(row => row[columnName])
      .filter(value => value && String(value).trim() !== '')
      .map(value => String(value).trim());
    
    return [...new Set(values)].sort();
  };

  const getFilteredReferenceData = () => {
    if (!selectedReferenceFile) return [];
    
    // Use allRows if available (for large files), otherwise use rows
    const dataToUse = selectedReferenceFile.allRows || selectedReferenceFile.rows;
    
    if (!condition.filterColumn || !condition.filterValue) {
      return dataToUse;
    }
    
    return dataToUse.filter(row => 
      String(row[condition.filterColumn!]).toLowerCase().trim() === 
      condition.filterValue!.toLowerCase().trim()
    );
  };

  const filteredData = getFilteredReferenceData();
  const matchCount = filteredData.length;

  return (
    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200 hover:border-purple-300 transition-colors">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-5 h-5 text-purple-600" />
        <span className="font-medium text-purple-900">Reference Condition</span>
        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
          {operatorInfo?.symbol} {operatorInfo?.label}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Condition Type Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Condition Type
          </label>
          <select
            value={condition.type}
            onChange={(e) => onUpdate({ type: e.target.value as 'reference_match' | 'reference_not_match' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            {REFERENCE_OPERATORS.map(operator => (
              <option key={operator.value} value={operator.value}>
                {operator.symbol} {operator.label}
              </option>
            ))}
          </select>
          <div className="text-xs text-gray-500 mt-1">
            {operatorInfo?.description}
          </div>
        </div>

        {/* Main Data Column */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Main Data Column
          </label>
          <select
            value={condition.column}
            onChange={(e) => onUpdate({ column: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">Select column...</option>
            {columns.map(column => (
              <option key={column} value={column}>{column}</option>
            ))}
          </select>
        </div>

        {/* Reference File */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reference File
          </label>
          <select
            value={condition.referenceFileId}
            onChange={(e) => onUpdate({ 
              referenceFileId: e.target.value,
              referenceColumn: '',
              filterColumn: '',
              filterValue: ''
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">Select reference file...</option>
            {referenceFiles.map(file => (
              <option key={file.id} value={file.id}>
                {file.name} ({(file.totalRows || file.rows.length).toLocaleString()} records)
              </option>
            ))}
          </select>
        </div>

        {/* Reference Column */}
        {selectedReferenceFile && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference Column to Match
            </label>
            <select
              value={condition.referenceColumn}
              onChange={(e) => onUpdate({ referenceColumn: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Select column to match...</option>
              {selectedReferenceFile.headers.map(header => (
                <option key={header} value={header}>{header}</option>
              ))}
            </select>
          </div>
        )}

        {/* Filter Column (Optional) */}
        {selectedReferenceFile && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter Reference By (Optional)
            </label>
            <select
              value={condition.filterColumn || ''}
              onChange={(e) => onUpdate({ 
                filterColumn: e.target.value || undefined,
                filterValue: ''
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">No filter (use all records)</option>
              {selectedReferenceFile.headers.map(header => (
                <option key={header} value={header}>{header}</option>
              ))}
            </select>
          </div>
        )}

        {/* Filter Value */}
        {condition.filterColumn && selectedReferenceFile && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter Value
            </label>
            <select
              value={condition.filterValue || ''}
              onChange={(e) => onUpdate({ filterValue: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Select filter value...</option>
              {getUniqueValues(condition.filterColumn).map(value => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>
        )}
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder="Describe this reference condition..."
        />
      </div>

      {/* Match Preview */}
      {selectedReferenceFile && condition.referenceColumn && (
        <div className="mb-4 bg-white rounded-lg border border-purple-200 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">Match Preview</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total reference records:</span>
              <span className="ml-2 font-medium">{(selectedReferenceFile.totalRows || selectedReferenceFile.rows.length).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-600">After filtering:</span>
              <span className="ml-2 font-medium text-purple-600">{matchCount.toLocaleString()}</span>
            </div>
          </div>

          {condition.filterColumn && condition.filterValue && (
            <div className="mt-2 text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded">
              Filtering by: {condition.filterColumn} = "{condition.filterValue}"
            </div>
          )}

          {/* Show what the condition will do */}
          <div className={`mt-3 p-2 rounded text-sm ${
            condition.type === 'reference_match' 
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="font-medium mb-1">
              {condition.type === 'reference_match' ? '✓ Include' : '✗ Exclude'} records where:
            </div>
            <div>
              {condition.column} {condition.type === 'reference_match' ? 'matches' : 'does not match'} values in {selectedReferenceFile.name}.{condition.referenceColumn}
              {condition.filterColumn && condition.filterValue && (
                <span> (filtered by {condition.filterColumn} = "{condition.filterValue}")</span>
              )}
            </div>
          </div>

          {matchCount > 0 && (
            <div className="mt-3">
              <div className="text-xs text-gray-600 mb-1">
                Sample values that will be {condition.type === 'reference_match' ? 'included' : 'excluded'}:
              </div>
              <div className="flex flex-wrap gap-1">
                {filteredData
                  .slice(0, 10)
                  .map(row => row[condition.referenceColumn])
                  .filter(value => value)
                  .map((value, index) => (
                    <span
                      key={index}
                      className={`px-2 py-1 text-xs rounded ${
                        condition.type === 'reference_match'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {String(value)}
                    </span>
                  ))}
                {filteredData.length > 10 && (
                  <span className="text-xs text-gray-500">
                    +{(filteredData.length - 10).toLocaleString()} more...
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Validation Warning */}
      {(!condition.column || !condition.referenceFileId || !condition.referenceColumn) && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              Please complete all required fields to enable this reference condition.
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-purple-100">
        <button
          onClick={onDuplicate}
          className="flex items-center px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
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