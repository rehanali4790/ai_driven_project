import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Briefcase,
  TrendingUp,
  DollarSign,
  Download,
  Target,
  ArrowRight,
  ChevronDown
} from 'lucide-react';
import { useProjectData } from '@/context/ProjectDataContext';

type ResourceViewMode = 'human' | 'equipment' | 'material';

interface ResourceManagementProps {
  resourceView?: ResourceViewMode;
}

const resourceTypeByView: Record<ResourceViewMode, 'person' | 'equipment' | 'material'> = {
  human: 'person',
  equipment: 'equipment',
  material: 'material',
};

const viewHeading: Record<ResourceViewMode, { title: string; subtitle: string }> = {
  human: {
    title: 'Human Resource Management',
    subtitle: 'Manage project workforce, skills, and assignment capacity',
  },
  equipment: {
    title: 'Asset / Equipment Management',
    subtitle: 'Track equipment inventory, utilization, and deployment readiness',
  },
  material: {
    title: 'Material Supply Management',
    subtitle: 'Control material quantities, suppliers, and replenishment planning',
  },
};

/** Empty is allowed (optional contact). Non-empty must look like a real address. */
function contactEmailIssue(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  if (t.length > 254) return 'Email is too long.';
  const ok = /^[^\s@]{1,64}@[^\s@]{1,251}$/.test(t) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
  if (!ok) return 'Enter a valid email (e.g. name@company.com).';
  return '';
}

function createResourceDraft(type: 'person' | 'equipment' | 'material') {
  return {
    name: '',
    role: '',
    type,
    allocated: 0,
    capacity: 100,
    status: 'available' as 'available' | 'allocated' | 'on_leave',
    costRate: 0,
    rateBasis: 'hour' as const,
    scope: 'project' as 'global' | 'project',
    skills: type === 'material' ? 'unit' : '',
    email: '',
  };
}

