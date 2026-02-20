import { use$ } from "@legendapp/state/react";
import { Layout, Settings, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  setAIEnabled,
  setAIProvider,
  setDocumentWidth,
  setEnableTokenProbabilities,
  setInlineCompletionEnabled,
  uiPreferences$,
} from "~/lib/state/ui";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const {
    aiEnabled,
    aiProvider,
    inlineCompletion,
    enableTokenProbabilities,
    documentWidth = 800,
  } = use$(uiPreferences$);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Settings className="w-5 h-5" />
            Full Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8 py-4">
          {/* AI Controls Section */}
          <section>
            <h3 className="text-sm font-semibold text-zinc-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Sparkles size={16} className="text-blue-400" />
              AI Controls
            </h3>
            <div className="space-y-4 bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/50">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-100">
                    Enable AI Features
                  </span>
                  <span className="text-xs text-zinc-500">
                    Master switch for all AI functionality
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(e) => setAIEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-850 text-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-100">
                    AI Runtime
                  </span>
                  <span className="text-xs text-zinc-500">
                    Browser runs `onnx-community/Qwen2.5-0.5B-Instruct`
                  </span>
                </div>
                <select
                  value={aiProvider}
                  onChange={(e) =>
                    setAIProvider(e.target.value as "browser" | "server")
                  }
                  className="h-8 rounded border border-zinc-700 bg-zinc-850 px-2 text-xs text-zinc-100"
                >
                  <option value="browser">Browser (Default)</option>
                  <option value="server">Server (llama.cpp)</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-100">
                    Inline Completion
                  </span>
                  <span className="text-xs text-zinc-500">
                    Show ghost text as you type
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={inlineCompletion}
                  onChange={(e) => setInlineCompletionEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-850 text-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-100">
                    Token Probabilities
                  </span>
                  <span className="text-xs text-zinc-500">
                    Request token probabilities from the LLM
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={enableTokenProbabilities}
                  onChange={(e) =>
                    setEnableTokenProbabilities(e.target.checked)
                  }
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-850 text-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          {/* Appearance Section */}
          <section>
            <h3 className="text-sm font-semibold text-zinc-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Layout size={16} className="text-purple-400" />
              Appearance
            </h3>
            <div className="space-y-4 bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/50">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-zinc-100">
                      Document Editor Width
                    </span>
                    <span className="text-xs text-zinc-500">
                      Control the maximum width of the editor content
                    </span>
                  </div>
                  <span className="text-sm font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                    {documentWidth}px
                  </span>
                </div>
                <input
                  type="range"
                  min="400"
                  max="1600"
                  step="50"
                  value={documentWidth}
                  onChange={(e) => setDocumentWidth(Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 px-1">
                  <span>Narrow</span>
                  <span>Standard</span>
                  <span>Wide</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
