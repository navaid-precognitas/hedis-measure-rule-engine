import React, { useState, useCallback } from 'react';
import { Upload, FileText, Trash2, Eye, EyeOff, Database, Download, AlertCircle, Info, Zap } from 'lucide-react';
import { ReferenceFile } from '../types';
import { parseCSVWithLimits } from '../utils/csvParser';

interface ReferenceFileManagerProps {
  referenceFiles: ReferenceFile[];
  onReferenceFilesChange: (files: ReferenceFile[]) => void;
}

export const ReferenceFileManager: React.FC<ReferenceFileManagerProps> = ({
  referenceFiles,
  onReferenceFilesChange
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      const reader = new FileReader();
      
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 50;
          setProcessingProgress(progress);
        }
      };

      reader.onload = (e) => {
        const csvText = e.target?.result as string;
        
        setTimeout(() => {
          try {
            setProcessingProgress(70);
            // For reference files, we'll keep more data available for filtering
            const { headers, rows, allRows, totalRows, isLimited } = parseCSVWithLimits(csvText, 100000);
            setProcessingProgress(90);
            
            const newReferenceFile: ReferenceFile = {
              id: generateId(),
              name: file.name.replace('.csv', ''),
              headers,
              rows, // Display rows (limited to 100K for reference files)
              allRows, // All rows for filtering and matching
              fileName: file.name,
              uploadedAt: new Date(),
              totalRows,
              isLimited,
              fileSize: file.size
            };

            onReferenceFilesChange([...referenceFiles, newReferenceFile]);
            setProcessingProgress(100);
            setTimeout(() => setIsProcessing(false), 500);
          } catch (error) {
            console.error('Error parsing reference file:', error);
            alert('Error parsing reference file. Please check the file format.');
            setIsProcessing(false);
          }
        }, 100);
      };
      
      reader.onerror = () => {
        alert('Error reading reference file');
        setIsProcessing(false);
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('Error handling reference file:', error);
      alert('Error processing reference file');
      setIsProcessing(false);
    }
  }, [referenceFiles, onReferenceFilesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.name.endsWith('.csv'));
    if (csvFile) {
      handleFile(csvFile);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const removeReferenceFile = (id: string) => {
    onReferenceFilesChange(referenceFiles.filter(f => f.id !== id));
  };

  const downloadSampleReferenceFile = () => {
    const sampleData = `Medication,Condition,Category
Metformin,Diabetes,Antidiabetic
Insulin,Diabetes,Antidiabetic
Lisinopril,Hypertension,ACE Inhibitor
Amlodipine,Hypertension,Calcium Channel Blocker
Atorvastatin,High Cholesterol,Statin
Simvastatin,High Cholesterol,Statin
Sertraline,Depression,SSRI
Fluoxetine,Depression,SSRI
Albuterol,Asthma,Bronchodilator
Montelukast,Asthma,Leukotriene Modifier`;
    
    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample_medication_reference.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const getTotalMemoryUsage = () => {
    return referenceFiles.reduce((total, file) => {
      return total + (file.fileSize || 0);
    }, 0);
  };

  const totalMemoryUsage = getTotalMemoryUsage();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Database className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">Reference Files</h3>
        <Zap className="w-4 h-4 text-yellow-500" title="Optimized for large files" />
        <span className="bg-purple-100 text-purple-600 text-xs px-2 py-1 rounded-full">
          {referenceFiles.length}
        </span>
        {totalMemoryUsage > 0 && (
          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
            {formatFileSize(totalMemoryUsage)}
          </span>
        )}
      </div>

      {/* Large File Support Info */}
      <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Zap className="w-4 h-4 text-green-600 mt-0.5" />
          <div className="text-sm text-green-800">
            <div className="font-medium mb-1">Large Reference File Support:</div>
            <ul className="text-xs space-y-1">
              <li>• Supports reference files of any size</li>
              <li>• Optimized processing for files up to 100K records</li>
              <li>• <strong>All data available for rule matching and filtering</strong></li>
              <li>• Smart display limiting for performance</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors mb-6 ${
          isDragging 
            ? 'border-purple-500 bg-purple-50' 
            : 'border-gray-300 hover:border-gray-400'
        } ${isProcessing ? 'opacity-75' : ''}`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
      >
        <Database className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-900 mb-2">
          {isProcessing ? 'Processing Reference File...' : 'Upload Reference Files'}
        </p>
        <p className="text-xs text-gray-500 mb-4">
          CSV files containing lookup data for cross-referencing (any size supported)
        </p>
        
        {isProcessing && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500">
              {Math.round(processingProgress)}% complete
            </div>
          </div>
        )}
        
        <input
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
          id="reference-upload"
          disabled={isProcessing}
        />
        <label
          htmlFor="reference-upload"
          className={`inline-flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors cursor-pointer text-sm ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Upload className="w-4 h-4 mr-2" />
          {isProcessing ? 'Processing...' : 'Browse Files'}
        </label>
      </div>

      {/* Sample Download */}
      <div className="mb-6">
        <button
          onClick={downloadSampleReferenceFile}
          className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Sample Reference File
        </button>
      </div>

      {/* Reference Files List */}
      {referenceFiles.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
          <Database className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-sm font-medium text-gray-600 mb-2">No reference files uploaded</p>
          <p className="text-xs text-gray-500">
            Upload CSV files to enable reference-based matching in your rules
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {referenceFiles.map((file) => (
            <div key={file.id} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <div>
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      {file.name}
                      {file.isLimited && (
                        <Info className="w-4 h-4 text-blue-600" title="Large file optimized" />
                      )}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {file.fileName}
                      {file.fileSize && ` • ${formatFileSize(file.fileSize)}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewFileId(previewFileId === file.id ? null : file.id)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Toggle preview"
                  >
                    {previewFileId === file.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => removeReferenceFile(file.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Large File Info */}
              {file.isLimited && (
                <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-2">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div className="text-xs text-blue-800">
                      <div className="font-medium">Large File Optimized</div>
                      <div>All {file.totalRows?.toLocaleString() || 'unknown'} records available for filtering and matching.</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 mb-3">
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="text-lg font-bold text-purple-600">{file.headers.length}</div>
                  <div className="text-xs text-purple-800">Columns</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-lg font-bold text-blue-600">
                    {(file.totalRows || file.rows.length).toLocaleString()}
                  </div>
                  <div className="text-xs text-blue-800">
                    Total Records
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-lg font-bold text-green-600">
                    {file.uploadedAt.toLocaleDateString()}
                  </div>
                  <div className="text-xs text-green-800">Uploaded</div>
                </div>
              </div>

              {/* Column Headers */}
              <div className="mb-3">
                <div className="text-xs font-medium text-gray-700 mb-2">Available Columns:</div>
                <div className="flex flex-wrap gap-1">
                  {file.headers.map((header, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded border"
                    >
                      {header}
                    </span>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {previewFileId === file.id && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          {file.headers.map((header, index) => (
                            <th key={index} className="px-2 py-2 text-left font-medium text-gray-900 border-b">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {file.rows.slice(0, 10).map((row, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            {file.headers.map((header, cellIndex) => (
                              <td key={cellIndex} className="px-2 py-2 text-gray-700">
                                {row[header] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="text-center py-2 text-xs text-gray-500">
                      Showing first 10 of {(file.totalRows || file.rows.length).toLocaleString()} total records
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Usage Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <div className="font-medium text-blue-800 mb-2">How to use Reference Files:</div>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• Upload CSV files containing lookup data (e.g., medications by condition)</li>
              <li>• Use reference conditions in rules to match main data against these files</li>
              <li>• Filter reference data by specific values (e.g., condition = "Diabetes")</li>
              <li>• Include or exclude records based on reference matches</li>
              <li>• Large files are automatically optimized for performance</li>
              <li>• <strong>All data is available for filtering - no truncation issues</strong></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};