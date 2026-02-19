import { use$ } from "@legendapp/state/react";
import {
  AlertCircle,
  Binary,
  Brain,
  CheckCircle2,
  Loader2,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { ModelProperties } from "~/components/ModelProperties";
import { ServerInfoComponent } from "~/components/ServerInfo";
import { SettingsModal } from "~/components/SettingsModal";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { ActiveTab } from "~/lib/state/types";
import {
  setHuggingfaceToken,
  setTokenizerModelId,
  uiPreferences$,
} from "~/lib/state/ui";
import { testTokenizerMetadata } from "~/lib/tokenizer";

// Tab Navigation Component
interface TabNavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export function TabNavigation({ activeTab, setActiveTab }: TabNavigationProps) {
  return (
    <div className="border-b border-zinc-800 flex">
      <button
        type="button"
        className={`flex-1 py-3 px-4 text-sm font-medium text-center ${
          activeTab === "settings"
            ? "text-zinc-300 border-b-2 border-zinc-500"
            : "text-zinc-500 hover:text-zinc-300"
        }`}
        onClick={() => setActiveTab("settings")}
      >
        Settings
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

// Settings Panel Component
function SettingsPanelContent() {
  const [showModal, setShowModal] = useState(false);
  const [testStatus, setTestStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
  }>({ loading: false });
  const uiPrefs = use$(uiPreferences$);

  const handleTestTokenizer = async () => {
    if (!uiPrefs.tokenizerModelId || testStatus.loading) return;

    setTestStatus({ loading: true });
    const result = await testTokenizerMetadata(uiPrefs.tokenizerModelId);
    setTestStatus({
      loading: false,
      success: result.success,
      message: result.message,
    });

    // Clear message after 3 seconds on success
    if (result.success) {
      setTimeout(
        () =>
          setTestStatus((prev) => ({
            ...prev,
            success: undefined,
            message: undefined,
          })),
        3000,
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-900">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 mb-4 flex items-center gap-2">
              <Brain size={16} className="text-purple-400" />
              Model Samplers
            </h3>
            <div className="bg-zinc-800/30 p-1 rounded-lg">
              <ModelProperties />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-100 mb-4 flex items-center gap-2">
              <Binary size={16} className="text-blue-400" />
              Tokenizer settings
            </h3>
            <div className="bg-zinc-800/30 p-4 rounded-lg space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="tokenizer-model"
                  className="text-xs text-zinc-400"
                >
                  HuggingFace Model ID
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="tokenizer-model"
                    value={uiPrefs.tokenizerModelId}
                    onChange={(e) => {
                      setTokenizerModelId(e.target.value);
                      if (
                        testStatus.success !== undefined ||
                        testStatus.message
                      ) {
                        setTestStatus({ loading: false });
                      }
                    }}
                    placeholder="e.g. HuggingFaceTB/SmolLM3-3B"
                    className="bg-zinc-900/50 border-zinc-700 text-sm h-8"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTestTokenizer}
                    disabled={testStatus.loading || !uiPrefs.tokenizerModelId}
                    className="h-8 px-3 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800"
                  >
                    {testStatus.loading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : testStatus.success ? (
                      <CheckCircle2 size={14} className="text-green-500" />
                    ) : (
                      "Test"
                    )}
                  </Button>
                </div>
                {testStatus.message && (
                  <p
                    className={`text-[10px] flex items-center gap-1 ${testStatus.success ? "text-green-400" : "text-red-400"}`}
                  >
                    {!testStatus.success && <AlertCircle size={10} />}
                    {testStatus.message}
                  </p>
                )}

                <div className="space-y-2">
                  <Label
                    htmlFor="huggingface-token"
                    className="text-xs text-zinc-400"
                  >
                    HuggingFace Token (Optional)
                  </Label>
                  <Input
                    id="huggingface-token"
                    type="password"
                    value={uiPrefs.huggingfaceToken || ""}
                    onChange={(e) => setHuggingfaceToken(e.target.value)}
                    placeholder="hf_..."
                    className="bg-zinc-900/50 border-zinc-700 text-sm h-8"
                  />
                  <p className="text-[10px] text-zinc-500">
                    Required for gated models.
                  </p>
                </div>

                <p className="text-[10px] text-zinc-500">
                  Model used for client-side token counting and visualization.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-zinc-800">
        <Button
          variant="outline"
          onClick={() => setShowModal(true)}
          className="w-full flex items-center justify-center gap-2 bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 text-zinc-300 transition-colors"
        >
          <Settings size={16} />
          More Settings...
        </Button>
      </div>

      <SettingsModal open={showModal} onOpenChange={setShowModal} />
    </div>
  );
}

// Tab Content Component
interface TabContentProps {
  activeTab: ActiveTab;
}

export function TabContent({ activeTab }: TabContentProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {activeTab === "server" ? (
        <div className="flex-1 overflow-y-auto">
          <ServerInfoComponent />
        </div>
      ) : (
        <SettingsPanelContent />
      )}
    </div>
  );
}
