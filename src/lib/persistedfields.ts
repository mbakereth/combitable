import { type CombiTableColumn } from "$lib/combitabletypes";
import { SvelteSet, SvelteMap } from 'svelte/reactivity';
import { persistedFields } from "$lib/stores";
import { get } from 'svelte/store';


export class PersistedFields {

    private cols : CombiTableColumn[];
    private colMap : {[key:string] : number} = {};
    private url : URL;

    constructor(url : URL, cols : CombiTableColumn[]) {
        this.url = url;
        this.cols = cols;
        this.cols.forEach((col, idx) => {this.colMap[col.col] = idx});
    }

    save(values : any[]) {
        let persist : {col: string, val: any}[] = [];
        if (values.length != this.cols.length) {
            console.log("Error: Cannot persist values in storage as length not same as number of columns");
            return;
        }
        for (let i=0; i<values.length; ++i) {
            persist.push({col: this.cols[i].col, val: values[i]})
        }
        let store = get(persistedFields);
        store[this.storageKey()] = JSON.stringify(persist);
    }

    restore(values : any[]) {
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
    }

    get() : any[]|undefined {
        let store = get(persistedFields);
        if (!(this.storageKey() in store)) return undefined;
        let fields = JSON.parse(store[this.storageKey()]) as {val: any, col: string}[];
        if (!fields) return undefined;
        let ret : any[] = new Array<any>(this.cols.length);
        for (let field of fields) {
            if ((field.col in this.colMap)) {
                ret[this.colMap[field.col]] = field.val;
            }
        }
        return ret;
    }

    getAsMap() : {[key:string]:any}|undefined {
        let store = get(persistedFields);
        if (!(this.storageKey() in store)) return undefined;
        let fields = JSON.parse(store[this.storageKey()]) as {val: any, col: string}[];
        if (!fields) return undefined;
        let ret : {[key:string]:any} = {};
        for (let field of fields) {
            ret[field.col] = field.val;
        }
        return ret;
    }

    has() {
        return this.storageKey() in get(persistedFields);
    }

    delete() {
        let store = get(persistedFields);
        if (this.storageKey() in store) delete store[this.storageKey()];
    }

    private storageKey() {
        return this.url.href;
    }

    private static getRecField(rec : {[key:string]:any}, col : string) {
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
    }

}