export default function ResourceManagement({ resourceView = 'human' }: ResourceManagementProps) {
  const { state, upsertResource, userRole } = useProjectData();
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeTab, setScopeTab] = useState<'all' | 'global' | 'project'>('all');
  const forcedType = resourceTypeByView[resourceView];
  const [activeTab, setActiveTab] = useState<'all' | 'people' | 'equipment'>(() =>
    forcedType === 'person' ? 'people' : forcedType === 'equipment' ? 'equipment' : 'all',
  );
  const [showForm, setShowForm] = useState(false);
  const [resourceDraft, setResourceDraft] = useState(() => createResourceDraft(forcedType));
  const [contactEmailError, setContactEmailError] = useState('');

  const resources = state?.resources ?? [];
  const canManageResources = userRole === "admin" || userRole === "manager";
  const canOrgResources = userRole === "admin";
  const allocations = state?.allocations ?? [];
  const heading = viewHeading[resourceView];

  useEffect(() => {
    setResourceDraft(createResourceDraft(forcedType));
    setScopeTab('all');
    setActiveTab(forcedType === 'person' ? 'people' : forcedType === 'equipment' ? 'equipment' : 'all');
    setContactEmailError('');
  }, [forcedType]);

  useEffect(() => {
    if (!showForm) setContactEmailError('');
  }, [showForm]);

  const filteredResources = resources.filter((resource) => {
    const matchesSearch = resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesViewType = resource.type === forcedType;
    const matchesTab = activeTab === 'all' ||
      (activeTab === 'people' && resource.type === 'person') ||
      (activeTab === 'equipment' && resource.type === 'equipment');
    const matchesScope =
      scopeTab === 'all' ||
      (scopeTab === 'global' && resource.scope === 'global') ||
      (scopeTab === 'project' && resource.scope === 'project');
    return matchesSearch && matchesViewType && matchesTab && matchesScope;
  });

  const allocationCountByResource = useMemo(() => {
    const map = new Map<string, number>();
    allocations.forEach((allocation) => {
      map.set(allocation.resourceId, (map.get(allocation.resourceId) ?? 0) + 1);
    });
    return map;
  }, [allocations]);

  const baseInventoryUnits = useMemo(
    () => (state?.inventoryUnits?.length ? state.inventoryUnits : ["unit", "kg", "litre", "meter", "box"]),
    [state?.inventoryUnits],
  );

  const materialUomChoices = useMemo(() => {
    const raw = resourceDraft.skills.split(",")[0]?.trim() ?? "";
    const s = new Set(baseInventoryUnits);
    if (raw) s.add(raw);
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [baseInventoryUnits, resourceDraft.skills]);

  const materialUomValue = useMemo(() => {
    const raw = resourceDraft.skills.split(",")[0]?.trim() ?? "";
    const hit = materialUomChoices.find((u) => raw && u.toLowerCase() === raw.toLowerCase());
    return hit ?? materialUomChoices[0] ?? "unit";
  }, [resourceDraft.skills, materialUomChoices]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-[#f0f9f8] text-[#12b3a8]';
      case 'allocated': return 'bg-blue-50 text-blue-600';
      case 'on_leave': return 'bg-amber-50 text-amber-600';
      default: return 'bg-gray-50 text-gray-500';
    }
  };

  const totalCost = filteredResources.reduce((sum, r) => sum + (r.costRate * r.allocated / 100), 0);
  const avgUtilization = filteredResources.length
    ? filteredResources.reduce((sum, r) => sum + r.allocated, 0) / filteredResources.length
    : 0;

  if (!state) return null;

  return (
    <div className="page-typography space-y-8 p-1">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#0f3433] tracking-tight">{heading.title}</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">{heading.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-2.5 bg-[#12b3a8] text-white text-xs font-bold uppercase tracking-[1.5px] rounded-xl hover:bg-[#0e9188] transition-all shadow-sm flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Close Editor' : 'Register Resource'}
          </button>
        </div>
      </div>

      {/* Admin Form - Reference Style */}
      {showForm && (
        <div className="bg-white rounded-[24px] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 p-8">
          <h3 className="text-sm font-bold text-[#0f3433] uppercase tracking-widest mb-6 flex items-center gap-2">
            <Target className="w-4 h-4 text-[#12b3a8]" />
            {resourceView === 'human'
              ? 'Human Resource Form'
              : resourceView === 'equipment'
                ? 'Asset / Equipment Form'
                : 'Material Supply Form'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Entity Name</label>
               <input
                value={resourceDraft.name}
                onChange={(e) => setResourceDraft({ ...resourceDraft, name: e.target.value })}
                placeholder={
                  resourceDraft.type === 'person' ? 'Full name / ID' :
                  resourceDraft.type === 'equipment' ? 'Asset name / ID' :
                  'Material name / ID'
                }
                className="bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">
                 {resourceDraft.type === 'person' ? 'Designation' :
                  resourceDraft.type === 'equipment' ? 'Category' :
                  'Material Type'}
               </label>
               <input
                value={resourceDraft.role}
                onChange={(e) => setResourceDraft({ ...resourceDraft, role: e.target.value })}
                placeholder={
                  resourceDraft.type === 'person' ? 'Role / Position' :
                  resourceDraft.type === 'equipment' ? 'Equipment Category' :
                  'Material Category'
                }
                className="bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Type</label>
               <div className="relative">
                 <select
                  value={resourceDraft.type}
                  disabled
                  onChange={() => undefined}
                  className="bg-gray-50 border-none rounded-xl px-3 py-2.5 pr-10 text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none appearance-none w-full disabled:opacity-70"
                >
                  <option value="person">Human Resource</option>
                  <option value="equipment">Asset / Equipment</option>
                  <option value="material">Material Supply</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
               </div>
            </div>
            <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Deployment Scope</label>
               <div className="relative">
                 <select
                  value={resourceDraft.scope}
                  onChange={(e) => setResourceDraft({ ...resourceDraft, scope: e.target.value as 'global' | 'project' })}
                  disabled={!canOrgResources && resourceDraft.scope !== 'project'}
                  className="bg-gray-50 border-none rounded-xl px-3 py-2.5 pr-10 text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none disabled:opacity-50 appearance-none w-full"
                >
                  <option value="project">Project Bound</option>
                  <option value="global">Organization Wide</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
               </div>
            </div>
            
            {/* Human Resource Fields */}
            {resourceDraft.type === 'person' && (
              <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-5 mt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Allocation %</label>
                  <input 
                    type="number" 
                    value={resourceDraft.allocated} 
                    onChange={(e) => setResourceDraft({...resourceDraft, allocated: Number(e.target.value)})} 
                    placeholder="0" 
                    min="0"
                    max="100"
                    className="bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Hourly Rate (PKR)</label>
                  <input 
                    type="number" 
                    value={resourceDraft.costRate} 
                    onChange={(e) => setResourceDraft({...resourceDraft, costRate: Number(e.target.value)})} 
                    placeholder="0" 
                    min="0"
                    className="bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="hr-contact-email" className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">
                    Contact Email
                  </label>
                  <input
                    id="hr-contact-email"
                    value={resourceDraft.email}
                    onChange={(e) => {
                      setResourceDraft({ ...resourceDraft, email: e.target.value });
                      setContactEmailError('');
                    }}
                    onBlur={(e) => setContactEmailError(contactEmailIssue(e.target.value))}
                    placeholder="email@example.com"
                    type="email"
                    autoComplete="email"
                    aria-invalid={!!contactEmailError}
                    className={`bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium text-[#0f3433] focus:bg-white transition-all outline-none ${
                      contactEmailError
                        ? 'ring-2 ring-red-400 focus:ring-red-400'
                        : 'focus:ring-2 focus:ring-[#12b3a8]/20'
                    }`}
                  />
                  {contactEmailError ? (
                    <p className="text-xs font-medium text-red-600 ml-1" role="alert">
                      {contactEmailError}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Skills (comma separated)</label>
                  <input 
                    value={resourceDraft.skills} 
                    onChange={(e) => setResourceDraft({...resourceDraft, skills: e.target.value})} 
                    placeholder="e.g., Project Management, Planning" 
                    className="bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none" 
                  />
                </div>
              </div>
            )}

            {/* Equipment/Asset Fields */}
            {resourceDraft.type === 'equipment' && (
              <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-5 mt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Quantity Available</label>
                  <input 
                    type="number" 
                    value={resourceDraft.capacity} 
                    onChange={(e) => setResourceDraft({...resourceDraft, capacity: Number(e.target.value)})} 
                    placeholder="0" 
                    min="0"
                    className="bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Utilization %</label>
                  <input 
                    type="number" 
                    value={resourceDraft.allocated} 
                    onChange={(e) => setResourceDraft({...resourceDraft, allocated: Number(e.target.value)})} 
                    placeholder="0" 
                    min="0"
                    max="100"
                    className="bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Rental Rate (PKR/Hour)</label>
                  <input 
                    type="number" 
                    value={resourceDraft.costRate} 
                    onChange={(e) => setResourceDraft({...resourceDraft, costRate: Number(e.target.value)})} 
                    placeholder="0" 
                    min="0"
                    className="bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Location/Storage</label>
                  <input 
                    value={resourceDraft.email} 
                    onChange={(e) => setResourceDraft({...resourceDraft, email: e.target.value})} 
                    placeholder="Location or storage info" 
                    className="bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none" 
                  />
                </div>
              </div>
            )}

            {/* Material Supply Fields */}
            {resourceDraft.type === 'material' && (
              <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-5 mt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Quantity Available</label>
                  <input 
                    type="number" 
                    value={resourceDraft.capacity} 
                    onChange={(e) => setResourceDraft({...resourceDraft, capacity: Number(e.target.value)})} 
                    placeholder="0" 
                    min="0"
                    className="bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Unit Cost (PKR)</label>
                  <input 
                    type="number" 
                    value={resourceDraft.costRate} 
                    onChange={(e) => setResourceDraft({...resourceDraft, costRate: Number(e.target.value)})} 
                    placeholder="0" 
                    min="0"
                    className="bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">
                    Unit of Measure
                  </label>
                  <div className="relative">
                    <select
                      value={materialUomValue}
                      onChange={(e) => setResourceDraft({ ...resourceDraft, skills: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 pr-10 text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none appearance-none"
                    >
                      {materialUomChoices.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-gray-400 ml-1">
                    Edit the master list under <strong className="text-[#0f3433]">Measurement Units</strong>.
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Supplier/Vendor</label>
                  <input 
                    value={resourceDraft.email} 
                    onChange={(e) => setResourceDraft({...resourceDraft, email: e.target.value})} 
                    placeholder="Supplier name or contact" 
                    className="bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none" 
                  />
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="lg:col-span-4 mt-2">
              <button
                onClick={async () => {
                  if (resourceDraft.type === 'person') {
                    const err = contactEmailIssue(resourceDraft.email);
                    if (err) {
                      setContactEmailError(err);
                      return;
                    }
                  }
                  await upsertResource({
                    ...resourceDraft,
                    email: resourceDraft.email.trim(),
                    skills: resourceDraft.skills.split(',').map((skill) => skill.trim()).filter(Boolean),
                  });
                  setResourceDraft(createResourceDraft(forcedType));
                  setContactEmailError('');
                  setShowForm(false);
                }}
                className="w-full bg-[#0f3433] hover:bg-black text-white font-bold text-xs uppercase tracking-widest rounded-xl py-3 transition-all active:scale-95 shadow-lg"
              >
                Save Resource
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snapshot Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Network Size', val: filteredResources.length, icon: Users, color: 'text-[#12b3a8]' },
          { label: 'Load Factor', val: `${avgUtilization.toFixed(0)}%`, icon: TrendingUp, color: 'text-emerald-500' },
          { label: 'Burn Rate', val: `PKR ${(totalCost / 1000).toFixed(0)}K`, icon: DollarSign, color: 'text-[#0f3433]' },
          { label: 'Assignments', val: allocations.length, icon: Briefcase, color: 'text-amber-500' }
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)]">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                   <p className="text-2xl font-bold text-[#0f3433] leading-none mb-1">{stat.val}</p>
                   <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* Resource Table Explorer */}
      <div className="bg-white rounded-[24px] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-50 flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-3">
             <div className="flex items-center gap-2 px-4 py-2 bg-[#f0f9f8] rounded-xl border border-[#b9ece8]">
               <span className="w-2 h-2 rounded-full bg-[#12b3a8]" />
               <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0f3433]">
                 {resourceView === 'human'
                   ? 'Human Resource Records'
                   : resourceView === 'equipment'
                     ? 'Asset / Equipment Records'
                     : 'Material Supply Records'}
               </span>
             </div>
             
             <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                {(['all', 'global', 'project'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setScopeTab(tab)}
                    className={`px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-widest rounded-lg transition-all ${
                      scopeTab === tab ? 'bg-white text-[#0f3433] shadow-sm' : 'text-gray-400'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
             </div>
          </div>

          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative group w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#12b3a8]" />
              <input
                type="text"
                placeholder="Find entity..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl w-full text-sm font-medium focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none"
              />
            </div>
            <button className="p-2.5 bg-gray-50 rounded-xl text-gray-400 hover:text-[#0f3433] transition-colors">
               <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Entity Identification</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Classification</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Sync Status</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Load Pattern</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Capacity</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Active Tasks</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Cost Basis</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Contact/Location</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest text-right">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredResources.map((resource) => (
                <tr key={resource.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {resource.type === 'person' ? (
                        <div className="w-10 h-10 bg-[#0f3433] rounded-xl flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
                          {resource.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-[#f0f9f8] rounded-xl flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-[#12b3a8]" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                           <p className="text-sm font-bold text-[#0f3433] truncate">{resource.name}</p>
                           <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-400 tracking-tighter">
                            {resource.scope}
                           </span>
                        </div>
                        <p className="text-[11px] text-gray-400 font-medium truncate">ID: {resource.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[13px] font-bold text-[#0f3433]">{resource.role}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest rounded-lg ${
                      resource.type === 'person' ? 'bg-blue-50 text-blue-600' :
                      resource.type === 'equipment' ? 'bg-purple-50 text-purple-600' :
                      'bg-orange-50 text-orange-600'
                    }`}>
                      {resource.type === 'person' ? 'Human' : resource.type === 'equipment' ? 'Asset' : 'Material'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {canManageResources ? (
                      <select
                        value={resource.status}
                        onChange={(e) => void upsertResource({ ...resource, status: e.target.value as any })}
                        className={`px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest rounded-lg border-none focus:ring-0 cursor-pointer appearance-none ${getStatusColor(resource.status)}`}
                      >
                        <option value="available">Available</option>
                        <option value="allocated">Allocated</option>
                        <option value="on_leave">Maintenance</option>
                      </select>
                    ) : (
                      <span className={`px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest rounded-lg ${getStatusColor(resource.status)}`}>
                        {resource.status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 max-w-[80px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            (resource.allocated ?? 0) >= 90 ? 'bg-red-400' :
                            (resource.allocated ?? 0) >= 70 ? 'bg-amber-400' : 'bg-[#12b3a8]'
                          }`}
                          style={{ width: `${resource.allocated ?? 0}%` }}
                        />
                      </div>
                      <span className="text-[12px] font-black text-[#0f3433]">{resource.allocated ?? 0}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[13px] font-bold text-[#0f3433]">{resource.capacity ?? 0}</span>
                    <span className="text-[10px] text-gray-400 ml-1">
                      {resource.type === 'person' ? 'hrs/wk' : resource.type === 'equipment' ? 'units' : 'qty'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[13px] font-bold text-[#0f3433]">{allocationCountByResource.get(resource.id) ?? 0}</span>
                    <span className="text-[10px] text-gray-400 ml-1">assigned</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[13px] font-bold text-[#0f3433]">
                      PKR {(resource.costRate ?? 0).toLocaleString()}
                    </span>
                    <p className="text-[10px] text-gray-400">
                      {resource.type === 'person' ? '/HR' : resource.type === 'equipment' ? '/HR' : '/UNIT'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[11px] text-gray-600 font-medium truncate max-w-[150px]">
                      {resource.email || 'N/A'}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-[10px] font-bold text-gray-300 uppercase">
                      SYNC {resource.updatedAt ? new Date(resource.updatedAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Allocation Log - Reference Style */}
      
    </div>
  );
}