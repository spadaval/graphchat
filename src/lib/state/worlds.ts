import { observable } from "@legendapp/state";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { syncObservable } from "@legendapp/state/sync";
import type { World, WorldId } from "./types";

interface WorldStore {
  worlds: Record<WorldId, World>;
  currentWorldId: WorldId | undefined;
}

const DEFAULT_WORLD_ID: WorldId = "world-default";

const initialWorldStore: WorldStore = {
  worlds: {
    [DEFAULT_WORLD_ID]: {
      id: DEFAULT_WORLD_ID,
      name: "Default World",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  currentWorldId: DEFAULT_WORLD_ID,
};

export const worldStore$ = observable<WorldStore>(initialWorldStore);

// Actions
export const createWorld = (name: string): WorldId => {
  const id: WorldId = `world-${crypto.randomUUID()}`;
  const now = new Date();

  const world: World = {
    id,
    name,
    createdAt: now,
    updatedAt: now,
  };

  worldStore$.worlds[id].set(world);
  return id;
};

export const updateWorld = (
  id: WorldId,
  updates: Partial<Omit<World, "id">>,
) => {
  const world = worldStore$.worlds[id].get();
  if (!world) return;

  worldStore$.worlds[id].assign({
    ...updates,
    updatedAt: new Date(),
  });
};

export const deleteWorld = (id: WorldId) => {
  if (id === DEFAULT_WORLD_ID) return; // Cannot delete default world

  worldStore$.worlds[id].delete();

  if (worldStore$.currentWorldId.get() === id) {
    worldStore$.currentWorldId.set(DEFAULT_WORLD_ID);
  }
};

export const setCurrentWorld = (id: WorldId) => {
  if (worldStore$.worlds[id].get()) {
    worldStore$.currentWorldId.set(id);
  }
};

// Persist state
syncObservable(worldStore$, {
  persist: {
    name: "worldStore",
    plugin: ObservablePersistLocalStorage,
  },
});

export default worldStore$;
