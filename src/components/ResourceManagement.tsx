import { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Briefcase,
  TrendingUp,
  DollarSign,
  Download
} from 'lucide-react';
import { useProjectData } from '@/context/ProjectDataContext';

export default function ResourceManagement() {
  const { state, upsertResource, userRole } = useProjectData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [scopeTab, setScopeTab] = useState<'all' | 'global' | 'project'>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'people' | 'equipment'>('all');
  const [showForm, setShowForm] = useState(false);
  const [resourceDraft, setResourceDraft] = useState({
    name: '',
    role: '',
    type: 'person' as 'person' | 'equipment' | 'material',
    allocated: 0,
    capacity: 100,
    status: 'available' as 'available' | 'allocated' | 'on_leave',
    costRate: 0,
    rateBasis: 'hour' as const,
    scope: 'project' as 'global' | 'project',
    skills: '',
    email: '',
  });

  const resources = state?.resources ?? [];
  const canManageResources = userRole === "admin" || userRole === "manager";
  const canOrgResources = userRole === "admin";
  const allocations = state?.allocations ?? [];

  const filteredResources = resources.filter((resource) => {
    const matchesSearch = resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || resource.type === selectedType;
    const matchesTab = activeTab === 'all' ||
      (activeTab === 'people' && resource.type === 'person') ||
      (activeTab === 'equipment' && resource.type === 'equipment');
    const matchesScope =
      scopeTab === 'all' ||
      (scopeTab === 'global' && resource.scope === 'global') ||
      (scopeTab === 'project' && resource.scope === 'project');
    return matchesSearch && matchesType && matchesTab && matchesScope;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-700';
      case 'allocated': return 'bg-blue-100 text-blue-700';
      case 'on_leave': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const totalCost = resources.reduce((sum, r) => sum + (r.costRate * r.allocated / 100), 0);
  const avgUtilization = resources.length
    ? resources.reduce((sum, r) => sum + r.allocated, 0) / resources.length
    : 0;

  if (!state) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resource Management</h1>
          <p className="text-gray-500">Manage team members, equipment, and allocations</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Close Form' : 'Add Resource'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin / Stakeholder Resource Update</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              value={resourceDraft.name}
              onChange={(e) => setResourceDraft({ ...resourceDraft, name: e.target.value })}
              placeholder="Resource name"
              className="px-3 py-2 border border-gray-200 rounded-lg"
            />
            <input
              value={resourceDraft.role}
              onChange={(e) => setResourceDraft({ ...resourceDraft, role: e.target.value })}
              placeholder="Role"
              className="px-3 py-2 border border-gray-200 rounded-lg"
            />
            <select
              value={resourceDraft.type}
              onChange={(e) => setResourceDraft({ ...resourceDraft, type: e.target.value as 'person' | 'equipment' | 'material' })}
              className="px-3 py-2 border border-gray-200 rounded-lg"
            >
              <option value="person">Person</option>
              <option value="equipment">Equipment</option>
              <option value="material">Material</option>
            </select>
            <select
              value={resourceDraft.scope}
              onChange={(e) =>
                setResourceDraft({
                  ...resourceDraft,
                  scope: e.target.value as 'global' | 'project',
                })
              }
              disabled={!canOrgResources && resourceDraft.scope !== 'project'}
              className="px-3 py-2 border border-gray-200 rounded-lg disabled:opacity-50"
              title="Org-wide resources require administrator role"
            >
              <option value="project">This project</option>
              <option value="global">Organization (global)</option>
            </select>
            <input
              type="number"
              value={resourceDraft.allocated}
              onChange={(e) => setResourceDraft({ ...resourceDraft, allocated: Number(e.target.value) })}
              placeholder="Allocated %"
              className="px-3 py-2 border border-gray-200 rounded-lg"
            />
            <input
              type="number"
              value={resourceDraft.costRate}
              onChange={(e) => setResourceDraft({ ...resourceDraft, costRate: Number(e.target.value) })}
              placeholder="Cost rate per hour"
              className="px-3 py-2 border border-gray-200 rounded-lg"
            />
            <input
              value={resourceDraft.email}
              onChange={(e) => setResourceDraft({ ...resourceDraft, email: e.target.value })}
              placeholder="Email"
              className="px-3 py-2 border border-gray-200 rounded-lg"
            />
            <input
              value={resourceDraft.skills}
              onChange={(e) => setResourceDraft({ ...resourceDraft, skills: e.target.value })}
              placeholder="Skills comma separated"
              className="md:col-span-2 px-3 py-2 border border-gray-200 rounded-lg"
            />
            <button
              onClick={async () => {
                await upsertResource({
                  ...resourceDraft,
                  rateBasis: resourceDraft.rateBasis,
                  scope: resourceDraft.scope,
                  skills: resourceDraft.skills.split(',').map((skill) => skill.trim()).filter(Boolean),
                });
                setResourceDraft({
                  name: '',
                  role: '',
                  type: 'person',
                  allocated: 0,
                  capacity: 100,
                  status: 'available',
                  costRate: 0,
                  rateBasis: 'hour',
                  scope: 'project',
                  skills: '',
                  email: '',
                });
                setShowForm(false);
              }}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg"
            >
              Save Resource Update
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{resources.length}</p>
              <p className="text-sm text-gray-500">Total Resources</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{avgUtilization.toFixed(0)}%</p>
              <p className="text-sm text-gray-500">Avg Utilization</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">PKR {(totalCost / 1000).toFixed(0)}K</p>
              <p className="text-sm text-gray-500">Daily Cost</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-xl">
              <Briefcase className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{allocations.length}</p>
              <p className="text-sm text-gray-500">Active Allocations</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                {(['all', 'people', 'equipment'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab === 'all' ? 'All Resources' : tab === 'people' ? 'People' : 'Equipment'}
                  </button>
                ))}
              </div>
              <div className="flex bg-slate-100 rounded-lg p-1">
                {(['all', 'global', 'project'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setScopeTab(tab)}
                    className={`px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                      scopeTab === tab
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab === 'all' ? 'All scopes' : tab === 'global' ? 'Organization' : 'This project'}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Filter className="w-4 h-4" />
              More Filters
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Resource</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role / Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Utilization</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cost Rate</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Skills</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredResources.map((resource) => (
                <tr key={resource.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {resource.type === 'person' ? (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {resource.name.split(' ').map(n => n[0]).join('')}
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900 flex items-center gap-2 flex-wrap">
                          {resource.name}
                          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                            {resource.scope === 'global' ? 'Org' : 'Project'}
                          </span>
                        </p>
                        {resource.email && <p className="text-xs text-gray-500">{resource.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-900">{resource.role}</span>
                  </td>
                  <td className="px-4 py-4">
                    {canManageResources ? (
                      <select
                        value={resource.status}
                        onChange={(e) =>
                          void upsertResource({
                            ...resource,
                            status: e.target.value as 'available' | 'allocated' | 'on_leave',
                          })
                        }
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(resource.status)}`}
                      >
                        <option value="available">available</option>
                        <option value="allocated">allocated</option>
                        <option value="on_leave">on leave</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(resource.status)}`}>
                        {resource.status.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            resource.allocated >= 90 ? 'bg-red-500' :
                            resource.allocated >= 70 ? 'bg-amber-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${resource.allocated}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{resource.allocated}%</span>
                      {canManageResources && (
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={resource.allocated}
                          onChange={(e) =>
                            void upsertResource({
                              ...resource,
                              allocated: Number(e.target.value),
                            })
                          }
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-900">
                      PKR {resource.costRate.toLocaleString()}/
                      {(resource.rateBasis ?? 'hour') === 'hour' ? 'hr' : resource.rateBasis}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {resource.skills.slice(0, 2).map((skill, index) => (
                        <span key={index} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                          {skill}
                        </span>
                      ))}
                      {resource.skills.length > 2 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                          +{resource.skills.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs text-gray-500">Updated {new Date(resource.updatedAt).toLocaleDateString()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resource Allocations</h3>
        <div className="space-y-4">
          {allocations.map((allocation) => {
            const resource = resources.find(r => r.id === allocation.resourceId);
            return (
              <div key={allocation.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {resource?.name ? resource.name.split(' ').map(n => n[0]).join('') : 'AI'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{resource?.name}</p>
                    <p className="text-xs text-gray-500">{allocation.taskName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Period</p>
                    <p className="text-sm text-gray-900">{allocation.startDate} - {allocation.endDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Allocation</p>
                    <p className="text-sm font-medium text-gray-900">{allocation.allocation}%</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
