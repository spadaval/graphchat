import { use$ } from "@legendapp/state/react";
import { ChevronDown, Edit2, Globe, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import type { WorldId } from "~/lib/state/types";
import {
  createWorld,
  deleteWorld,
  setCurrentWorld,
  updateWorld,
  worldStore$,
} from "~/lib/state/worlds";

export function WorldSwitcher() {
  const worlds = use$(worldStore$.worlds);
  const currentWorldId = use$(worldStore$.currentWorldId);
  const currentWorld = currentWorldId ? worlds[currentWorldId] : undefined;

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newWorldName, setNewWorldName] = useState("");
  const [worldToRename, setWorldToRename] = useState<WorldId | null>(null);

  const handleCreateWorld = () => {
    if (newWorldName.trim()) {
      const id = createWorld(newWorldName.trim());
      setCurrentWorld(id);
      setIsCreateDialogOpen(false);
      setNewWorldName("");
    }
  };

  const handleRenameWorld = () => {
    if (worldToRename && newWorldName.trim()) {
      updateWorld(worldToRename, { name: newWorldName.trim() });
      setIsRenameDialogOpen(false);
      setNewWorldName("");
      setWorldToRename(null);
    }
  };

  return (
    <div className="flex items-center gap-2 px-2 py-2 mb-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-1.5 flex-1 text-left hover:bg-zinc-800 rounded-lg transition-colors group min-w-0"
          >
            <div className="size-6 rounded bg-blue-600/20 flex items-center justify-center shrink-0">
              <Globe className="size-3.5 text-blue-400" />
            </div>
            <span className="text-sm font-semibold text-zinc-100 truncate flex-1">
              {currentWorld?.name || "Select World"}
            </span>
            <ChevronDown className="size-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-56 bg-zinc-900 border-zinc-800 text-zinc-100 shadow-xl"
        >
          <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-tight">
            Worlds
          </div>
          {Object.values(worlds).map((world) => (
            <DropdownMenuItem
              key={world.id}
              onClick={() => setCurrentWorld(world.id)}
              className={`flex items-center justify-between cursor-pointer focus:bg-zinc-800 focus:text-zinc-100 px-2 py-2 rounded-md transition-colors ${
                world.id === currentWorldId ? "bg-zinc-800" : ""
              }`}
            >
              <span className="truncate flex-1">{world.name}</span>
              {world.id !== "world-default" && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setWorldToRename(world.id);
                      setNewWorldName(world.name);
                      setIsRenameDialogOpen(true);
                    }}
                    className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200"
                  >
                    <Edit2 className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        confirm(
                          `Are you sure you want to delete "${world.name}"?`,
                        )
                      ) {
                        deleteWorld(world.id);
                      }
                    }}
                    className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-red-400"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center gap-2 cursor-pointer focus:bg-zinc-800 focus:text-zinc-100 px-2 py-2 rounded-md"
          >
            <Plus className="size-4 text-blue-400" />
            <span className="text-blue-400 font-medium">New World</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New World</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              autoFocus
              placeholder="World Name"
              value={newWorldName}
              onChange={(e) => setNewWorldName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateWorld()}
              className="bg-zinc-800 border-zinc-700 focus:ring-blue-500"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateWorld}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Create World
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename World</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              autoFocus
              placeholder="World Name"
              value={newWorldName}
              onChange={(e) => setNewWorldName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRenameWorld()}
              className="bg-zinc-800 border-zinc-700 focus:ring-blue-500"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameWorld}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Rename World
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
