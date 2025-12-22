import { observable } from "@legendapp/state";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { syncObservable } from "@legendapp/state/sync";
import { client } from "../../llamacpp-client/client.gen";
import type { ServerInfo } from "./types";

interface ServerStore {
  serverUrl: string;
  serverInfo: ServerInfo | null;
  loading: boolean;
  error: string | null;
  timestamp?: number;
}

const serverStore: ServerStore = {
  serverUrl: "http://localhost:8080",
  serverInfo: null,
  loading: false,
  error: null,
};

export const serverStore$ = observable<ServerStore>(serverStore);

// Sync client base URL with state
serverStore$.serverUrl.onChange(({ value }) => {
  client.setConfig({ baseUrl: value });
});

// Initial sync
client.setConfig({ baseUrl: serverStore$.serverUrl.get() });

// Actions
export const setServerUrl = (url: string) => {
  serverStore$.serverUrl.set(url);
};

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
