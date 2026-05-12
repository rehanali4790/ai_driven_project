import { FormEvent, useMemo, useState } from "react";
import { Boxes, PackagePlus, Handshake, Search } from "lucide-react";
import { useProjectData } from "@/context/ProjectDataContext";

export default function InventoryManagement() {
  const { state, upsertInventory, allocateInventory, userRole } = useProjectData();
  const canEdit = userRole !== "viewer";

  const inventories = state?.inventories ?? [];
  const inventoryAllocations = state?.inventoryAllocations ?? [];
  const resources = (state?.resources ?? []).filter((resource) => resource.type === "person");
  const tasks = state?.tasks ?? [];
  const unitOptions = state?.inventoryUnits ?? ["unit", "kg", "litre", "meter", "box"];

  const [inventoryDraft, setInventoryDraft] = useState({
    name: "",
    category: "equipment" as "equipment" | "material",
    quantity: 0,
    singleUnitPrice: "",
    bulkPrice: "",
    unit: "unit",
  });
  const [allocationDraft, setAllocationDraft] = useState({
    inventoryId: "",
    resourceId: "",
    taskId: "",
    quantity: 1,
  });
  const [resourceSearch, setResourceSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const selectedInventory = useMemo(
    () => inventories.find((item) => item.id === allocationDraft.inventoryId),
    [inventories, allocationDraft.inventoryId],
  );

  const filteredResources = useMemo(() => {
    if (!resourceSearch.trim()) return resources;
    const query = resourceSearch.toLowerCase();
    return resources.filter(
      (item) => item.name.toLowerCase().includes(query) || item.role.toLowerCase().includes(query),
    );
  }, [resources, resourceSearch]);

  const inventoryNameById = useMemo(
    () => new Map(inventories.map((item) => [item.id, item.name])),
    [inventories],
  );
  const resourceNameById = useMemo(
    () => new Map(resources.map((item) => [item.id, item.name])),
    [resources],
  );
  const taskNameById = useMemo(() => new Map(tasks.map((item) => [item.id, item.name])), [tasks]);

  const unitChoices = useMemo(() => {
    const s = new Set(unitOptions);
    const cur = inventoryDraft.unit.trim();
    if (cur) s.add(cur);
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [unitOptions, inventoryDraft.unit]);

  const saveInventory = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;
    const quantity = Math.max(0, Number(inventoryDraft.quantity || 0));
    const singleUnitPrice =
      inventoryDraft.singleUnitPrice.trim() === "" ? undefined : Math.max(0, Number(inventoryDraft.singleUnitPrice));
    const bulkPrice =
      inventoryDraft.bulkPrice.trim() === "" ? undefined : Math.max(0, Number(inventoryDraft.bulkPrice));
    if (!inventoryDraft.name.trim() || !inventoryDraft.unit.trim() || quantity <= 0) {
      setMessage("Inventory name, quantity and unit are required.");
      return;
    }
    if (singleUnitPrice === undefined && bulkPrice === undefined) {
      setMessage("Single unit price ya bulk price me se kam az kam aik required hai.");
      return;
    }
    await upsertInventory({
      name: inventoryDraft.name.trim(),
      category: inventoryDraft.category,
      quantity,
      singleUnitPrice,
      bulkPrice,
      unit: inventoryDraft.unit.trim(),
    });
    setInventoryDraft({
      name: "",
      category: inventoryDraft.category,
      quantity: 0,
      singleUnitPrice: "",
      bulkPrice: "",
      unit: inventoryDraft.unit.trim() || "unit",
    });
    setMessage("Inventory saved successfully.");
  };

  const saveAllocation = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;
    if (!allocationDraft.inventoryId || !allocationDraft.resourceId || !allocationDraft.taskId) {
      setMessage("Inventory, human resource aur task select karna zaroori hai.");
      return;
    }
    if (allocationDraft.quantity <= 0) {
      setMessage("Allocation quantity valid honi chahiye.");
      return;
    }
    await allocateInventory({
      inventoryId: allocationDraft.inventoryId,
      resourceId: allocationDraft.resourceId,
      taskId: allocationDraft.taskId,
      quantity: Math.max(1, Number(allocationDraft.quantity || 1)),
    });
    setAllocationDraft({
      inventoryId: "",
      resourceId: "",
      taskId: "",
      quantity: 1,
    });
    setResourceSearch("");
    setMessage("Inventory allocated successfully. WBS details me reflect ho jayega.");
  };

  if (!state) return null;

  return (
    <div className="page-typography space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h1 className="text-2xl font-bold text-[#0f3433]">Inventory Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Add inventory stock, manage units, and allocate inventory to human resources against tasks.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <form onSubmit={saveInventory} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="text-md font-bold uppercase tracking-widest text-[#0f3433] flex items-center gap-2">
            <PackagePlus className="w-4 h-4 text-[#12b3a8]" />
            Add Inventory
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-extrabold uppercase tracking-widest text-gray-400">Inventory Name</label>
              <input
                value={inventoryDraft.name}
                onChange={(e) => setInventoryDraft((prev) => ({ ...prev, name: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm"
                placeholder="e.g. Camera"
              />
            </div>
            <div>
              <label className="text-[12px] font-extrabold uppercase tracking-widest text-gray-400">Category</label>
              <select
                value={inventoryDraft.category}
                onChange={(e) =>
                  setInventoryDraft((prev) => ({
                    ...prev,
                    category: e.target.value as "equipment" | "material",
                  }))
                }
                className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm"
              >
                <option value="equipment">Asset / Equipment</option>
                <option value="material">Material Supply</option>
              </select>
            </div>
            <div>
              <label className="text-[12px] font-extrabold uppercase tracking-widest text-gray-400">Quantity</label>
              <input
                type="number"
                min={1}
                value={inventoryDraft.quantity}
                onChange={(e) => setInventoryDraft((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm"
              />
            </div>
            <div>
              <label className="text-[12px] font-extrabold uppercase tracking-widest text-gray-400">Single Unit Price</label>
              <input
                type="number"
                min={0}
                value={inventoryDraft.singleUnitPrice}
                onChange={(e) => setInventoryDraft((prev) => ({ ...prev, singleUnitPrice: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="text-[12px] font-extrabold uppercase tracking-widest text-gray-400">Bulk Price</label>
              <input
                type="number"
                min={0}
                value={inventoryDraft.bulkPrice}
                onChange={(e) => setInventoryDraft((prev) => ({ ...prev, bulkPrice: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm"
                placeholder="Optional"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[12px] font-extrabold uppercase tracking-widest text-gray-400">Unit</label>
              <select
                value={
                  unitChoices.find((u) => u.toLowerCase() === inventoryDraft.unit.trim().toLowerCase()) ??
                  unitChoices[0] ??
                  "unit"
                }
                onChange={(e) => setInventoryDraft((prev) => ({ ...prev, unit: e.target.value }))}
                className="mt-1 w-full gap-1 max-w-md px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm"
              >
                {unitChoices.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-[13px] text-gray-500 leading-relaxed">
                Add or remove units globally from sidebar: <strong className="text-[#0f3433]">Measurement Units</strong>.
              </p>
            </div>
          </div>
          <button
            type="submit"
            disabled={!canEdit}
            className="w-full bg-[#0f3433] hover:bg-black text-white font-bold text-xs uppercase tracking-widest rounded-xl py-3 transition-all disabled:opacity-50"
          >
            Save Inventory
          </button>
        </form>

        <form onSubmit={saveAllocation} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="text-md font-bold uppercase tracking-widest text-[#0f3433] flex items-center gap-2">
            <Handshake className="w-4 h-4 text-[#12b3a8]" />
            Allocate Inventory
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-[12px] font-extrabold uppercase tracking-widest text-gray-400">Inventory</label>
              <select
                value={allocationDraft.inventoryId}
                onChange={(e) => setAllocationDraft((prev) => ({ ...prev, inventoryId: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm"
              >
                <option value="">Select inventory</option>
                {inventories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Available Qty: {selectedInventory ? `${selectedInventory.quantity} ${selectedInventory.unit}` : "N/A"}
              </p>
            </div>
            <div>
              <label className="text-[12px] font-extrabold uppercase tracking-widest text-gray-400">Human Resource</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={resourceSearch}
                  onChange={(e) => setResourceSearch(e.target.value)}
                  placeholder="Search human resource..."
                  className="w-full pl-10 pr-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm"
                />
              </div>
              <select
                value={allocationDraft.resourceId}
                onChange={(e) => setAllocationDraft((prev) => ({ ...prev, resourceId: e.target.value }))}
                className="mt-2 w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm"
              >
                <option value="">Select human resource</option>
                {filteredResources.map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.name} ({resource.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[12px] font-extrabold uppercase tracking-widest text-gray-400">Task</label>
              <select
                value={allocationDraft.taskId}
                onChange={(e) => setAllocationDraft((prev) => ({ ...prev, taskId: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm"
              >
                <option value="">Select task</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[12px] font-extrabold uppercase tracking-widest text-gray-400">Allocation Quantity</label>
              <input
                type="number"
                min={1}
                value={allocationDraft.quantity}
                onChange={(e) => setAllocationDraft((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={!canEdit}
            className="w-full bg-[#12b3a8] hover:bg-[#0e9188] text-white font-bold text-xs uppercase tracking-widest rounded-xl py-3 transition-all disabled:opacity-50"
          >
            Save Allocation
          </button>
        </form>
      </div>

      {message && (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#0f3433]">{message}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Boxes className="w-4 h-4 text-[#12b3a8]" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#0f3433]">Inventory List</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/70">
              <tr>
                <th className="px-4 py-3 text-sm font-extrabold text-gray-950 uppercase tracking-widest">Inventory</th>
                <th className="px-4 py-3 text-sm font-extrabold text-gray-950 uppercase tracking-widest">Category</th>
                <th className="px-4 py-3 text-sm font-extrabold text-gray-950 uppercase tracking-widest">Available Qty</th>
                <th className="px-4 py-3 text-sm font-extrabold text-gray-950 uppercase tracking-widest">Single Price</th>
                <th className="px-4 py-3 text-sm font-extrabold text-gray-950 uppercase tracking-widest">Bulk Price</th>
                <th className="px-4 py-3 text-sm font-extrabold text-gray-950 uppercase tracking-widest">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {inventories.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm font-semibold text-[#0f3433]">{item.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {item.category === "equipment" ? "Asset / Equipment" : "Material Supply"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">PKR {Math.round(item.singleUnitPrice ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">PKR {Math.round(item.bulkPrice ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.unit}</td>
                </tr>
              ))}
              {!inventories.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-md text-gray-500">
                    No inventory items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#0f3433]">Inventory Allocation Log</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/70">
              <tr>
                <th className="px-4 py-3 text-sm font-extrabold text-gray-950 uppercase tracking-widest">Inventory</th>
                <th className="px-4 py-3 text-sm font-extrabold text-gray-950 uppercase tracking-widest">Human Resource</th>
                <th className="px-4 py-3 text-sm font-extrabold text-gray-950 uppercase tracking-widest">Task</th>
                <th className="px-4 py-3 text-sm font-extrabold text-gray-950 uppercase tracking-widest">Qty</th>
                <th className="px-4 py-3 text-sm font-extrabold text-gray-950 uppercase tracking-widest">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {inventoryAllocations.map((allocation) => (
                <tr key={allocation.id}>
                  <td className="px-4 py-3 text-sm text-gray-700">{inventoryNameById.get(allocation.inventoryId) || "Unknown"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{resourceNameById.get(allocation.resourceId) || "Unknown"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{taskNameById.get(allocation.taskId) || "Unknown"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{allocation.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{new Date(allocation.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {!inventoryAllocations.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-md text-gray-500">
                    No inventory allocations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
