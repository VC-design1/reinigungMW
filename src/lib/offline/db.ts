import { createStore, get, set, del, keys } from "idb-keyval";

export const offlineStore =
  typeof window !== "undefined"
    ? createStore("cleaning-app-offline", "queue")
    : undefined;

export { get, set, del, keys };
