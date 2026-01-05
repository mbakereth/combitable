// Copyright (c) 2024 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file

import type { RequestEvent } from '@sveltejs/kit';

export class Ops {
    static isInteger(val : string|undefined|null|number|boolean) {
        if (typeof(val) == "boolean") return false;
        if (typeof(val) == "number") {
            return Math.floor(val) == val;
        }
        if (!val) return false;
        return /^ *([+-]?[0-9]+) *$/.test(val);
    }
    static isFloat(val : string|undefined|null|number|boolean) {
        if (typeof(val) == "boolean") return false;
        if (typeof(val) == "number") return true;
        if (!val) return false;
        return /^ *[-+]?([0-9]*[.])?[0-9]+([eE][-+]?\d+)? *$/.test(val);
    }

    static isDate(val : string|undefined|null, dateFormat="yyyy-mm-dd") {
        if (!val) return false;
        if (dateFormat == "yyyy-mm-dd") return /^([0-9][0-9][0-9][0-9][/\.-][0-9][0-9]?[/\.-][0-9][0-9]?)$/.test(val.toString())
        return /^([0-9][0-9]?[/\.-][0-9][0-9]?[/\.-][0-9][0-9][0-9][0-9])$/.test(val.toString())
    }

    static isDateMonth(val : string|undefined|null, dateFormat="yyyy-mm-dd") {
        if (!val) return false;
        if (dateFormat == "yyyy-mm-dd") return /^([0-9][0-9][0-9][0-9][/\.-][0-9][0-9]?)$/.test(val.toString())
        return /^([0-9][0-9]?[/\.-][0-9][0-9][0-9][0-9])$/.test(val.toString())
    }

    static isDateYear(val : string|undefined|null, dateFormat="yyyy-mm-dd") {
        if (!val) return false;
        return /^([0-9][0-9][0-9][0-9])$/.test(val.toString())
    }

    static isPartialDate(val : string|undefined|null, dateFormat="yyyy-mm-dd") {
        if (!val) return false;
        return this.isDate(val, dateFormat) || this.isDateMonth(val, dateFormat) || this.isDateYear(val, dateFormat)
    }

    static isEmpty(val : string|undefined|null|boolean|number) {
        if (typeof(val) == "boolean" || typeof(val) == "number") return false;
        return val === undefined || val === null || val == "";
    }

    static errorMessage(e : any) : string {
        return typeof(e) == "object" && e && "message" in e ? e.message : "Unknown error";
    }
}

export class ObjectIterator implements IterableIterator<[string, string]> {
    values : string[] = [];
    keys: string[] = [];
    i = 0;
    
    constructor(values : {[key:string]:string} ) {
        for (let key in values) {
            this.keys.push(key);
            this.values.push(values[key]);
        }
    }

    public next(): IteratorResult<[string,string]> {
        if (this.i == this.values.length) { return {done: true, value: ["",""]}};
        const ret = [this.keys[this.i], this.values[this.i]];
        this.i++;
        return {done: false, value: [ret[0], ret[1]]};
    }

    [Symbol.iterator]() {
         return this;
    }
}

export class KeyIterator implements IterableIterator<string> {
    values : string[] = [];
    keys: string[] = [];
    i = 0;
    
    constructor(values : {[key:string]:string} ) {
        for (let key in values) {
                this.keys.push(key);
                this.values.push(values[key]);
        }
    }

    public next(): IteratorResult<string> {
        if (this.i == this.values.length) { return {done: true, value: ["",""]}};
        const ret = [this.keys[this.i], this.values[this.i]];
        this.i++;
        return {done: false, value: ret[0]};
    }

    [Symbol.iterator]() {
         return this;
    }
}

export class JsonOrFormData {
    private formData : FormData|undefined;
    private jsonData : {[key:string] : string}|undefined;
    private clone : boolean;
    constructor(clone = false) {
        this.clone = clone;
    }
    
    async loadData(event : RequestEvent) {
        if (!event.request?.body) {
            return;
        }
        const contentType = event.request.headers.get("content-type");
        if (contentType == "application/json") {
            this.jsonData = this.clone ? await event.request?.clone()?.json() :
                await event.request?.json();
        } else if (contentType == "application/x-www-form-urlencoded" || contentType?.startsWith("multipart/form-data")) {
            this.formData = this.clone ? await event.request.clone().formData() :
                await event.request.formData();
        }

    }

    get(param : string) : string|undefined {
        if (this.jsonData) return this.jsonData[param]; 
        if (this.formData) {
            const formValue = this.formData.get(param);
            if (formValue && typeof formValue == "string") return formValue;
        }
        return undefined;
    } 

    getAsString(param : string) : string|undefined {
        return this.get(param);
    }

    getAsBoolean(param : string) : boolean|undefined {
        const val = this.get(param);
        if (val == undefined) return undefined;
        const l = val.toLowerCase();
        return l == "t" || l == "true" || l == "1" || l == "y" || l == "yes" || l == "on";
    }

    getAsNumber(param : string) : number|undefined {
        const val = this.get(param);
        if (val == undefined) return undefined;
            return Number(val);
    }

    has(param : string) : boolean {
        return ((this.jsonData && param in this.jsonData)
            || this.formData && this.formData.has(param)) ?? false;
    }

    keys() : IterableIterator<string> {
        if (this.jsonData) return new KeyIterator(this.jsonData);
        if (this.formData) return this.formData.keys();
        return new KeyIterator({});
    }

    toObject() : {[key:string]:string} {
        if (this.jsonData) return this.jsonData;
        if (this.formData) {
            let data : {[key:string]:string} = {};
            for (let pair of this.formData.entries()) {
                data[pair[0]] = pair[1]?.toString()??"";
            }
            return data;
        }
        return {};
    }
}
