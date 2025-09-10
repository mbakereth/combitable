import { writable } from 'svelte/store';

export const persistedFields = writable({ } as {[key:string]:string});
