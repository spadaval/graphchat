import { use$ } from "@legendapp/state/react";
import chatStore$ from "~/lib/state";

export function ModelProperties() {
	const { modelProperties, updateModelProperty } = use$({
		modelProperties: chatStore$.modelProperties,
		updateModelProperty: chatStore$.updateModelProperty,
	});

	return (
		<div className="space-y-4">
			<div className="text-sm text-gray-400">
				Configure model sampling parameters
			</div>

			{/* Temperature */}
			<div className="space-y-2">
				<label className="block text-sm font-medium text-gray-200">
					Temperature
				</label>
				<input
					type="range"
					min="0"
					max="2"
					step="0.1"
					value={modelProperties.temperature.get()}
					onChange={(e) =>
						updateModelProperty("temperature", parseFloat(e.target.value))
					}
					className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
				/>
				<div className="flex justify-between text-xs text-gray-400">
					<span>0.0</span>
					<span className="text-gray-200">
						{modelProperties.temperature.get()}
					</span>
					<span>2.0</span>
				</div>
			</div>

			{/* Top K */}
			<div className="space-y-2">
				<label className="block text-sm font-medium text-gray-200">Top K</label>
				<input
					type="range"
					min="1"
					max="100"
					step="1"
					value={modelProperties.top_k.get()}
					onChange={(e) =>
						updateModelProperty("top_k", parseInt(e.target.value))
					}
					className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
				/>
				<div className="flex justify-between text-xs text-gray-400">
					<span>1</span>
					<span className="text-gray-200">{modelProperties.top_k.get()}</span>
					<span>100</span>
				</div>
			</div>

			{/* Top P */}
			<div className="space-y-2">
				<label className="block text-sm font-medium text-gray-200">Top P</label>
				<input
					type="range"
					min="0"
					max="1"
					step="0.05"
					value={modelProperties.top_p.get()}
					onChange={(e) =>
						updateModelProperty("top_p", parseFloat(e.target.value))
					}
					className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
				/>
				<div className="flex justify-between text-xs text-gray-400">
					<span>0.0</span>
					<span className="text-gray-200">{modelProperties.top_p.get()}</span>
					<span>1.0</span>
				</div>
			</div>

			{/* Max Tokens */}
			<div className="space-y-2">
				<label className="block text-sm font-medium text-gray-200">
					Max Tokens
				</label>
				<input
					type="number"
					min="1"
					max="4096"
					value={modelProperties.n_predict.get()}
					onChange={(e) =>
						updateModelProperty("n_predict", parseInt(e.target.value) || 128)
					}
					className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			{/* Repeat Penalty */}
			<div className="space-y-2">
				<label className="block text-sm font-medium text-gray-200">
					Repeat Penalty
				</label>
				<input
					type="range"
					min="1.0"
					max="2.0"
					step="0.1"
					value={modelProperties.repeat_penalty.get()}
					onChange={(e) =>
						updateModelProperty("repeat_penalty", parseFloat(e.target.value))
					}
					className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
				/>
				<div className="flex justify-between text-xs text-gray-400">
					<span>1.0</span>
					<span className="text-gray-200">
						{modelProperties.repeat_penalty.get()}
					</span>
					<span>2.0</span>
				</div>
			</div>

			{/* Presence Penalty */}
			<div className="space-y-2">
				<label className="block text-sm font-medium text-gray-200">
					Presence Penalty
				</label>
				<input
					type="range"
					min="-2.0"
					max="2.0"
					step="0.1"
					value={modelProperties.presence_penalty.get()}
					onChange={(e) =>
						updateModelProperty("presence_penalty", parseFloat(e.target.value))
					}
					className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
				/>
				<div className="flex justify-between text-xs text-gray-400">
					<span>-2.0</span>
					<span className="text-gray-200">
						{modelProperties.presence_penalty.get()}
					</span>
					<span>2.0</span>
				</div>
			</div>

			{/* Frequency Penalty */}
			<div className="space-y-2">
				<label className="block text-sm font-medium text-gray-200">
					Frequency Penalty
				</label>
				<input
					type="range"
					min="-2.0"
					max="2.0"
					step="0.1"
					value={modelProperties.frequency_penalty.get()}
					onChange={(e) =>
						updateModelProperty("frequency_penalty", parseFloat(e.target.value))
					}
					className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
				/>
				<div className="flex justify-between text-xs text-gray-400">
					<span>-2.0</span>
					<span className="text-gray-200">
						{modelProperties.frequency_penalty.get()}
					</span>
					<span>2.0</span>
				</div>
			</div>

			{/* Mirostat Mode */}
			<div className="space-y-2">
				<label className="block text-sm font-medium text-gray-200">
					Mirostat Mode
				</label>
				<select
					value={modelProperties.mirostat.get()}
					onChange={(e) =>
						updateModelProperty(
							"mirostat",
							parseInt(e.target.value) as 0 | 1 | 2,
						)
					}
					className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					<option value={0}>Disabled</option>
					<option value={1}>Mirostat 1.0</option>
					<option value={2}>Mirostat 2.0</option>
				</select>
			</div>

			{/* Mirostat Tau */}
			{modelProperties.mirostat.get() > 0 && (
				<div className="space-y-2">
					<label className="block text-sm font-medium text-gray-200">
						Mirostat Tau
					</label>
					<input
						type="range"
						min="0"
						max="10"
						step="0.1"
						value={modelProperties.mirostat_tau.get()}
						onChange={(e) =>
							updateModelProperty("mirostat_tau", parseFloat(e.target.value))
						}
						className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
					/>
					<div className="flex justify-between text-xs text-gray-400">
						<span>0.0</span>
						<span className="text-gray-200">
							{modelProperties.mirostat_tau.get()}
						</span>
						<span>10.0</span>
					</div>
				</div>
			)}

			{/* Mirostat Eta */}
			{modelProperties.mirostat.get() > 0 && (
				<div className="space-y-2">
					<label className="block text-sm font-medium text-gray-200">
						Mirostat Eta
					</label>
					<input
						type="range"
						min="0"
						max="1"
						step="0.01"
						value={modelProperties.mirostat_eta.get()}
						onChange={(e) =>
							updateModelProperty("mirostat_eta", parseFloat(e.target.value))
						}
						className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
					/>
					<div className="flex justify-between text-xs text-gray-400">
						<span>0.00</span>
						<span className="text-gray-200">
							{modelProperties.mirostat_eta.get()}
						</span>
						<span>1.00</span>
					</div>
				</div>
			)}

			{/* Streaming */}
			<div className="flex items-center space-x-2">
				<input
					type="checkbox"
					id="streaming"
					checked={modelProperties.stream.get()}
					onChange={(e) => updateModelProperty("stream", e.target.checked)}
					className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
				/>
				<label
					htmlFor="streaming"
					className="text-sm font-medium text-gray-200"
				>
					Enable Streaming
				</label>
			</div>

			{/* Cache Prompt */}
			<div className="flex items-center space-x-2">
				<input
					type="checkbox"
					id="cache-prompt"
					checked={modelProperties.cache_prompt.get()}
					onChange={(e) =>
						updateModelProperty("cache_prompt", e.target.checked)
					}
					className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
				/>
				<label
					htmlFor="cache-prompt"
					className="text-sm font-medium text-gray-200"
				>
					Cache Prompt
				</label>
			</div>

			{/* Return Tokens */}
			<div className="flex items-center space-x-2">
				<input
					type="checkbox"
					id="return-tokens"
					checked={modelProperties.return_tokens.get()}
					onChange={(e) =>
						updateModelProperty("return_tokens", e.target.checked)
					}
					className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
				/>
				<label
					htmlFor="return-tokens"
					className="text-sm font-medium text-gray-200"
				>
					Return Tokens
				</label>
			</div>
		</div>
	);
}
