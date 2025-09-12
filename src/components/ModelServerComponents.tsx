import { useState } from "react";
import { use$ } from "@legendapp/state/react";
import { useNavigate } from "@tanstack/react-router";
import { ModelProperties } from "~/components/ModelProperties";
import { ServerInfoComponent } from "~/components/ServerInfo";
import { Button } from "~/components/ui/button";
import {
  documentStore$,
  getAllDocuments,
  getDocumentById,
  createDocument,
  chatStore$,
  getThreadMessages,
} from "~/lib/state";
import type { DocumentId } from "~/lib/state/types";
import { callLLMStreaming } from "~/lib/state/llm";

// Tab Navigation Component
interface TabNavigationProps {
  activeTab: "model" | "server" | "documents";
  setActiveTab: (tab: "model" | "server" | "documents") => void;
}

export function TabNavigation({ activeTab, setActiveTab }: TabNavigationProps) {
  return (
    <div className="border-b border-zinc-800 flex">
      <button
        type="button"
        className={`flex-1 py-3 px-4 text-sm font-medium text-center ${
          activeTab === "model"
            ? "text-zinc-300 border-b-2 border-zinc-500"
            : "text-zinc-500 hover:text-zinc-300"
        }`}
        onClick={() => setActiveTab("model")}
      >
        Model
      </button>
      <button
        type="button"
        className={`flex-1 py-3 px-4 text-sm font-medium text-center ${
          activeTab === "server"
            ? "text-zinc-300 border-b-2 border-zinc-500"
            : "text-zinc-500 hover:text-zinc-300"
        }`}
        onClick={() => setActiveTab("server")}
      >
        Server
      </button>
      <button
        type="button"
        className={`flex-1 py-3 px-4 text-sm font-medium text-center ${
          activeTab === "documents"
            ? "text-zinc-300 border-b-2 border-zinc-500"
            : "text-zinc-500 hover:text-zinc-300"
        }`}
        onClick={() => setActiveTab("documents")}
      >
        Documents
      </button>
    </div>
  );
}

// Document Panel Component (simplified version of the previous DocumentPanel)
function DocumentPanelContent() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [aiRequest, setAiRequest] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { documents } = use$(documentStore$);
  const { currentThreadId } = use$(chatStore$);

  // Get all documents
  const allDocuments = getAllDocuments();

  // Filter documents based on search term
  const filteredDocuments = allDocuments.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
  );

  const handleDocumentClick = (documentId: DocumentId) => {
    // Navigate to the documents page with the specific document selected
    navigate({ to: "/documents", search: { id: documentId } });
  };

  const handleGenerateDocument = async () => {
    if (!aiRequest.trim() || !currentThreadId || isGenerating) return;

    setIsGenerating(true);

    try {
      // Get the current thread messages for context
      const threadMessages = getThreadMessages(currentThreadId);

      // Create a prompt that includes the chat context and the user's request
      let prompt =
        "Based on the following conversation context, please create a document that addresses the user's request.\n\n";
      prompt += "Conversation context:\n";

      // Add the last few messages as context (limit to avoid exceeding context window)
      const contextMessages = threadMessages.slice(-10); // Last 10 messages
      for (const message of contextMessages) {
        const role = message.role === "user" ? "User" : "Assistant";
        prompt += `${role}: ${message.text}\n\n`;
      }

      prompt += `User's document request: ${aiRequest}\n\n`;
      prompt +=
        "Please create a well-structured document that addresses this request. Respond ONLY with the document content, no other text.";

      // Generate the document content using the LLM
      let generatedContent = "";
      const responseStream = callLLMStreaming(
        [
          {
            id: "temp-msg" as any,
            messageId: 0,
            text: prompt,
            role: "user",
            isGenerating: false,
            createdAt: new Date(),
            linkedDocuments: [],
          },
        ],
        {},
      );

      for await (const chunkResult of responseStream) {
        chunkResult.match(
          (chunk) => {
            if (chunk.done) {
              return;
            }
            generatedContent += chunk.content;
          },
          (error) => {
            console.error("AI generation error:", error.message);
          },
        );
      }

      // Create a new document with the generated content
      const newDocumentId = createDocument(
        `Generated: ${aiRequest.substring(0, 30)}${aiRequest.length > 30 ? "..." : ""}`,
        generatedContent,
        ["ai-generated"],
      );

      // Navigate to the new document in the documents page for editing
      navigate({ to: "/documents", search: { id: newDocumentId } });
    } catch (error) {
      console.error("Error generating document:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-2">
        <input
          type="text"
          placeholder="Search documents..."
          className="w-full p-2 text-sm border border-zinc-700 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-850 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Document List */}
        <div className="p-2 border-b border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-300 mb-2">
            All Documents
          </h3>
          {filteredDocuments.length > 0 ? (
            <div className="space-y-1">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-2 hover:bg-zinc-800 rounded cursor-pointer"
                  onClick={() => handleDocumentClick(doc.id)}
                >
                  <span className="text-sm text-zinc-200 truncate">
                    {doc.title}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic">
              {searchTerm ? "No matching documents" : "No documents found"}
            </p>
          )}
        </div>

        {/* AI Document Generation */}
        <div className="p-2">
          <h3 className="text-sm font-medium text-zinc-300 mb-2">
            Generate Document
          </h3>
          <div className="space-y-2">
            <textarea
              value={aiRequest}
              onChange={(e) => setAiRequest(e.target.value)}
              placeholder="Describe what you want in a document..."
              className="w-full p-2 text-sm border border-zinc-700 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-850 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 min-h-[80px]"
              disabled={isGenerating}
            />
            <Button
              onClick={handleGenerateDocument}
              disabled={!aiRequest.trim() || isGenerating}
              className="w-full text-sm"
            >
              {isGenerating ? "Generating..." : "Generate Document"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tab Content Component
interface TabContentProps {
  activeTab: "model" | "server" | "documents";
}

export function TabContent({ activeTab }: TabContentProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      {activeTab === "model" ? (
        <div className="p-4">
          <ModelProperties />
        </div>
      ) : activeTab === "server" ? (
        <ServerInfoComponent />
      ) : (
        <DocumentPanelContent />
      )}
    </div>
  );
}
