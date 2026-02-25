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
    <div className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/45 p-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-100">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950 text-teal-400"
      />
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
    <div className="flex min-h-0 flex-1 flex-col bg-transparent">
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <div>
          <h3 className="wc-title mb-2 flex items-center gap-2 text-base font-semibold text-slate-100">
            <Sparkles size={16} className="text-teal-300" />
            Quick Controls
          </h3>
          <div className="space-y-2">
            <QuickToggleRow
              checked={apiBackendEnabled}
              onChange={setAPIBackendEnabled}
              title="Enable API Backend"
              description="When disabled, all requests run through the browser model."
            />

            <div className="rounded-xl border border-white/10 bg-slate-900/45 p-3">
              <label
                htmlFor="preset-select"
                className="mb-1 block text-sm font-medium text-slate-100"
              >
                Sampler Preset
              </label>
              <select
                id="preset-select"
                value={activeSamplerPreset || ""}
                onChange={(event) => handlePresetChange(event.target.value)}
                className="h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100"
              >
                <option value="">None</option>
                {SAMPLER_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-500">
                Quickly switch generation behavior.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="wc-title mb-2 flex items-center gap-2 text-base font-semibold text-slate-100">
            <Cable size={16} className="text-teal-300" />
            Server
          </h3>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/45">
            <ServerInfoComponent mode="sidebar" />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/45 p-3 text-xs text-slate-500">
          Advanced sampler, tokenizer, debug, and backend testing tools are in
          full settings.
        </div>
      </div>

      <div className="border-t border-white/10 p-4">
        <Button
          variant="outline"
          onClick={() => setShowModal(true)}
          className="w-full border-slate-700 bg-slate-900/55 text-slate-200 transition-colors hover:bg-slate-800/75"
        >
          <Settings size={16} />
          Open Full Settings
        </Button>
      </div>

      <SettingsModal open={showModal} onOpenChange={setShowModal} />
    </div>
  );
}
