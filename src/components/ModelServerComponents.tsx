import { ModelProperties } from "~/components/ModelProperties";
import { ServerInfoComponent } from "~/components/ServerInfo";

// Tab Navigation Component
interface TabNavigationProps {
  activeTab: "model" | "server";
  setActiveTab: (tab: "model" | "server") => void;
}

export function TabNavigation({
  activeTab,
  setActiveTab,
}: TabNavigationProps) {
  return (
    <div className="border-b border-zinc-800 flex">
      <button
        type="button"
        className={`flex-1 py-3 px-4 text-sm font-medium text-center ${
          activeTab === "model"
            ? "text-zinc-300 border-b-2 border-zinc-500"
            : "text-zinc-500 hover:text-zinc-300"
        }`}
        onClick={() => setActiveTab("model")}
      >
        Model
      </button>
      <button
        type="button"
        className={`flex-1 py-3 px-4 text-sm font-medium text-center ${
          activeTab === "server"
            ? "text-zinc-300 border-b-2 border-zinc-500"
            : "text-zinc-500 hover:text-zinc-300"
        }`}
        onClick={() => setActiveTab("server")}
      >
        Server
      </button>
    </div>
  );
}

// Tab Content Component
interface TabContentProps {
  activeTab: "model" | "server";
}

export function TabContent({ activeTab }: TabContentProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      {activeTab === "model" ? (
        <div className="p-4">
          <ModelProperties />
        </div>
      ) : (
        <ServerInfoComponent />
      )}
    </div>
  );
}