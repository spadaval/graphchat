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
    <div className="border-b border-gray-800 flex">
      <button
        type="button"
        className={`flex-1 py-3 px-4 text-sm font-medium text-center ${
          activeTab === "model"
            ? "text-blue-400 border-b-2 border-blue-500"
            : "text-gray-400 hover:text-gray-200"
        }`}
        onClick={() => setActiveTab("model")}
      >
        Model
      </button>
      <button
        type="button"
        className={`flex-1 py-3 px-4 text-sm font-medium text-center ${
          activeTab === "server"
            ? "text-blue-400 border-b-2 border-blue-500"
            : "text-gray-400 hover:text-gray-200"
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