import { use$ } from "@legendapp/state/react";
import { Cable, Settings, Sparkles } from "lucide-react";
import { useState } from "react";
import { ServerInfoComponent } from "~/components/ServerInfo";
import { SettingsModal } from "~/components/SettingsModal";
import { Button } from "~/components/ui/button";
import {
  applySamplerPreset,
  SAMPLER_PRESETS,
  type SamplerPresetId,
} from "~/lib/state/llm";
import {
  setActiveSamplerPreset,
  setAPIBackendEnabled,
  uiPreferences$,
} from "~/lib/state/ui";

function QuickToggleRow({
  checked,
  description,
  onChange,
  title,
}: {
  checked: boolean;
  description: string;
  onChange: (value: boolean) => void;
  title: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-zinc-800/50 bg-zinc-900/20 p-4 transition-all hover:bg-zinc-900/40">
      <div className="space-y-1">
        <p className="text-[13px] font-bold text-zinc-200">{title}</p>
        <p className="text-[11px] text-zinc-600 leading-relaxed">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none ${
          checked ? "bg-emerald-500/40" : "bg-zinc-800"
        }`}
      >
        <span
          className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-zinc-100 shadow-lg ring-0 transition-transform duration-200 ${
            checked ? "translate-x-4.5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export function SettingsPanelContent() {
  const [showModal, setShowModal] = useState(false);
  const { activeSamplerPreset, apiBackendEnabled } = use$(uiPreferences$);

  const handlePresetChange = (presetId: string) => {
    if (!presetId) {
      setActiveSamplerPreset(undefined);
      return;
    }

    const normalized = presetId as SamplerPresetId;
    if (applySamplerPreset(normalized)) {
      setActiveSamplerPreset(normalized);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#0d0d0d]">
      <div className="flex-1 space-y-10 overflow-y-auto p-6 scrollbar-hide">
        <div>
          <h3 className="mb-5 flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
            <Sparkles size={14} className="text-emerald-500/60" />
            Quick Access
          </h3>
          <div className="space-y-4">
            <QuickToggleRow
              checked={apiBackendEnabled}
              onChange={setAPIBackendEnabled}
              title="OpenRouter"
              description="Enable cloud-based inference via OpenRouter."
            />

            <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/20 p-4">
              <label
                htmlFor="preset-select"
                className="mb-3 block text-[10px] font-bold text-zinc-500 uppercase tracking-widest"
              >
                Sampler Profile
              </label>
              <select
                id="preset-select"
                value={activeSamplerPreset || ""}
                onChange={(event) => handlePresetChange(event.target.value)}
                className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 text-[11px] font-bold uppercase tracking-wider text-emerald-400 focus:outline-none focus:border-emerald-500/40 transition-colors"
              >
                <option value="" className="bg-[#0d0d0d]">
                  Custom Profile
                </option>
                {SAMPLER_PRESETS.map((preset) => (
                  <option
                    key={preset.id}
                    value={preset.id}
                    className="bg-[#0d0d0d]"
                  >
                    {preset.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-5 flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
            <Cable size={14} className="text-emerald-500/60" />
            Server Status
          </h3>
          <div className="overflow-hidden rounded-lg border border-zinc-800/50 bg-zinc-900/10">
            <ServerInfoComponent mode="sidebar" />
          </div>
        </div>

        <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-5 text-[11px] font-medium text-zinc-500 leading-relaxed">
          <p className="italic">
            More settings available in full configuration.
          </p>
        </div>
      </div>

      <div className="border-t border-zinc-800/50 p-6 bg-[#0a0a0a]">
        <Button
          variant="outline"
          onClick={() => setShowModal(true)}
          className="w-full h-10 border-zinc-800 bg-zinc-900/50 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:bg-emerald-500/5 hover:text-emerald-400 hover:border-emerald-500/30 transition-all shadow-lg"
        >
          <Settings size={14} />
          Settings
        </Button>
      </div>

      <SettingsModal open={showModal} onOpenChange={setShowModal} />
    </div>
  );
}
