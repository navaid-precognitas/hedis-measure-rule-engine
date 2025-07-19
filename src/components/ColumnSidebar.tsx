import React from 'react';
import { Database, Type, Hash, Calendar, Users } from 'lucide-react';

interface ColumnSidebarProps {
  columns: string[];
  onColumnSelect: (column: string) => void;
  selectedColumn: string | null;
}

const getColumnIcon = (columnName: string) => {
  const name = columnName.toLowerCase();
  if (name.includes('id') || name.includes('number')) return Hash;
  if (name.includes('date') || name.includes('time')) return Calendar;
  if (name.includes('age') || name.includes('count')) return Hash;
  if (name.includes('name') || name.includes('gender')) return Users;
  return Type;
};

const getColumnType = (columnName: string) => {
  const name = columnName.toLowerCase();
  if (name.includes('id') || name.includes('number') || name.includes('age') || name.includes('bmi')) return 'numeric';
  if (name.includes('date') || name.includes('time')) return 'date';
  if (name.includes('email') || name.includes('phone')) return 'contact';
  return 'text';
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'numeric': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'date': return 'bg-green-50 text-green-700 border-green-200';
    case 'contact': return 'bg-purple-50 text-purple-700 border-purple-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

export const ColumnSidebar: React.FC<ColumnSidebarProps> = ({ 
  columns, 
  onColumnSelect, 
  selectedColumn 
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Available Columns</h3>
        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
          {columns.length}
        </span>
      </div>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {columns.map((column, index) => {
          const IconComponent = getColumnIcon(column);
          const type = getColumnType(column);
          const isSelected = selectedColumn === column;
          
          return (
            <div
              key={index}
              onClick={() => onColumnSelect(column)}
              className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50 shadow-sm' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <IconComponent className={`w-4 h-4 mt-0.5 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                    {column}
                  </div>
                  <div className={`text-xs mt-1 px-2 py-1 rounded border inline-block ${getTypeColor(type)}`}>
                    {type}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {columns.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No columns available</p>
          <p className="text-xs mt-1">Upload a CSV file to see columns</p>
        </div>
      )}
    </div>
  );
};