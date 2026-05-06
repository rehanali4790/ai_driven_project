import { useMemo, useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Search,
  GitBranch,
  CheckCircle,
  Clock,
  AlertTriangle,
  Sparkles
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
    completed: 'bg-green-100 text-green-700',
    in_progress: 'bg-blue-100 text-blue-700',
    not_started: 'bg-gray-100 text-gray-600',
    at_risk: 'bg-red-100 text-red-700',
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
        className={`hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
        onClick={() => onSelect(node)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center" style={{ paddingLeft: `${node.level * 24 + 8}px` }}>
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(node.id);
                }}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}
            <GitBranch className="w-4 h-4 text-gray-400 ml-2" />
            <span className="ml-2 text-sm font-mono text-gray-600">{node.code}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm font-medium text-gray-900">{node.name}</span>
        </td>
        <td className="px-4 py-3">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[node.status]}`}>
            <span className="flex items-center gap-1">
              <StatusIcon className="w-3 h-3" />
              {node.status.replace('_', ' ')}
            </span>
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-20">
              <div
                className={`h-full rounded-full ${
                  node.progress === 100 ? 'bg-green-500' : node.progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                }`}
                style={{ width: `${node.progress}%` }}
              />
            </div>
            <span className="text-sm text-gray-600 w-10">{node.progress}%</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs text-gray-400 capitalize">{node.type.replace('_', ' ')}</span>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Work Breakdown Structure</h1>
          <p className="text-gray-500">Hierarchical decomposition of project deliverables</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              setIsGenerating(true);
              try {
                await generateArtifacts();
              } finally {
                setIsGenerating(false);
              }
            }}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
            {isGenerating ? 'Generating...' : 'AI Generate WBS'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-900 mb-1">AI Generation Feedback</h3>
        {isGenerating ? (
          <p className="text-sm text-gray-600">
            Regenerating WBS/tasks/milestones from the latest stored document context...
          </p>
        ) : latestActivity ? (
          <p className="text-sm text-gray-600">
            Latest: <span className="font-medium text-gray-900">{latestActivity.action}</span> —{" "}
            <span className="text-gray-700">{latestActivity.detail}</span>
          </p>
        ) : (
          <p className="text-sm text-gray-600">No AI actions recorded yet.</p>
        )}

        {processingDocs.length > 0 && (
          <div className="mt-3 text-sm">
            <p className="font-medium text-blue-700">Documents currently processing:</p>
            {processingDocs.slice(0, 2).map((doc) => (
              <p key={doc.id} className="text-blue-800">
                {doc.name} ({doc.currentStage || doc.status}
                {doc.currentPage ? `, page ${doc.currentPage}/${doc.pageCount ?? "?"}` : ""})
              </p>
            ))}
          </div>
        )}

        {failedDocs.length > 0 && (
          <div className="mt-3 text-sm">
            <p className="font-medium text-red-700">Documents failed to parse:</p>
            {failedDocs.slice(0, 2).map((doc) => (
              <p key={doc.id} className="text-red-800">
                {doc.name}: {doc.error || doc.lastMessage || "Unknown error"}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search WBS elements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Overall Progress:</span>
              <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${rootNode.progress}%` }} />
              </div>
              <span className="text-sm font-medium text-gray-900">{rootNode.progress}%</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-64">
                  WBS Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Element Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-40">
                  Progress
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {renderWBS(rootNode)}
            </tbody>
          </table>
        </div>
      </div>

      {selectedNode && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Element Details</h3>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="text-sm text-gray-500">WBS Code</label>
              <p className="text-gray-900 font-medium">{selectedNode.code}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Element Name</label>
              <p className="text-gray-900 font-medium">{selectedNode.name}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Type</label>
              <p className="text-gray-900 font-medium capitalize">{selectedNode.type.replace('_', ' ')}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Status</label>
              <p className="text-gray-900 font-medium capitalize">{selectedNode.status.replace('_', ' ')}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Progress</label>
              <p className="text-gray-900 font-medium">{selectedNode.progress}%</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Child Elements</label>
              <p className="text-gray-900 font-medium">{selectedNode.children?.length || 0}</p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
        {visibleCount} WBS nodes currently stored. Re-run AI generation after uploading revised PDFs or schedules to automatically restructure the breakdown.
      </div>
    </div>
  );
}
