import { createFileRoute } from "@tanstack/react-router";
import chatStore$ from "~/state";
import { use$ } from "@legendapp/state/react";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/")({
	component: Home,
});

function Home() {
	const {
		threads,
		currentThreadId,
		currentMessage,
		setCurrentMessage,
		saveMessage,
		isTyping,
		createNewThread,
		switchThread,
		getCurrentThread,
	} = use$(chatStore$);

	const currentThread = getCurrentThread();
	const messages = currentThread?.messages || [];
	const messagesEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	return (
		<div className="flex h-screen bg-gray-900">
			{/* Sidebar */}
			<div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
				<div className="p-4 border-b border-gray-700">
					<h2 className="text-lg font-semibold text-gray-100">Chat Threads</h2>
				</div>
				<div className="flex-1 overflow-y-auto">
					<div className="p-2">
						<button
							onClick={createNewThread}
							className="w-full p-3 mb-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
						>
							+ New Chat
						</button>
					</div>
					<div className="space-y-1">
						{threads.map((thread) => (
							<button
								key={thread.id}
								onClick={() => switchThread(thread.id)}
								className={`w-full p-3 text-left rounded-lg transition-colors duration-200 ${
									currentThreadId === thread.id
										? "bg-blue-900 text-blue-100"
										: "hover:bg-gray-700 text-gray-300"
								}`}
							>
								<div className="font-medium truncate">{thread.title}</div>
								<div className="text-sm text-gray-400 truncate">
									{thread.messages.length > 0
										? thread.messages[thread.messages.length - 1].text
										: "No messages yet"}
								</div>
								<div className="text-xs text-gray-500 mt-1">
									{new Date(thread.lastMessageAt).toLocaleDateString()}
								</div>
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Main Chat Area */}
			<div className="flex-1 flex flex-col min-w-0">
				<div className="p-4 border-b border-gray-700 bg-gray-800">
					<h1 className="text-xl font-semibold text-gray-100">
						{currentThread?.title || "Chat"}
					</h1>
				</div>

				<div
					className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900"
					role="log"
					aria-live="polite"
					aria-label="Chat messages"
				>
					{messages.map((msg) => (
						<div
							key={msg.id}
							className={`flex items-start gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"} transform transition-all duration-300 ease-out`}
						>
							{msg.role === "assistant" && (
								<div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
									🤖
								</div>
							)}
							<div
								className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 ${
									msg.role === "user"
										? "bg-blue-600 text-white rounded-br-none hover:bg-blue-700"
										: "bg-gray-800 text-gray-100 rounded-bl-none border border-gray-600 hover:shadow-md hover:bg-gray-700"
								}`}
							>
								{msg.text}
							</div>
							{msg.role === "user" && (
								<div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
									👤
								</div>
							)}
						</div>
					))}
					{isTyping && (
						<div className="flex items-start gap-3 justify-start">
							<div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
								🤖
							</div>
							<div className="bg-gray-800 text-gray-100 rounded-bl-none border border-gray-600 px-4 py-2 rounded-lg">
								<div className="flex space-x-1">
									<div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
									<div
										className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
										style={{ animationDelay: "0.1s" }}
									></div>
									<div
										className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
										style={{ animationDelay: "0.2s" }}
									></div>
								</div>
							</div>
						</div>
					)}
					<div ref={messagesEndRef} />
				</div>

				<div className="p-4 border-t border-gray-700 bg-gray-800">
					<div className="flex flex-row gap-2">
						<input
							value={currentMessage || ""}
							onChange={(e) => setCurrentMessage(e.target.value)}
							onKeyPress={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									saveMessage();
								}
							}}
							className="flex-1 p-3 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							placeholder="Type a message..."
							aria-label="Type your message"
						/>
						<button
							onClick={saveMessage}
							disabled={!currentMessage?.trim()}
							type="button"
							className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
							aria-label="Send message"
						>
							Send
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
