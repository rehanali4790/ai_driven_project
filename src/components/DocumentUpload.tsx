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
  RefreshCw,
  Database
} from 'lucide-react';
import { useProjectData } from '@/context/ProjectDataContext';
import { api, getDocumentPreviewUrl } from '@/lib/api';
import ProjectToolbar from './ProjectToolbar';

export default function DocumentUpload() {
  const { state, uploadDocument, reprocessDocument, deleteDocument, generateArtifacts, resetWorkspace, workspace } = useProjectData();
  const activeProjectName = workspace?.projectList?.find((p: any) => p.id === workspace.activeProjectId)?.name;
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
        return <div className="p-2 bg-red-50 rounded-lg"><FileText className="w-5 h-5 text-red-500" /></div>;
      case 'excel':
        return <div className="p-2 bg-green-50 rounded-lg"><FileSpreadsheet className="w-5 h-5 text-green-600" /></div>;
      case 'image':
        return <div className="p-2 bg-blue-50 rounded-lg"><Image className="w-5 h-5 text-blue-500" /></div>;
      default:
        return <div className="p-2 bg-gray-50 rounded-lg"><File className="w-5 h-5 text-gray-500" /></div>;
    }
  };

  const getStatusBadge = (status: string, progress?: number) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f0f9f8] text-[#12b3a8] text-[11px] font-bold uppercase tracking-wider rounded-lg">
            <CheckCircle className="w-3 h-3" />
            Complete
          </span>
        );
      case 'processing':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 text-[11px] font-bold uppercase tracking-wider rounded-lg">
            <Loader2 className="w-3 h-3 animate-spin" />
            {progress ? `${progress}%` : 'Syncing'}
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-500 text-[11px] font-bold uppercase tracking-wider rounded-lg">
            <AlertTriangle className="w-3 h-3" />
            Error
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-400 text-[11px] font-bold uppercase tracking-wider rounded-lg">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
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

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-typography space-y-8 p-1">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#0f3433] tracking-tight">Document Management{activeProjectName && <> | <span className="text-[#12b3a8]">{activeProjectName}</span></>}</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Upload project source files for AI data extraction</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => resetWorkspace()}
            className="px-4 py-2 bg-white border border-gray-200 text-red-500 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-red-50 transition-all shadow-sm"
          >
            Reset
          </button>
          <button
            onClick={async () => {
              setAiCheck(null);
              const result = await api.aiPing();
              setAiCheck({ ok: !!result.ok, message: result.ok ? "Connected" : "Error" });
            }}
            className="px-4 py-2 bg-white border border-gray-200 text-[#0f3433] text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
          >
            <Database className="w-3.5 h-3.5" />
            Check AI
          </button>
          <button
            onClick={generateArtifacts}
            disabled={isProcessing}
            className="px-5 py-2.5 bg-[#12b3a8] text-white text-xs font-bold uppercase tracking-[1.5px] rounded-xl hover:bg-[#0e9188] transition-all shadow-sm flex items-center gap-2"
          >
            <Sparkles className={`w-4 h-4 ${isProcessing ? "animate-pulse" : ""}`} />
            {isProcessing ? "Processing..." : "Generate Artifacts"}
          </button>
        </div>
      </div>

      <ProjectToolbar />

      {/* Processing Status Panel */}
      {(processingDocs.length > 0 || failedDocs.length > 0) && (
        <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 p-6 flex flex-wrap gap-4">
          {processingDocs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 bg-[#f0f9f8] px-4 py-3 rounded-xl border border-[#e0f2f1]">
              <Loader2 className="w-4 h-4 text-[#12b3a8] animate-spin" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[#0f3433] truncate max-w-[150px]">{doc.name}</p>
                <p className="text-[9px] font-extrabold text-[#12b3a8] uppercase tracking-tighter">Parsing Schedule...</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dropzone - Reference Theme */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-[32px] p-12 transition-all duration-300 group ${
          isDragging
            ? 'border-[#12b3a8] bg-[#f0f9f8] scale-[1.01]'
            : 'border-gray-200 hover:border-[#12b3a8] hover:bg-gray-50'
        }`}
      >
        <div className="flex flex-col items-center text-center">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-500 mb-6 ${
            isDragging ? 'bg-[#12b3a8] text-white shadow-xl' : 'bg-gray-100 text-gray-400 group-hover:bg-[#f0f9f8] group-hover:text-[#12b3a8]'
          }`}>
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-[#0f3433]">
            {isDragging ? 'Drop your files now' : 'Upload source documents'}
          </h3>
          <p className="mt-2 text-sm text-gray-500 font-medium max-w-sm">
            Drag and drop your PDF schedules, Excel WBS, or project site images to start AI ingestion.
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
            className="mt-8 px-8 py-3 bg-[#0f3433] text-white text-sm font-bold rounded-xl cursor-pointer hover:bg-black transition-all shadow-lg active:scale-95"
          >
            Browse Files
          </label>
        </div>
      </div>

      {/* Documents Explorer Card */}
      <div className="bg-white rounded-[24px] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#12b3a8]" />
              <input
                type="text"
                placeholder="Find document..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl w-64 text-sm font-medium focus:ring-2 focus:ring-[#12b3a8]/20 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 p-1 bg-gray-50 rounded-xl border border-gray-100">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-[#12b3a8]' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#12b3a8]' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Section */}
        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-sm font-bold text-gray-950 uppercase tracking-wider">Filename</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-950 uppercase tracking-wider">Format</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-950 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-950 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        {getFileIcon(doc.type)}
                        <span className="text-sm font-bold text-[#0f3433]">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-gray-400 uppercase">{doc.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(doc.status, doc.progress)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={getDocumentPreviewUrl(doc) || "#"}
                          target="_blank"
                          className="p-2 text-gray-400 hover:text-[#12b3a8] transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => reprocessDocument(doc.id)}
                          className="p-2 text-gray-400 hover:text-[#0f3433]"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteDocument(doc.id)}
                          className="p-2 text-red-300 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-[#12b3a8] transition-all hover:shadow-md group">
                <div className="flex items-start justify-between mb-4">
                  {getFileIcon(doc.type)}
                  {getStatusBadge(doc.status, doc.progress)}
                </div>
                <p className="text-sm font-bold text-[#0f3433] truncate mb-1">{doc.name}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-4">{doc.size}</p>
                
                {doc.parsedData && (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-[#f0f9f8] p-2 rounded-xl text-center">
                      <p className="text-sm font-extrabold text-[#12b3a8]">{doc.parsedData.tasksExtracted}</p>
                      <p className="text-[9px] text-gray-500 font-bold uppercase">Tasks</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-xl text-center">
                      <p className="text-sm font-extrabold text-[#0f3433]">{doc.parsedData.resourcesFound}</p>
                      <p className="text-[9px] text-gray-500 font-bold uppercase">People</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                  <a
                    href={getDocumentPreviewUrl(doc) || "#"}
                    target="_blank"
                    className="flex-1 py-2 text-[11px] font-extrabold text-center text-gray-400 bg-gray-50 rounded-lg hover:bg-[#12b3a8] hover:text-white transition-all uppercase"
                  >
                    View
                  </a>
                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className="p-2 text-red-300 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Insight Section */}

    </div>
  );
}