import { use$ } from "@legendapp/state/react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { modelProps$ } from "~/lib/state";
import type { ModelProperties as LLMModelProperties } from "~/lib/state/types";
import { setActiveSamplerPreset } from "~/lib/state/ui";

export function ModelProperties() {
  const modelProperties = use$(modelProps$);

  const updateModelProperties = (patch: Partial<LLMModelProperties>) => {
    setActiveSamplerPreset(undefined);
    modelProps$.assign(patch);
  };

  const TooltipWrapper = ({
    label,
    content,
  }: {
    label: string;
    content: string;
  }) => (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        {label}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="text-zinc-700 hover:text-emerald-500/80 transition-colors"
          >
            <Info size={10} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="max-w-[220px] bg-zinc-900 border-zinc-800 text-[10px] leading-relaxed text-zinc-400 p-3 shadow-2xl"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
      {/* Temperature */}
      <div className="space-y-3">
        <TooltipWrapper
          label="Entropy (Temp)"
          content="Higher values increase variance/creativity; lower values force deterministic precision."
        />
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={modelProperties.temperature}
            onChange={(e) =>
              updateModelProperties({ temperature: parseFloat(e.target.value) })
            }
            className="flex-1 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
          />
          <span className="min-w-[40px] text-right font-mono text-xs text-emerald-400/90 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
            {modelProperties.temperature.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Top K */}
      <div className="space-y-3">
        <TooltipWrapper
          label="Top-K Filter"
          content="Constrains generation to the top K most probable tokens. Nullifies the long-tail."
        />
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={modelProperties.top_k}
            onChange={(e) =>
              updateModelProperties({ top_k: parseInt(e.target.value, 10) })
            }
            className="flex-1 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
          />
          <span className="min-w-[40px] text-right font-mono text-xs text-emerald-400/90 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
            {modelProperties.top_k}
          </span>
        </div>
      </div>

      {/* Top P */}
      <div className="space-y-3">
        <TooltipWrapper
          label="Nucleus (Top-P)"
          content="Dynamic vocabulary cutoff based on cumulative probability mass P."
        />
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={modelProperties.top_p}
            onChange={(e) =>
              updateModelProperties({ top_p: parseFloat(e.target.value) })
            }
            className="flex-1 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
          />
          <span className="min-w-[40px] text-right font-mono text-xs text-emerald-400/90 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
            {modelProperties.top_p.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Max Tokens */}
      <div className="space-y-3">
        <TooltipWrapper
          label="Sequence Limit"
          content="Maximum token count per generation event. Safeguard against infinite loops."
        />
        <div className="relative group">
          <input
            type="number"
            min="1"
            max="8192"
            value={modelProperties.n_predict}
            onChange={(e) =>
              updateModelProperties({
                n_predict: parseInt(e.target.value, 10) || 128,
              })
            }
            className="w-full h-8 bg-zinc-900/50 border border-zinc-800 rounded px-3 font-mono text-xs text-emerald-400 focus:outline-none focus:border-emerald-500/40 transition-colors"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase tracking-widest text-zinc-700 pointer-events-none group-hover:text-zinc-600 transition-colors">
            TOKENS
          </span>
        </div>
      </div>

      {/* Repeat Penalty */}
      <div className="space-y-3">
        <TooltipWrapper
          label="Repetition Bias"
          content="Mathematical penalty applied to already-generated tokens to encourage variety."
        />
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="1.0"
            max="2.0"
            step="0.1"
            value={modelProperties.repeat_penalty}
            onChange={(e) =>
              updateModelProperties({
                repeat_penalty: parseFloat(e.target.value),
              })
            }
            className="flex-1 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
          />
          <span className="min-w-[40px] text-right font-mono text-xs text-emerald-400/90 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
            {modelProperties.repeat_penalty.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Presence Penalty */}
      <div className="space-y-3">
        <TooltipWrapper
          label="Presence Bias"
          content="Penalizes tokens that have appeared at least once. Forces topical shift."
        />
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="-2.0"
            max="2.0"
            step="0.1"
            value={modelProperties.presence_penalty}
            onChange={(e) =>
              updateModelProperties({
                presence_penalty: parseFloat(e.target.value),
              })
            }
            className="flex-1 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
          />
          <span className="min-w-[40px] text-right font-mono text-xs text-emerald-400/90 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
            {modelProperties.presence_penalty.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Mirostat Mode */}
      <div className="space-y-3">
        <TooltipWrapper
          label="Mirostat Controller"
          content="Dynamic perplexity control algorithm. Automatically adjusts sampling to maintain quality."
        />
        <select
          value={modelProperties.mirostat}
          onChange={(e) =>
            updateModelProperties({
              mirostat: parseInt(e.target.value, 10) as 0 | 1 | 2,
            })
          }
          className="w-full h-8 bg-zinc-900/50 border border-zinc-800 rounded px-2 font-mono text-[11px] text-emerald-400/80 focus:outline-none focus:border-emerald-500/40 transition-colors uppercase tracking-wider"
        >
          <option value={0}>Disabled</option>
          <option value={1}>Mirostat v1</option>
          <option value={2}>Mirostat v2</option>
        </select>
      </div>

      {/* Boolean Controls */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between group">
          <label
            htmlFor="streaming"
            className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-zinc-400 transition-colors cursor-pointer"
          >
            Live Streaming
          </label>
          <button
            type="button"
            id="streaming"
            onClick={() =>
              updateModelProperties({ stream: !modelProperties.stream })
            }
            className={`w-8 h-4 rounded-full transition-colors relative ${modelProperties.stream ? "bg-emerald-500/40" : "bg-zinc-800"}`}
          >
            <div
              className={`absolute top-1 w-2 h-2 rounded-full bg-zinc-100 transition-all ${modelProperties.stream ? "right-1" : "left-1"}`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between group">
          <label
            htmlFor="cache-prompt"
            className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-zinc-400 transition-colors cursor-pointer"
          >
            Context Caching
          </label>
          <button
            type="button"
            id="cache-prompt"
            onClick={() =>
              updateModelProperties({
                cache_prompt: !modelProperties.cache_prompt,
              })
            }
            className={`w-8 h-4 rounded-full transition-colors relative ${modelProperties.cache_prompt ? "bg-emerald-500/40" : "bg-zinc-800"}`}
          >
            <div
              className={`absolute top-1 w-2 h-2 rounded-full bg-zinc-100 transition-all ${modelProperties.cache_prompt ? "right-1" : "left-1"}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
