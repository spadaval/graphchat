import { use$ } from "@legendapp/state/react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { modelProps$ } from "~/lib/state";

export function ModelProperties() {
  const modelProperties = use$(modelProps$);

  const TooltipWrapper = ({
    label,
    content,
  }: {
    label: string;
    content: string;
  }) => (
    <div className="flex items-center gap-1.5 mb-1.5">
      <label className="text-sm font-medium text-zinc-300">{label}</label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Info size={12} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="max-w-[200px] bg-zinc-800 border-zinc-700 text-zinc-200"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="text-sm text-zinc-500">
        Configure model sampling parameters
      </div>

      {/* Temperature */}
      <div className="space-y-2">
        <TooltipWrapper
          label="Temperature"
          content="Higher values make the output more random, while lower values make it more focused and deterministic."
        />
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={modelProperties.temperature}
          onChange={(e) =>
            modelProps$.assign({ temperature: parseFloat(e.target.value) })
          }
          className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-300"
        />
        <div className="flex justify-between text-xs text-zinc-500">
          <span>0.0</span>
          <span className="text-zinc-300">{modelProperties.temperature}</span>
          <span>2.0</span>
        </div>
      </div>

      {/* Top K */}
      <div className="space-y-2">
        <TooltipWrapper
          label="Top K"
          content="Limits the next token selection to the K most likely tokens. Reduces the risk of long-tail low-probability tokens."
        />
        <input
          type="range"
          min="1"
          max="100"
          step="1"
          value={modelProperties.top_k}
          onChange={(e) =>
            modelProps$.assign({ top_k: parseInt(e.target.value, 10) })
          }
          className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-300"
        />
        <div className="flex justify-between text-xs text-zinc-500">
          <span>1</span>
          <span className="text-zinc-300">{modelProperties.top_k}</span>
          <span>100</span>
        </div>
      </div>

      {/* Top P */}
      <div className="space-y-2">
        <TooltipWrapper
          label="Top P"
          content="Nucleus sampling: only considers tokens with a cumulative probability above P. Balances diversity and quality."
        />
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={modelProperties.top_p}
          onChange={(e) =>
            modelProps$.assign({ top_p: parseFloat(e.target.value) })
          }
          className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-zinc-500">
          <span>0.0</span>
          <span className="text-zinc-300">{modelProperties.top_p}</span>
          <span>1.0</span>
        </div>
      </div>

      {/* Max Tokens */}
      <div className="space-y-2">
        <TooltipWrapper
          label="Max Tokens"
          content="The maximum number of tokens to generate in one go. Useful for preventing runaway generation."
        />
        <input
          type="number"
          min="1"
          max="4096"
          value={modelProperties.n_predict}
          onChange={(e) =>
            modelProps$.assign({
              n_predict: parseInt(e.target.value, 10) || 128,
            })
          }
          className="w-full p-2 bg-gradient-to-br from-zinc-800 to-zinc-850 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-600 text-sm"
        />
      </div>

      {/* Repeat Penalty */}
      <div className="space-y-2">
        <TooltipWrapper
          label="Repeat Penalty"
          content="Applies a penalty to tokens that have already appeared. Higher values strongly discourage repetition."
        />
        <input
          type="range"
          min="1.0"
          max="2.0"
          step="0.1"
          value={modelProperties.repeat_penalty}
          onChange={(e) =>
            modelProps$.assign({ repeat_penalty: parseFloat(e.target.value) })
          }
          className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-zinc-500">
          <span>1.0</span>
          <span className="text-zinc-300">
            {modelProperties.repeat_penalty}
          </span>
          <span>2.0</span>
        </div>
      </div>

      {/* Presence Penalty */}
      <div className="space-y-2">
        <TooltipWrapper
          label="Presence Penalty"
          content="Penalizes tokens based on whether they have appeared so far. Encourages the model to talk about new topics."
        />
        <input
          type="range"
          min="-2.0"
          max="2.0"
          step="0.1"
          value={modelProperties.presence_penalty}
          onChange={(e) =>
            modelProps$.assign({ presence_penalty: parseFloat(e.target.value) })
          }
          className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-zinc-500">
          <span>-2.0</span>
          <span className="text-zinc-300">
            {modelProperties.presence_penalty}
          </span>
          <span>2.0</span>
        </div>
      </div>

      {/* Frequency Penalty */}
      <div className="space-y-2">
        <TooltipWrapper
          label="Frequency Penalty"
          content="Penalizes tokens based on how many times they've appeared. Further discourages overused words."
        />
        <input
          type="range"
          min="-2.0"
          max="2.0"
          step="0.1"
          value={modelProperties.frequency_penalty}
          onChange={(e) =>
            modelProps$.assign({
              frequency_penalty: parseFloat(e.target.value),
            })
          }
          className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-zinc-500">
          <span>-2.0</span>
          <span className="text-zinc-300">
            {modelProperties.frequency_penalty}
          </span>
          <span>2.0</span>
        </div>
      </div>

      {/* Mirostat Mode */}
      <div className="space-y-2">
        <TooltipWrapper
          label="Mirostat Mode"
          content="An algorithm that controls the perplexity of the generated text, keeping it within a target range."
        />
        <select
          value={modelProperties.mirostat}
          onChange={(e) =>
            modelProps$.assign({
              mirostat: parseInt(e.target.value, 10) as 0 | 1 | 2,
            })
          }
          className="w-full p-2 bg-gradient-to-br from-zinc-800 to-zinc-850 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-600 text-sm"
        >
          <option value={0}>Disabled</option>
          <option value={1}>Mirostat 1.0</option>
          <option value={2}>Mirostat 2.0</option>
        </select>
      </div>

      {/* Mirostat Tau */}
      {modelProperties.mirostat > 0 && (
        <div className="space-y-2">
          <TooltipWrapper
            label="Mirostat Tau"
            content="The target perplexity (bit per token) for the Mirostat algorithm. Typical values are 3.0 to 5.0."
          />
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={modelProperties.mirostat_tau}
            onChange={(e) =>
              modelProps$.assign({ mirostat_tau: parseFloat(e.target.value) })
            }
            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-zinc-500">
            <span>0.0</span>
            <span className="text-zinc-300">
              {modelProperties.mirostat_tau}
            </span>
            <span>10.0</span>
          </div>
        </div>
      )}

      {/* Mirostat Eta */}
      {modelProperties.mirostat > 0 && (
        <div className="space-y-2">
          <TooltipWrapper
            label="Mirostat Eta"
            content="The learning rate for the Mirostat algorithm. Controls how quickly it adjusts to maintain target perplexity."
          />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={modelProperties.mirostat_eta}
            onChange={(e) =>
              modelProps$.assign({ mirostat_eta: parseFloat(e.target.value) })
            }
            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-zinc-500">
            <span>0.00</span>
            <span className="text-zinc-300">
              {modelProperties.mirostat_eta}
            </span>
            <span>1.00</span>
          </div>
        </div>
      )}

      {/* Streaming */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={modelProperties.stream}
          onChange={(e) => modelProps$.assign({ stream: e.target.checked })}
          className="w-4 h-4 text-zinc-600 bg-zinc-700 border-zinc-600 rounded focus:ring-zinc-500"
        />
        <label
          htmlFor="streaming"
          className="text-sm font-medium text-zinc-300"
        >
          Enable Streaming
        </label>
      </div>

      {/* Cache Prompt */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={modelProperties.cache_prompt}
          onChange={(e) =>
            modelProps$.assign({ cache_prompt: e.target.checked })
          }
          className="w-4 h-4 text-zinc-600 bg-zinc-700 border-zinc-600 rounded focus:ring-zinc-500"
        />
        <label
          htmlFor="cache-prompt"
          className="text-sm font-medium text-zinc-300"
        >
          Cache Prompt
        </label>
      </div>

      {/* Return Tokens */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={modelProperties.return_tokens}
          onChange={(e) =>
            modelProps$.assign({ return_tokens: e.target.checked })
          }
          className="w-4 h-4 text-zinc-600 bg-zinc-700 border-zinc-600 rounded focus:ring-zinc-500"
        />
        <label
          htmlFor="return-tokens"
          className="text-sm font-medium text-zinc-300"
        >
          Return Tokens
        </label>
      </div>
    </div>
  );
}
