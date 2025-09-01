import { use$ } from "@legendapp/state/react";
import { modelProps$ } from "~/lib/state/llm";

export function ModelProperties() {
	const modelProperties = use$(modelProps$);

	return (
		<div className="space-y-4">
			<div className="text-sm text-gray-400">
				Configure model sampling parameters
			</div>

			{/* Temperature */}
			<div className="space-y-2">
				<label htmlFor="temperature" className="block text-sm font-medium text-gray-200">
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
					className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
				/>
				<div className="flex justify-between text-xs text-gray-400">
					<span>0.0</span>
					<span className="text-gray-200">
						{modelProperties.temperature}
					</span>
					<span>2.0</span>
				</div>
			</div>

			{/* Top K */}
			<div className="space-y-2">
				<label htmlFor="top-k" className="block text-sm font-medium text-gray-200">Top K</label>
				<input
					type="range"
					min="1"
					max="100"
					step="1"
					value={modelProperties.top_k}
					onChange={(e) =>
						modelProps$.assign({ top_k: parseInt(e.target.value) })
					}
					className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
				/>
				<div className="flex justify-between text-xs text-gray-400">
					<span>1</span>
					<span className="text-gray-200">{modelProperties.top_k}</span>
					<span>100</span>
				</div>
			</div>

			{/* Top P */}
			<div className="space-y-2">
				<label htmlFor="top-p" className="block text-sm font-medium text-gray-200">Top P</label>
				<input
					type="range"
					min="0"
					max="1"
					step="0.05"
					value={modelProperties.top_p}
					onChange={(e) =>
						modelProps$.assign({ top_p: parseFloat(e.target.value) })
					}
					className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
				/>
				<div className="flex justify-between text-xs text-gray-400">
					<span>0.0</span>
					<span className="text-gray-200">{modelProperties.top_p}</span>
					<span>1.0</span>
				</div>
			</div>

			{/* Max Tokens */}
			<div className="space-y-2">
				<label htmlFor="max-tokens" className="block text-sm font-medium text-gray-200">
					Max Tokens
				</label>
				<input
					type="number"
					min="1"
					max="4096"
					value={modelProperties.n_predict}
					onChange={(e) =>
						modelProps$.assign({ n_predict: parseInt(e.target.value, 10) || 128 })
					}
					className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			{/* Repeat Penalty */}
			<div className="space-y-2">
				<label htmlFor="repeat-penalty" className="block text-sm font-medium text-gray-200">
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
					className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
				/>
				<div className="flex justify-between text-xs text-gray-400">
					<span>1.0</span>
					<span className="text-gray-200">
						{modelProperties.repeat_penalty}
					</span>
					<span>2.0</span>
				</div>
			</div>

			{/* Presence Penalty */}
			<div className="space-y-2">
				<label htmlFor="presence-penalty" className="block text-sm font-medium text-gray-200">
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
					className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
				/>
				<div className="flex justify-between text-xs text-gray-400">
					<span>-2.0</span>
					<span className="text-gray-200">
						{modelProperties.presence_penalty}
					</span>
					<span>2.0</span>
				</div>
			</div>

			{/* Frequency Penalty */}
			<div className="space-y-2">
				<label htmlFor="frequency-penalty" className="block text-sm font-medium text-gray-200">
					Frequency Penalty
				</label>
				<input
					type="range"
					min="-2.0"
					max="2.0"
					step="0.1"
					value={modelProperties.frequency_penalty}
					onChange={(e) =>
						modelProps$.assign({ frequency_penalty: parseFloat(e.target.value) })
					}
					className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
				/>
				<div className="flex justify-between text-xs text-gray-400">
					<span>-2.0</span>
					<span className="text-gray-200">
						{modelProperties.frequency_penalty}
					</span>
					<span>2.0</span>
				</div>
			</div>

			{/* Mirostat Mode */}
			<div className="space-y-2">
				<label htmlFor="mirostat-mode" className="block text-sm font-medium text-gray-200">
					Mirostat Mode
				</label>
				<select
					value={modelProperties.mirostat}
					onChange={(e) =>
						modelProps$.assign({ mirostat: parseInt(e.target.value) as 0 | 1 | 2 })
					}
					className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					<option value={0}>Disabled</option>
					<option value={1}>Mirostat 1.0</option>
					<option value={2}>Mirostat 2.0</option>
				</select>
			</div>

			{/* Mirostat Tau */}
			{modelProperties.mirostat > 0 && (
				<div className="space-y-2">
					<label htmlFor="mirostat-tau" className="block text-sm font-medium text-gray-200">
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
						className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
					/>
					<div className="flex justify-between text-xs text-gray-400">
						<span>0.0</span>
						<span className="text-gray-200">
							{modelProperties.mirostat_tau}
						</span>
						<span>10.0</span>
					</div>
				</div>
			)}

			{/* Mirostat Eta */}
			{modelProperties.mirostat > 0 && (
				<div className="space-y-2">
					<label htmlFor="mirostat-eta" className="block text-sm font-medium text-gray-200">
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
						className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
					/>
					<div className="flex justify-between text-xs text-gray-400">
						<span>0.00</span>
						<span className="text-gray-200">
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
					checked={modelProperties.cache_prompt}
					onChange={(e) =>
						modelProps$.assign({ cache_prompt: e.target.checked })
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
					checked={modelProperties.return_tokens}
					onChange={(e) =>
						modelProps$.assign({ return_tokens: e.target.checked })
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
