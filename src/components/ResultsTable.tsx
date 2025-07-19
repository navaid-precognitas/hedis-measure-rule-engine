import React, { useState } from 'react';
import { Download, Eye, EyeOff, BarChart3, TrendingUp, Users, CheckCircle, UserCheck, AlertTriangle, Cpu } from 'lucide-react';
import { EvaluationResult } from '../types';

interface ResultsTableProps {
  results: EvaluationResult;
  columns: string[];
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ results, columns }) => {
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 25; // Reduced for better performance with large datasets

  const visibleColumns = showAllColumns ? columns : columns.slice(0, 6);
  const totalPages = Math.ceil(results.matchedRows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = results.matchedRows.slice(startIndex, endIndex);

  const exportResults = () => {
    const headers = columns.join(',');
    const rows = results.matchedRows.map(row => 
      columns.map(col => row[col] || '').join(',')
    ).join('\n');
    
    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hedis_results_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getMatchRateColor = (percentage: number) => {
    if (percentage >= 80) return 'from-green-500 to-emerald-500';
    if (percentage >= 60) return 'from-yellow-500 to-orange-500';
    if (percentage >= 40) return 'from-orange-500 to-red-500';
    return 'from-red-500 to-red-600';
  };

  const getMatchRateTextColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-700';
    if (percentage >= 60) return 'text-yellow-700';
    if (percentage >= 40) return 'text-orange-700';
    return 'text-red-700';
  };

  const isLargeDataset = results.totalRows > 1000000;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Evaluation Results
              {isLargeDataset && (
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  <Cpu className="w-3 h-3" />
                  Large Dataset
                </div>
              )}
            </h3>
            <p className="text-gray-600">
              Analysis complete - {isLargeDataset ? 'optimized processing for large dataset' : 'review your findings below'}
            </p>
          </div>
        </div>
        
        {results.matchedRows.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAllColumns(!showAllColumns)}
              className="flex items-center px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
            >
              {showAllColumns ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showAllColumns ? 'Show Less' : 'Show All Columns'}
            </button>
            
            <button
              onClick={exportResults}
              className="flex items-center px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Results
            </button>
          </div>
        )}
      </div>

      {/* Enhanced Performance Warning for Large Datasets */}
      {isLargeDataset && (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Cpu className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <div className="font-semibold mb-1">🚀 Large Dataset Processing Complete</div>
              <div>
                Successfully processed <strong>{results.totalRows.toLocaleString()}</strong> records with optimized algorithms.
                Results are paginated for optimal performance. All data is available for export.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl font-bold text-blue-700">{results.totalRows.toLocaleString()}</div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
          <div className="text-sm font-semibold text-blue-800">Total Records</div>
          <div className="text-xs text-blue-600 mt-1">
            {isLargeDataset ? 'Large dataset processed' : 'Analyzed in evaluation'}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl font-bold text-green-700">{results.matchedCount.toLocaleString()}</div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <div className="text-sm font-semibold text-green-800">Matched Records</div>
          <div className="text-xs text-green-600 mt-1">Met all criteria</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <div className={`text-3xl font-bold ${getMatchRateTextColor(results.percentage)}`}>
              {results.percentage.toFixed(1)}%
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
          <div className="text-sm font-semibold text-purple-800">Match Rate</div>
          <div className="text-xs text-purple-600 mt-1">Success percentage</div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl font-bold text-orange-700">{(results.totalRows - results.matchedCount).toLocaleString()}</div>
            <BarChart3 className="w-8 h-8 text-orange-500" />
          </div>
          <div className="text-sm font-semibold text-orange-800">Excluded Records</div>
          <div className="text-xs text-orange-600 mt-1">Did not meet criteria</div>
        </div>
      </div>

      {/* Group Statistics (if available) */}
      {results.groupStats && (
        <div className="mb-8 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-6 border border-orange-200">
          <div className="flex items-center gap-3 mb-4">
            <UserCheck className="w-6 h-6 text-orange-600" />
            <h4 className="text-lg font-semibold text-orange-900">Group Analysis Results</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="text-2xl font-bold text-orange-700">{results.groupStats.totalGroups.toLocaleString()}</div>
              <div className="text-sm font-medium text-orange-800">Total Groups</div>
              <div className="text-xs text-orange-600 mt-1">Unique group identifiers</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="text-2xl font-bold text-green-700">{results.groupStats.matchedGroups.toLocaleString()}</div>
              <div className="text-sm font-medium text-green-800">Matched Groups</div>
              <div className="text-xs text-green-600 mt-1">Groups meeting criteria</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="text-2xl font-bold text-purple-700">{results.groupStats.groupPercentage.toFixed(1)}%</div>
              <div className="text-sm font-medium text-purple-800">Group Success Rate</div>
              <div className="text-xs text-purple-600 mt-1">Percentage of groups matched</div>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-orange-700">
            <strong>Group-based filtering:</strong> {results.groupStats.matchedGroups.toLocaleString()} out of {results.groupStats.totalGroups.toLocaleString()} groups met the specified criteria, 
            resulting in {results.matchedCount.toLocaleString()} individual records being included in the final results.
          </div>
        </div>
      )}

      {/* Match Rate Visualization */}
      <div className="mb-8 bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">Match Rate Analysis</h4>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getMatchRateTextColor(results.percentage)} bg-white border`}>
            {results.percentage.toFixed(1)}% Success Rate
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
          <div 
            className={`h-4 rounded-full bg-gradient-to-r ${getMatchRateColor(results.percentage)} transition-all duration-1000`}
            style={{ width: `${results.percentage}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {results.matchedRows.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="w-10 h-10 text-gray-400" />
          </div>
          <h4 className="text-xl font-semibold text-gray-600 mb-2">No Matching Records Found</h4>
          <p className="text-gray-500 mb-6">Your current rules didn't match any records in the dataset.</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <h5 className="font-medium text-blue-900 mb-2">Suggestions:</h5>
            <ul className="text-sm text-blue-800 text-left space-y-1">
              <li>• Review your rule conditions for accuracy</li>
              <li>• Check if column names match your data</li>
              <li>• Consider adjusting value ranges or criteria</li>
              <li>• Verify reference file matches if used</li>
              <li>• Check group condition thresholds if applicable</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Performance Notice for Large Results */}
          {results.matchedRows.length > 10000 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <div className="font-medium mb-1">Large Result Set Detected</div>
                  <div>
                    Displaying results in pages of {rowsPerPage} for optimal performance. 
                    Use the export function to download all {results.matchedRows.length.toLocaleString()} results.
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-white border-b border-gray-200">
                    <th className="px-4 py-4 text-left font-semibold text-gray-900 bg-gray-50">#</th>
                    {visibleColumns.map((column, index) => (
                      <th key={index} className="px-4 py-4 text-left font-semibold text-gray-900 bg-gray-50">
                        {column}
                      </th>
                    ))}
                    {!showAllColumns && columns.length > 6 && (
                      <th className="px-4 py-4 text-left font-medium text-gray-500 bg-gray-50">
                        +{columns.length - 6} more...
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {currentRows.map((row, index) => (
                    <tr key={startIndex + index} className="hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-4 text-gray-600 font-medium bg-gray-50">
                        {startIndex + index + 1}
                      </td>
                      {visibleColumns.map((column, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-4 text-gray-800">
                          {row[column] || '-'}
                        </td>
                      ))}
                      {!showAllColumns && columns.length > 6 && (
                        <td className="px-4 py-4 text-gray-400">...</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(endIndex, results.matchedRows.length)}</span> of <span className="font-medium">{results.matchedRows.length.toLocaleString()}</span> results
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                
                <span className="text-sm text-gray-600 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                  Page {currentPage} of {totalPages.toLocaleString()}
                </span>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};