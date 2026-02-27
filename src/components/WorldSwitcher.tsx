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
    <div className="mb-2 flex items-center gap-2 px-3 py-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group flex min-w-0 flex-1 items-center gap-3 rounded-md border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-left transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-800/40"
          >
            <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-zinc-800">
              <Globe className="size-3 text-zinc-400" />
            </div>
            <span className="flex-1 truncate text-[11px] font-bold uppercase tracking-widest text-zinc-300">
              {currentWorld?.name || "Select World"}
            </span>
            <ChevronDown className="size-3.5 text-zinc-500 transition-colors group-hover:text-zinc-300" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-64 border border-zinc-800 bg-[#0d0d0d] text-zinc-300 shadow-2xl p-1"
        >
          <div className="px-3 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] border-b border-zinc-800/50 mb-1">
            Worlds
          </div>
          {Object.values(worlds).map((world) => (
            <DropdownMenuItem
              key={world.id}
              onClick={() => setCurrentWorld(world.id)}
              className={`flex cursor-pointer items-center justify-between rounded px-3 py-2.5 text-[12px] font-medium transition-all focus:bg-emerald-500/5 ${
                world.id === currentWorldId
                  ? "bg-emerald-500/5 text-emerald-400 font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {world.id === currentWorldId && (
                  <div className="h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                )}
                <span className="truncate">{world.name}</span>
              </div>
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
                    className="rounded p-1 text-zinc-600 hover:text-emerald-400 transition-colors"
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
                    className="rounded p-1 text-zinc-600 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="bg-zinc-800/50 mx-1 my-1" />
          <DropdownMenuItem
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex cursor-pointer items-center gap-2 rounded px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 hover:text-emerald-400 focus:bg-emerald-500/5 transition-colors"
          >
            <Plus className="size-3.5" />
            <span>New World</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="border-zinc-800 bg-[#0a0a0a] text-zinc-300 sm:max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-500">
              Create New World
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <Input
              autoFocus
              placeholder="World Name..."
              value={newWorldName}
              onChange={(e) => setNewWorldName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateWorld()}
              className="h-9 border-zinc-800 bg-zinc-900/50 text-zinc-200 placeholder:text-zinc-800 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500/50 font-mono text-[11px]"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsCreateDialogOpen(false)}
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-zinc-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateWorld}
              className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500/80 text-[10px] font-bold uppercase tracking-widest rounded px-6 hover:bg-emerald-500/20 transition-all"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="border-zinc-800 bg-[#0a0a0a] text-zinc-300 sm:max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-500">
              Rename World
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <Input
              autoFocus
              placeholder="New name..."
              value={newWorldName}
              onChange={(e) => setNewWorldName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRenameWorld()}
              className="h-9 border-zinc-800 bg-zinc-900/50 text-zinc-200 placeholder:text-zinc-800 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500/50 font-mono text-[11px]"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsRenameDialogOpen(false)}
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-zinc-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameWorld}
              className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500/80 text-[10px] font-bold uppercase tracking-widest rounded px-6 hover:bg-emerald-500/20 transition-all"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
