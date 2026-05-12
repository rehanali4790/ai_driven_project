import { useProjectData } from "@/context/ProjectDataContext";

interface HeaderProps {
  projectName: string;
  projectLocation?: string;
  onRefresh?: () => void;
}

export default function Header({ projectName, projectLocation }: HeaderProps) {
  const { userName } = useProjectData();

  return (
    <header>
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <p className="text-[15px] sm:text-[16px] text-gray-500 font-bold uppercase tracking-wider shrink-0">
            Delivery Workspace •{" "}
            <span className="text-[#12b3a8]">{projectLocation || "Global Operations"}</span>
          </p>
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0f3433] text-[11px] font-bold text-white shadow-sm cursor-default"
              title={userName}
            >
              {(userName || "US")
                .split(" ")
                .filter(Boolean)
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
