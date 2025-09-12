import { observable } from "@legendapp/state";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { syncObservable } from "@legendapp/state/sync";
import type { ServerInfo } from "./types";

interface ServerStore {
  serverInfo: ServerInfo | null;
  loading: boolean;
  error: string | null;
  timestamp?: number;
}

const serverStore: ServerStore = {
  serverInfo: null,
  loading: false,
  error: null,
};

export const serverStore$ = observable<ServerStore>(serverStore);

// Actions
export const setServerInfo = (info: ServerInfo | null) => {
  serverStore$.serverInfo.set(info);
};

export const setLoading = (loading: boolean) => {
  serverStore$.loading.set(loading);
};

export const setError = (error: string | null) => {
  serverStore$.error.set(error);
};

export const updateServerInfo = (info: ServerInfo) => {
  serverStore$.serverInfo.set(info);
  serverStore$.timestamp.set(Date.now());
};

// Persist state
syncObservable(serverStore$, {
  persist: {
    name: "serverStore",
    plugin: ObservablePersistLocalStorage,
  },
});

export default serverStore$;
