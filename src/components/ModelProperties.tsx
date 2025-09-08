import { use$ } from "@legendapp/state/react";
import { modelProps$ } from "~/lib/state";

export function ModelProperties() {
  const modelProperties = use$(modelProps$);

  return (
    <div className="space-y-4">
      <div className="text-sm text-zinc-500">
        Configure model sampling parameters
      </div>

      {/* Temperature */}
      <div className="space-y-2">
        <label
          htmlFor="temperature"
          className="block text-sm font-medium text-zinc-300"
        >
          Temperature
        </label>
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
        <label
          htmlFor="top-k"
          className="block text-sm font-medium text-zinc-300"
        >
          Top K
        </label>
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
        <label
          htmlFor="top-p"
          className="block text-sm font-medium text-zinc-300"
        >
          Top P
        </label>
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
        <label
          htmlFor="max-tokens"
          className="block text-sm font-medium text-zinc-300"
        >
          Max Tokens
        </label>
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
        <label
          htmlFor="repeat-penalty"
          className="block text-sm font-medium text-zinc-300"
        >
          Repeat Penalty
        </label>
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
        <label
          htmlFor="presence-penalty"
          className="block text-sm font-medium text-zinc-300"
        >
          Presence Penalty
        </label>
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
        <label
          htmlFor="frequency-penalty"
          className="block text-sm font-medium text-zinc-300"
        >
          Frequency Penalty
        </label>
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
        <label
          htmlFor="mirostat-mode"
          className="block text-sm font-medium text-zinc-300"
        >
          Mirostat Mode
        </label>
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
          <label
            htmlFor="mirostat-tau"
            className="block text-sm font-medium text-zinc-300"
          >
            Mirostat Tau
          </label>
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
          <label
            htmlFor="mirostat-eta"
            className="block text-sm font-medium text-zinc-300"
          >
            Mirostat Eta
          </label>
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
