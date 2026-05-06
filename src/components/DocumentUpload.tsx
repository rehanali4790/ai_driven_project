import { useState, useCallback } from 'react';
import {
  Upload,
  FileText,
  Image,
  FileSpreadsheet,
  File,
  X,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Sparkles,
  Download,
  Eye,
  Trash2,
  Filter,
  Search,
  Grid,
  List,
  RefreshCw
} from 'lucide-react';
import { useProjectData } from '@/context/ProjectDataContext';
import { api, getDocumentPreviewUrl } from '@/lib/api';

export default function DocumentUpload() {
  const { state, uploadDocument, reprocessDocument, deleteDocument, generateArtifacts, resetWorkspace } = useProjectData();
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiCheck, setAiCheck] = useState<{ ok: boolean; message: string } | null>(null);

  const documents = state?.documents ?? [];
  const processingDocs = documents.filter((doc) => doc.status === 'processing' || doc.currentStage === 'extracting' || doc.currentStage === 'parsing' || doc.currentStage === 'aggregating');
  const failedDocs = documents.filter((doc) => doc.status === 'failed');

  const latestActivity = state?.activities?.[0];

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-red-500" />;
      case 'excel':
        return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
      case 'image':
        return <Image className="w-8 h-8 text-blue-500" />;
      case 'word':
        return <FileText className="w-8 h-8 text-blue-600" />;
      default:
        return <File className="w-8 h-8 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string, progress?: number) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            <CheckCircle className="w-3 h-3" />
            Completed
          </span>
        );
      case 'processing':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing {progress ? `${progress}%` : ''}
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            <AlertTriangle className="w-3 h-3" />
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    setIsProcessing(true);
    Promise.all(files.map((file) => uploadDocument(file)))
      .finally(() => setIsProcessing(false));
  }, [uploadDocument]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setIsProcessing(true);
    try {
      for (const file of files) {
        await uploadDocument(file);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReprocess = async (docId: string) => {
    setIsProcessing(true);
    try {
      await reprocessDocument(docId);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (docId: string) => {
    await deleteDocument(docId);
  };

  const handleAIGenerate = async () => {
    setIsProcessing(true);
    try {
      await generateArtifacts();
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Management</h1>
          <p className="text-gray-500">Upload and process project documents with AI</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              setIsProcessing(true);
              try {
                await resetWorkspace();
              } finally {
                setIsProcessing(false);
              }
            }}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            disabled={isProcessing}
            title="Clear all documents and artifacts"
          >
            Reset Workspace
          </button>
          <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Data
          </button>
          <button
            onClick={handleAIGenerate}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
            disabled={isProcessing}
          >
            <Sparkles className={`w-4 h-4 ${isProcessing ? "animate-pulse" : ""}`} />
            {isProcessing ? "Generating..." : "AI Generate WBS"}
          </button>
          <button
            onClick={async () => {
              setAiCheck(null);
              try {
                const result = await api.aiPing();
                setAiCheck({
                  ok: Boolean(result.ok),
                  message: result.ok ? "OpenAI OK (ping success)." : `OpenAI error: ${result.error || "unknown error"}`,
                });
              } catch (e) {
                setAiCheck({ ok: false, message: e instanceof Error ? e.message : "AI ping failed" });
              }
            }}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Check AI
          </button>
        </div>
      </div>

      {(processingDocs.length > 0 || failedDocs.length > 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-900 mb-2">AI Processing Status</h3>
          {processingDocs.length > 0 && (
            <div className="space-y-3">
              {processingDocs.slice(0, 3).map((doc) => (
                <div key={doc.id} className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-blue-900 truncate">{doc.name}</p>
                    <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                      {doc.currentStage || doc.status}
                    </span>
                  </div>
                  <p className="text-xs text-blue-800 mt-1">
                    {doc.currentPage ? `Page ${doc.currentPage}/${doc.pageCount ?? "?"}` : `Progress: ${doc.progress ?? 0}%`}
                  </p>
                  {doc.lastMessage && <p className="text-xs text-blue-700 mt-1">{doc.lastMessage}</p>}
                </div>
              ))}
              <p className="text-xs text-gray-500">
                Refreshing automatically while documents are processing. WBS/Gantt updates once ingestion completes.
              </p>
            </div>
          )}
          {failedDocs.length > 0 && (
            <div className="mt-4 space-y-2">
              {failedDocs.slice(0, 2).map((doc) => (
                <div key={doc.id} className="p-3 rounded-lg bg-red-50 border border-red-100">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-red-900 truncate">{doc.name}</p>
                    <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">failed</span>
                  </div>
                  <p className="text-xs text-red-700 mt-1">{doc.error || doc.lastMessage || "Unknown parsing error"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {latestActivity && (
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 text-sm text-gray-700">
          <span className="font-semibold">Latest activity:</span> {latestActivity.action} — {latestActivity.detail}
        </div>
      )}

      {aiCheck && (
        <div className={`rounded-xl border p-4 text-sm ${aiCheck.ok ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          <span className="font-semibold">{aiCheck.ok ? 'AI Connectivity' : 'AI Connectivity Issue'}:</span> {aiCheck.message}
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        <div className="flex flex-col items-center">
          <div className={`p-4 rounded-full ${isDragging ? 'bg-blue-100' : 'bg-gray-100'}`}>
            <Upload className={`w-8 h-8 ${isDragging ? 'text-blue-600' : 'text-gray-500'}`} />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            {isDragging ? 'Drop files here' : 'Drag & drop files here'}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            or click to browse from your computer
          </p>
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg"
          />
          <label
            htmlFor="file-upload"
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Select Files
          </label>
          <p className="mt-4 text-xs text-gray-400">
            Supported formats: PDF, Excel (.xlsx, .xls), Word (.docx), Images (.png, .jpg)
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Document</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Size</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Parsed Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {getFileIcon(doc.type)}
                        <span className="text-sm font-medium text-gray-900">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600 uppercase">{doc.type}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">{doc.size}</span>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(doc.status, doc.progress)}
                    </td>
                    <td className="px-4 py-4">
                      {doc.parsedData ? (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
                            {doc.parsedData.tasksExtracted} tasks
                          </span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            {doc.parsedData.resourcesFound} resources
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">
                        {new Date(doc.uploadDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <a
                          href={getDocumentPreviewUrl(doc) || undefined}
                          target="_blank"
                          rel="noreferrer"
                          className={`p-2 rounded-lg transition-colors ${getDocumentPreviewUrl(doc) ? 'hover:bg-gray-100' : 'opacity-40 pointer-events-none'}`}
                          title="View"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </a>
                        {doc.status !== 'processing' && (
                          <button
                            onClick={() => handleReprocess(doc.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Reprocess"
                          >
                            <RefreshCw className="w-4 h-4 text-gray-500" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getFileIcon(doc.type)}
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-48">{doc.name}</p>
                      <p className="text-xs text-gray-500">{doc.size}</p>
                    </div>
                  </div>
                  {getStatusBadge(doc.status, doc.progress)}
                </div>
                {doc.parsedData && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold text-gray-900">{doc.parsedData.tasksExtracted}</p>
                        <p className="text-xs text-gray-500">Tasks</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900">{doc.parsedData.resourcesFound}</p>
                        <p className="text-xs text-gray-500">Resources</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900">{doc.parsedData.milestonesIdentified}</p>
                        <p className="text-xs text-gray-500">Milestones</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="mt-4 flex items-center gap-2">
                  <a
                    href={getDocumentPreviewUrl(doc) || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex-1 py-2 text-sm text-center rounded-lg transition-colors ${getDocumentPreviewUrl(doc) ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 bg-gray-50 pointer-events-none'}`}
                  >
                    View
                  </a>
                  {doc.status !== 'processing' && (
                    <button
                      onClick={() => handleReprocess(doc.id)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">AI Document Processing</h3>
            <p className="text-blue-100 text-sm">
              Our AI engine automatically extracts tasks, resources, milestones, and dependencies from your project documents.
            </p>
          </div>
          <button
            onClick={handleAIGenerate}
            className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Generate WBS from Documents
          </button>
        </div>
      </div>
    </div>
  );
}
