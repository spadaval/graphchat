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
    <div className="mb-2 flex items-center gap-2 px-2 py-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-slate-900/45 px-3 py-1.5 text-left transition hover:bg-slate-800/60"
          >
            <div className="flex size-5 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-teal-400/20 to-amber-300/15">
              <Globe className="size-3 text-teal-200/90" />
            </div>
            <span className="flex-1 truncate text-sm font-medium text-slate-200">
              {currentWorld?.name || "Select World"}
            </span>
            <ChevronDown className="size-3.5 text-slate-500 transition-colors group-hover:text-slate-300" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-56 border border-slate-700 bg-slate-950/95 text-slate-100 shadow-xl backdrop-blur"
        >
          <div className="wc-title px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Worlds
          </div>
          {Object.values(worlds).map((world) => (
            <DropdownMenuItem
              key={world.id}
              onClick={() => setCurrentWorld(world.id)}
              className={`flex cursor-pointer items-center justify-between rounded-md px-2 py-2 transition-colors focus:bg-slate-800 focus:text-slate-100 ${
                world.id === currentWorldId ? "bg-slate-800/85" : ""
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
                    className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
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
                    className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-rose-300"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="bg-slate-700/80" />
          <DropdownMenuItem
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 focus:bg-slate-800 focus:text-slate-100"
          >
            <Plus className="size-4 text-teal-300" />
            <span className="font-medium text-teal-300">New World</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="border-slate-700 bg-slate-950 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="wc-title text-xl">
              Create New World
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              autoFocus
              placeholder="World Name"
              value={newWorldName}
              onChange={(e) => setNewWorldName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateWorld()}
              className="border-slate-700 bg-slate-900 focus-visible:ring-cyan-700/65"
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
              className="bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 hover:brightness-110"
            >
              Create World
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="border-slate-700 bg-slate-950 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="wc-title text-xl">Rename World</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              autoFocus
              placeholder="World Name"
              value={newWorldName}
              onChange={(e) => setNewWorldName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRenameWorld()}
              className="border-slate-700 bg-slate-900 focus-visible:ring-cyan-700/65"
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
              className="bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 hover:brightness-110"
            >
              Rename World
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
