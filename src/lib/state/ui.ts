import { observable } from "@legendapp/state";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { syncObservable } from "@legendapp/state/sync";
import type { UIPreferences } from "./types";

const uiPreferences: UIPreferences = {
  activeTab: "model",
  showDocumentPanel: false,
};

export const uiPreferences$ = observable<UIPreferences>(uiPreferences);

// Actions
export const setActiveTab = (tab: UIPreferences["activeTab"]) => {
  uiPreferences$.activeTab.set(tab);
};

export const setShowDocumentPanel = (show: boolean) => {
  uiPreferences$.showDocumentPanel.set(show);
};

// Persist state
syncObservable(uiPreferences$, {
  persist: {
    name: "uiPreferences",
    plugin: ObservablePersistLocalStorage,
  },
});

export default uiPreferences$;