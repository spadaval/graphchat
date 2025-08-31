import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";

export const Route = createFileRoute("/")({
	component: Home,
});

function Home() {
	const [messages, setMessages] = React.useState([]);
	const [input, setInput] = React.useState("");

	const handleSend = () => {
		if (input.trim()) {
			setMessages([...messages, { text: input, id: Date.now() }]);
			setInput("");
		}
	};

	return (
		<div className="flex flex-col h-screen">
			<div className="flex-1 overflow-y-auto p-4">
				{messages.map((msg) => (
					<div key={msg.id} className="mb-2 p-2 bg-blue-100 rounded">
						{msg.text}
					</div>
				))}
			</div>
			<div className="p-4 border-t">
				<input
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyPress={(e) => e.key === "Enter" && handleSend()}
					className="w-full p-2 border rounded"
					placeholder="Type a message..."
				/>
				<button
					onClick={handleSend}
					className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
				>
					Send
				</button>
			</div>
		</div>
	);
}
