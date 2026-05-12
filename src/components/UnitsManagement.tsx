import { FormEvent, useState } from "react";
import { Plus, Ruler, Trash2 } from "lucide-react";
import { useProjectData } from "@/context/ProjectDataContext";

export default function UnitsManagement() {
  const { state, error: ctxError, addInventoryUnit, removeInventoryUnit, userRole } = useProjectData();
  const [newUnit, setNewUnit] = useState("");
  const [localOk, setLocalOk] = useState<string | null>(null);
  const canEdit = userRole !== "viewer";
  const units = state?.inventoryUnits?.length
    ? [...state.inventoryUnits].sort((a, b) => a.localeCompare(b))
    : ["unit", "kg", "litre", "meter", "box"];

  const onAdd = async (e: FormEvent) => {
    e.preventDefault();
    setLocalOk(null);
    if (!canEdit) return;
    const u = newUnit.trim();
    if (!u) return;
    try {
      await addInventoryUnit(u);
      setNewUnit("");
      setLocalOk(`“${u}” added. Dropdowns across inventory and material forms will list it.`);
    } catch {
      /* error shown via ProjectDataContext */
    }
  };

  const onRemove = async (unit: string) => {
    setLocalOk(null);
    if (!canEdit) return;
    if (
      !window.confirm(
        `Remove unit “${unit}”? It must not be used on any inventory line. This cannot be undone from here.`,
      )
    ) {
      return;
    }
    try {
      await removeInventoryUnit(unit);
      setLocalOk(`“${unit}” removed from the master list.`);
    } catch {
      /* error shown via ProjectDataContext */
    }
  };

  if (!state) return null;

  return (
    <div className="page-typography space-y-6 p-1">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)]">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-[#f0f9f8]">
            <Ruler className="w-6 h-6 text-[#12b3a8]" />
          </div>
          <div>
            <h1 className="text-[26px] font-bold text-[#0f3433] tracking-tight">Measurement Units</h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl leading-relaxed">
              Add or remove units once; they appear everywhere you pick a unit —{" "}
              <span className="font-semibold text-[#0f3433]">Inventory</span> and{" "}
              <span className="font-semibold text-[#0f3433]">Material Supply</span> registration.
            </p>
          </div>
        </div>
      </div>

      {ctxError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{ctxError}</div>
      )}
      {localOk && !ctxError && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {localOk}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={onAdd}
          className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)]"
        >
          <h2 className="text-md font-bold uppercase tracking-widest text-[#0f3433] flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#12b3a8]" />
            Add unit
          </h2>
          <div>
            <label className="text-[12px] font-extrabold uppercase tracking-widest text-gray-400 ml-0.5">
              Unit label
            </label>
            <input
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              disabled={!canEdit}
              placeholder="e.g. m³, tonne, pallet"
              className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-gray-50 border-none text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white outline-none disabled:opacity-50"
              maxLength={48}
            />
            <p className="text-[13px] text-gray-400 mt-2">Duplicates are ignored (case-insensitive).</p>
          </div>
          <button
            type="submit"
            disabled={!canEdit || !newUnit.trim()}
            className="w-full py-3 rounded-xl bg-[#12b3a8] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#0e9188] transition-colors disabled:opacity-40"
          >
            Save unit
          </button>
        </form>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)]">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#0f3433] mb-4">Current units</h2>
          <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {units.map((unit) => (
              <li
                key={unit}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3"
              >
                <span className="text-sm font-semibold text-[#0f3433] font-mono">{unit}</span>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => void onRemove(unit)}
                  className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-30"
                  title="Remove unit"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
