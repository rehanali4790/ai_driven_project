import { useMemo, useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Search,
  GitBranch,
  CheckCircle,
  Clock,
  AlertTriangle,
  Sparkles,
  Info
} from 'lucide-react';
import { useProjectData } from '@/context/ProjectDataContext';
import { WBSNode } from '@/lib/types';

interface WBSRowProps {
  node: WBSNode;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (node: WBSNode) => void;
  selectedNode: WBSNode | null;
}

function WBSRow({ node, expandedNodes, onToggle, onSelect, selectedNode }: WBSRowProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedNode?.id === node.id;

  const statusColors = {
    completed: 'bg-[#f0f9f8] text-[#12b3a8]',
    in_progress: 'bg-emerald-50 text-emerald-600',
    not_started: 'bg-gray-50 text-gray-500',
    at_risk: 'bg-red-50 text-red-500',
  };

  const statusIcons = {
    completed: CheckCircle,
    in_progress: Clock,
    not_started: AlertTriangle,
    at_risk: AlertTriangle,
  };

  const StatusIcon = statusIcons[node.status];

  return (
    <>
      <tr
        className={`group cursor-pointer transition-all border-b border-gray-50/50 ${
          isSelected ? 'bg-[#f0f9f8]/50' : 'hover:bg-gray-50/80'
        }`}
        onClick={() => onSelect(node)}
      >
        <td className="px-6 py-4">
          <div className="flex items-center" style={{ paddingLeft: `${node.level * 20}px` }}>
            <div className="w-6 flex items-center justify-center">
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(node.id);
                  }}
                  className="p-1 hover:bg-white rounded shadow-sm transition-all"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                  )}
                </button>
              ) : (
                <div className="w-1.5 h-1.5 bg-gray-200 rounded-full ml-1" />
              )}
            </div>
            <span className="ml-3 text-[13px] font-bold text-gray-400 font-mono tracking-tight">{node.code}</span>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <GitBranch className={`w-4 h-4 ${isSelected ? 'text-[#12b3a8]' : 'text-gray-300'}`} />
            <span className={`text-sm font-bold ${isSelected ? 'text-[#0f3433]' : 'text-gray-700'}`}>
              {node.name}
            </span>
          </div>
        </td>
        <td className="px-6 py-4">
          <span className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest rounded-lg flex items-center gap-1.5 w-fit ${statusColors[node.status]}`}>
            <StatusIcon className="w-3 h-3" />
            {node.status.replace('_', ' ')}
          </span>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  node.progress === 100 ? 'bg-[#12b3a8]' : node.progress >= 50 ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
                style={{ width: `${node.progress}%` }}
              />
            </div>
            <span className="text-[12px] font-bold text-[#0f3433]">{node.progress}%</span>
          </div>
        </td>
        <td className="px-6 py-4">
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-tighter">{node.type.replace('_', ' ')}</span>
        </td>
      </tr>
    </>
  );
}

export default function WBSView() {
  const { state, generateArtifacts } = useProjectData();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['1']));
  const [selectedNode, setSelectedNode] = useState<WBSNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const rootNode = state?.wbs;
  const latestActivity = state?.activities?.[0];
  const processingDocs = (state?.documents ?? []).filter((doc) => doc.status === 'processing');
  const failedDocs = (state?.documents ?? []).filter((doc) => doc.status === 'failed');

  const visibleCount = useMemo(() => {
    const countNodes = (node: WBSNode): number =>
      1 + (node.children?.reduce((sum, child) => sum + countNodes(child), 0) ?? 0);
    return rootNode ? countNodes(rootNode) : 0;
  }, [rootNode]);

  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const renderWBS = (node: WBSNode): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    const matchesSearch = searchTerm === '' ||
      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.code.includes(searchTerm);

    if (matchesSearch) {
      elements.push(
        <WBSRow
          key={node.id}
          node={node}
          expandedNodes={expandedNodes}
          onToggle={toggleNode}
          onSelect={setSelectedNode}
          selectedNode={selectedNode}
        />
      );
    }

    if (node.children) {
      if (expandedNodes.has(node.id) || searchTerm !== '') {
        node.children.forEach((child) => {
          elements.push(...renderWBS(child));
        });
      }
    }
    return elements;
  };

  if (!rootNode) return null;

  return (
    <div className="space-y-8 p-1">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#0f3433] tracking-tight">Work Breakdown Structure</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Hierarchical task decomposition generated via AI parsing</p>
        </div>
        <button
          onClick={async () => {
            setIsGenerating(true);
            try { await generateArtifacts(); } finally { setIsGenerating(false); }
          }}
          className="px-6 py-2.5 bg-[#12b3a8] text-white text-xs font-bold uppercase tracking-[1.5px] rounded-xl hover:bg-[#0e9188] transition-all shadow-sm flex items-center gap-2 active:scale-95"
        >
          <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
          {isGenerating ? 'Regenerating...' : 'AI Generate WBS'}
        </button>
      </div>

      {/* AI Processing Status Card */}
      {(isGenerating || processingDocs.length > 0 || failedDocs.length > 0) && (
        <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#f0f9f8] rounded-lg">
              <Sparkles className="w-4 h-4 text-[#12b3a8]" />
            </div>
            <h3 className="text-sm font-bold text-[#0f3433] uppercase tracking-widest">AI Engine Status</h3>
          </div>
          <div className="space-y-3">
            {isGenerating && (
              <div className="p-3 bg-gray-50 rounded-xl flex items-center gap-3">
                <div className="w-2 h-2 bg-[#12b3a8] rounded-full animate-ping" />
                <p className="text-xs font-medium text-gray-600">Analyzing document context and reconstructing task graph...</p>
              </div>
            )}
            {processingDocs.map((doc) => (
              <div key={doc.id} className="text-xs font-bold text-[#12b3a8] px-3">
                Syncing {doc.name}... ({doc.currentStage || 'Processing'})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-[24px] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#12b3a8] transition-colors" />
            <input
              type="text"
              placeholder="Find WBS element..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl w-72 text-sm font-medium focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none"
            />
          </div>
          
          <div className="flex items-center gap-4 bg-gray-50/50 px-4 py-2 rounded-xl border border-gray-100">
            <div className="flex flex-col">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest text-right">Project Progress</span>
              <div className="flex items-center gap-3 mt-0.5">
                <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#12b3a8]" style={{ width: `${rootNode.progress}%` }} />
                </div>
                <span className="text-sm font-black text-[#0f3433]">{rootNode.progress}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest text-left w-64">Hierarchy Code</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest text-left">Deliverable Name</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest text-left w-32">Status</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest text-left w-44">Progress</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest text-left w-24">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {renderWBS(rootNode)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Card */}
      {selectedNode && (
        <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-[#f0f9f8] rounded-xl text-[#12b3a8]">
              <Info className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#0f3433]">Element Details</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {[
              { label: 'WBS Code', val: selectedNode.code },
              { label: 'Name', val: selectedNode.name },
              { label: 'Type', val: selectedNode.type.replace('_', ' ') },
              { label: 'Status', val: selectedNode.status.replace('_', ' ') },
              { label: 'Progress', val: `${selectedNode.progress}%` },
              { label: 'Children', val: selectedNode.children?.length || 0 }
            ].map((item, idx) => (
              <div key={idx} className="space-y-1">
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">{item.label}</label>
                <p className="text-sm font-bold text-[#0f3433] capitalize">{item.val}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center gap-3 p-5 bg-[#0f3433] rounded-[24px] text-white shadow-lg overflow-hidden relative">
        <div className="p-2 bg-white/10 rounded-lg">
          <GitBranch className="w-5 h-5 text-[#12b3a8]" />
        </div>
        <p className="text-xs font-medium text-[#a0c4c2] relative z-10">
          Currently managing <span className="text-white font-bold">{visibleCount}</span> unique WBS nodes. Updates are synchronized with project artifacts in real-time.
        </p>
        <div className="absolute right-0 top-0 w-32 h-32 bg-[#12b3a8]/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
      </div>
    </div>
  );
}