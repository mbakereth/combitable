import { type CombiTableColumn } from "$lib/combitabletypes";
import { SvelteSet, SvelteMap } from 'svelte/reactivity';
import { persistedFields } from "$lib/stores";
import { get } from 'svelte/store';

export interface Persist {
    fromCol?: string,
    toCol?: string,
    saved: {col: string, val: any}[]
}
/**
 * Class for temporarily persisting field values when you click on a new 
 * button while you have unsaved changes.
 * 
 * You shouldn't have to use this class directly.
 */
export class PersistedFields {

    private cols : CombiTableColumn[];
    private colMap : {[key:string] : number} = {};
    private urlHref : string;

    constructor(href : string, cols : CombiTableColumn[]) {
        this.urlHref = href;
        this.cols = cols;
        this.cols.forEach((col, idx) => {this.colMap[col.col] = idx});
    }

    save(values : any[], fromCol? : string, toCol? : string) {
        //let persist : {col: string, val: any}[] = [];
        let persist : Persist = {fromCol, toCol, saved: []}
        if (values.length != this.cols.length) {
            console.log("Error: Cannot persist values in storage as length not same as number of columns");
            return;
        }
        for (let i=0; i<values.length; ++i) {
            persist.saved.push({col: this.cols[i].col, val: values[i]})
        }
        let store = get(persistedFields);
        store[this.storageKey()] = JSON.stringify(persist);
    }

    /*restore(values : any[]) {
        let store = get(persistedFields);
        const json = this.storageKey() in store ? store[this.storageKey()] : undefined;
        if (!json) return;
        const fields = JSON.parse(json) as {col: string, val: any}[];
        if (fields.length != values.length) {
            console.log("Peristed value not same number as field values - skipping")
        }
        for (let i=0; i<values.length; ++i) {
            values[i] = fields[i].val;
        }
    }*/

    get() : Persist|undefined {
        let store = get(persistedFields);
        if (!(this.storageKey() in store)) return undefined;
        let fields = JSON.parse(store[this.storageKey()]) as Persist;
        if (!fields) return undefined;
        //let ret : any[] = new Array<any>(this.cols.length);
        let ret : Persist = {fromCol: fields.fromCol, toCol: fields.toCol, saved: []}
        for (let field of fields.saved) {
            if ((field.col in this.colMap)) {
                ret.saved[this.colMap[field.col]] = field.val;
            }
        }
        return ret;
    }

    getAsMap() : {fromCol? : string, toCol? : string, fields: {[key:string]:any}}|undefined {
        let store = get(persistedFields);
        if (!(this.storageKey() in store)) return undefined;
        let persist = JSON.parse(store[this.storageKey()]) as Persist;
        if (!persist) return undefined;
        let ret : {fromCol? : string, toCol? : string, fields: {[key:string]:any}} = 
            {fromCol: persist.fromCol, toCol: persist.toCol, fields: {}};
        for (let field of persist.saved) {
            ret.fields[field.col] = field.val;
        }
        return ret;
    }

    set(persisted: Persist, col: string, value: any) {
        for (let i=0; i<persisted.saved.length; ++i) {
            if (this.cols[i].col == col) {
                persisted.saved[i] = value;
                break;
            }
        }
        this.save(persisted.saved, persisted.fromCol, persisted.toCol);
    }

    has() {
        return this.storageKey() in get(persistedFields);
    }

    delete() {
        let store = get(persistedFields);
        if (this.storageKey() in store) delete store[this.storageKey()];
    }

    private storageKey() {
        return this.urlHref;
    }

    /*private static getRecField(rec : {[key:string]:any}, col : string) {
        let obj = rec;
        const parts = col.split(".");
        for (let i=0; i<parts.length-1; ++i) {
            if (!obj || !(parts[i] in obj)) {
                return undefined;
            }
            if (Array.isArray(obj[parts[i]])) {
                obj = obj[parts[i]][0];
            } else {
                obj = obj[parts[i]];
            }
        }
        if (!obj || !(parts[parts.length-1] in obj)) return undefined;
        return obj[parts[parts.length-1]];
    }

    private static setField(rec : {[key:string]:any}, col : string, value : any) {
        let obj = rec;
        const parts = col.split(".");
        for (let i=0; i<parts.length-1; ++i) {
            if (!obj || !(parts[i] in obj)) {
                return undefined;
            }
            if (Array.isArray(obj[parts[i]])) {
                obj = obj[parts[i]][0];
            } else {
                obj = obj[parts[i]];
            }
        }
        if (!obj || !(parts[parts.length-1] in obj)) return;
        obj[parts[parts.length-1]] = value;
    }*/

}