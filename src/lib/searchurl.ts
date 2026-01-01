// Copyright (c) 2024 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file

import type { CombiTableColumn } from "./combitabletypes";
import { env } from '$env/dynamic/public';

//declare type RuntimeModel = Omit<DMMF.Model, 'name'>;

export interface PrismaFields {
    take? : number,
    skip? : number,
    where?: {[key:string]:any},
    orderBy?: {[key:string]: "asc"|"desc"},
}
export interface PrismaField {
    name: string,
    kind: string,
    type: string,
};
export interface PrismaModel {
    name: string,
    fields: readonly PrismaField[],
};
export interface PrismaFieldMap {
   [key:string]:PrismaField,
}
export interface PrismaModelMap {
    name: string,
    fields: PrismaFieldMap,
};
export interface PrismaModelMaps {
    [key:string]: PrismaModelMap
}

interface OrderByObj {[key:string]: "asc"|"desc"}

type OrderBy = "asc"|"desc"|{[key:string]: OrderByObj|OrderBy}

const MAX_URL_LENGTH = 2048;

/**
 * 
 * Creates and parses URLs which have the following:
 * 
 *   - `s` sort field optionally prefixed with `+` or `-`
 *   - `f` filter string which is `fieldname:value`.  Multiple filters separated by comma
 *   - `t` take: return at most this number odf rows
 *   - `k` skip: skip  this number of rows
 *   - `b` back URL - all of the above, prefixed with the pathname and `?`, URL-encoded.
 *   - `i` individual ids, comma-separated
 * 
 * `b` may also contain a `b` so this is recursive
 */
export class SearchUrl {

    defaultTake;

    private _url : URL|undefined = undefined;
    get url() { return this._url };
    readonly body : {[key:string]:any}|undefined = undefined;
    suffix = "";
    idColumn = "id_pk";
    emptySearch : string|undefined = "-";
    insensitive = false;

    /**
     * Construct from a URL
     * @param url the URL to construct from (eg $page.url)
     * @param defaultTake if passed, use this for pagination size.  If omitted
     *     then `P`UBLIC_SEARCHURL_DEFAULT_TAKE` env variable is used.  
     *     If that is also not present, 20 is used
     * @param emptySearch For filtering, you can use this value to indicate
     *     filter for empty values.  Default `-`
     */
    constructor(url : URL|{[key:string]:any}, defaultTake : number|undefined = undefined, emptySearch : string|undefined = "-", backUrl : SearchUrl|undefined|null = undefined) {
        this._url = url instanceof URL ? url : undefined;
        this.body = url instanceof URL ? undefined : url;
        this.defaultTake = parseInt(env.PUBLIC_SEARCHURL_DEFAULT_TAKE ?? defaultTake ?? "20");
        this.emptySearch = emptySearch;
        this.insensitive = ['t', 'y', '1'].includes((env.PUBLIC_SEARCHURL_INSENSITIVE ?? "").toLowerCase().substring(0,1));
        if (backUrl) this.setBack(backUrl);
    }

    /**
     * You may have multiple tables in the same page, each with different filter and sort values.
     * If this is the case, give each one a name with this method.
     * @param val All URL parameters set by SearchUrl will have this appended, eg `"1"`, `"2"` etc.
     * Default is no suffix
     */
    setSuffix(val : string|undefined) {
        this.suffix = val ?? "";
    }

    /**
     * Returns the suffix set in `setSuffix`
     * @returns 
     */
    getSuffix() : string {
        return this.suffix;
    }

    /**
     * For some sorts, the id of the table is needed.  Default `id_pk`.
     * 
     * Relevant for Prisma only.  If you are not using the Prisma functionality
     * you can ignore this,
     * @param val 
     */
    setIdColumn(val : string) {
        this.idColumn = val;
    }

    /**
     * Returns the value set `setIdColumn`
     * @returns the name of the ID column
     */
    getIdColumn() : string {
        return this.idColumn;
    }

    /**
     * For Prisma searches, indicate search should be case insensitve
     * (only works where the Prisma API allows this to be set, ie in
     * `contains`).  Default false
     * @param val 
     */
    setInsensitive(val : boolean) {
        this.insensitive = val;
    }

    /**
     * Returns whether Prisma contains searches are set to insensitive
     * @returns the value set in `setInsensitive`
     */
    getInsensitive() : boolean {
        return this.insensitive;
    }

    ///// sorting

    /**
     * Sets the sort URL parameter
     * @param col the column to sort on
     * @param direction the sort direction
     */
    sort(col : string, direction? : "ascending"|"descending") {
        const curCol = this.url ? this.url.searchParams.get("s"+this.suffix) : (this.body?this.body["s"+this.suffix]:undefined);
        let sortCol = curCol;
        if (sortCol?.startsWith("+") || sortCol?.startsWith("-")) {
            sortCol = sortCol.substring(1);
        }
        if (curCol == undefined || curCol == "" || sortCol != col) {
            if (direction == undefined) direction = "ascending";
        }
        let dir = direction == "ascending" ? "+" : "-";
        if (direction == undefined && curCol != null && curCol.length > 0 && sortCol == col) {
            if (curCol.substring(0,1) == "-" && curCol.substring(1) == col) {
                dir = "+";
            } else if (curCol.substring(0,1) == "+" && curCol.substring(1) == col) {
                dir = "-";
            } else if (curCol == col) {
                dir = "-";
            }
        }
        if (this.url) this.url.searchParams.set("s"+this.suffix, dir + col);
        // else if (this.body) this.body.s = dir + col; // check
        else if (this.body) this.body["s"+this.suffix] = dir + col;
    }

    /**
     * Returns the sorting set in the URL parameters
     * @param defaultCol if there is no sort value in the URL parametersm return this,
     * @returns the sort column and direction
     */
    getSort(defaultCol : string="") : {sortCol: string, sortDirection : "ascending"|"descending"} {
        const curCol = this.url ? this.url.searchParams.get("s"+this.suffix) : (this.body?this.body["s"+this.suffix]:undefined);
        if (curCol == null) return {sortCol: defaultCol, sortDirection : "ascending"};
        if (curCol.length >= 2 && curCol.substring(0,1) == "-") {
            return {sortCol: curCol.substring(1), sortDirection: "descending"};
        } else if (curCol.length >= 2 && curCol.substring(0,1) == "+") {
            return {sortCol: curCol.substring(1), sortDirection: "ascending"};
        } else if (curCol.length >= 1 && curCol.substring(0,1) != "+" && curCol.substring(0,1) != "-") {
            return {sortCol: curCol, sortDirection: "ascending"};
        }
        return {sortCol: curCol.substring(1), sortDirection: "descending"};
    }

    /**
     * Set the default sort column, overriding what is in the constructor
     * @param col the default column to sort by
     */
    setDefaultSortCol(col : string) {
        const curCol = this.url ? this.url.searchParams.get("s"+this.suffix) : (this.body?this.body["s"+this.suffix]:undefined);
        if (curCol == null || curCol == "") {
            if (col.startsWith("-")) this.sort(col.substring(1), "descending");
            else if (col.startsWith("+")) this.sort(col.substring(1), "ascending");
            else this.sort(col, "ascending");
        }
    }

    ///// individual ids

    /**
     * Sets the URL parameters to return only these IDs instead of a value-based filter
     * @param vals the IDs to return
     */
    ids(vals : number[]|undefined) {
        if (vals == undefined || vals.length == 0) {
            if (this.url) this.url.searchParams.delete("i"+this.suffix);
            else if (this.body) this.body.i = undefined;
        } else {
            if (this.url) this.url.searchParams.set("i"+this.suffix, vals.join(","));
            else if (this.body) this.body["i"+this.suffix] = vals.join(",");

        }
    }

    /**
     * Returns the set of IDs from the URL parameters
     * @returns IDs as set in `ids()`
     */
    getIds() : number[] {
        const curIds = this.url ? this.url.searchParams.get("i"+this.suffix) : (this.body?this.body["i"+this.suffix]:undefined);
        if (!curIds) return []
        return curIds.split(",").map((x:string) => Number(x));
    }

    ///// filtering

    /**
     * You can filter on multiple values (ANDed).  Add the given condition to the filters
     * @param col filter on this column
     * @param value the column must have this value (can include `*`)
     */
    setFilterComponent(col : string, value : string) {
        this.setFilterComponent_internal(col, value, "f"+this.suffix);
    }

    /**
     * Pre-filters are applied regardless of what is in the regular filter set.
     * Use this if you have a table that should only ever display a subset
     * of the data even when there is no user-defined filter
     * @param col column to filter by
     * @param value the column must have this value (can include `*`)
     */
    setPreFilterComponent(col : string, value : string) {
        this.setFilterComponent_internal(col, value, "pf"+this.suffix);
    }

    private setFilterComponent_internal(col : string, value : string, label: string) {
        let filters : string|undefined = this.url ? this.url.searchParams.get(label) : (this.body ? this.body[label] : undefined);
        if (value == "") {
            if (filters == undefined) return;
            let filtersArray = filters == "" ? [] : filters?.split(",");
            for (let i=0; i<filtersArray.length; ++i) {
                let filter = filtersArray[i]
                let components = filter.split(":");
                if (components[0] == col) {
                    filtersArray = filtersArray.filter(
                        (val : any, index : number) => index != i);
                    if (this.url) this.url.searchParams.set(label, filtersArray.join(","));
                    else if (this.body) this.body[label] = filtersArray.join(",");
                    return;
                }
            }
        } else {
            value = value.replace(":", "");
            value = value.replace(",", "");
            if (filters == undefined) filters = "";
            let found = false;
            let filtersArray = filters == "" ? [] : filters?.split(",");
            for (let i=0; i<filtersArray.length; ++i) {
                let filter = filtersArray[i]
                let components = filter.split(":");
                if (components[0] == col) {
                    filtersArray[i] = col + ":" + value;
                    found = true;
                    break;
                }
            }
            if (!found) {
                filtersArray.push(col + ":" + value)
            }    
            if (this.url) this.url.searchParams.set(label, filtersArray.join(","));
            else if (this.body) this.body[label] =  filtersArray.join(",");
        }
    }

    /**
     * Set miltiple filters at once
     * @param values column/value pairs
     * @returns 
     */
    setFilters(values: {[key:string]:string}) {
        return this.setFilters_internal(values, "f"+this.suffix);
    }

    /**
     * Set miltiple pre-filters at once
     * @param values column/value pairs
     * @returns 
     */
    setPreFilters(values: {[key:string]:string}) {
        return this.setFilters_internal(values, "pf"+this.suffix);
    }

    private setFilters_internal(values: {[key:string]:string}, label: string) {
        let filters = "";
        for (let key in values) {
            if (filters != "") filters += ",";
            filters += key + ":" + values[key]
        }
        if (Object.keys(values).length == 0) {
            if (this.url) this.url.searchParams.delete(label);
            else if (this.body) delete this.body[label];
        } else {
            if (this.url) this.url.searchParams.set(label, filters);
            else if (this.body) this.body[label] = filters;
        }

    }

    /**
     * Returns all the set filöters
     * @returns filters are column/value pairs
     */
    getFilters() : {[key:string]:string} {
        return this.getFilters_internal("f"+this.suffix);
    }

    /**
     * Returns all the set pre-filöters
     * @returns pre-filters are column/value pairs
     */
    getPreFilters() : {[key:string]:string} {
        return this.getFilters_internal("pf"+this.suffix);
    }

    private getFilters_internal(label: string) : {[key:string]:string} {
        const filters = this.url ? this.url.searchParams.get(label) : (this.body? this.body[label] : undefined);
        if (filters == undefined) return {};
        let filtersArray = filters?.split(",");
        let ret : {[key:string]:string} = {}
        for (let filter of filtersArray) {
            let components = filter.split(":");
            if (components.length == 2) {
                ret[components[0]] = components[1];
            }
        }
        return ret;
    }

    ///// take and skip

    /**
     * Returns the take parameter in the URL which is the maximum number of
     * results to return.  (Prisma `take` value)
     * @returns the number of rows to return as set in the URL params
     */
    getTake() : number {
        const take = this.url ? this.url.searchParams.get("t"+this.suffix) : (this.body?this.body["t"+this.suffix]:undefined);
        if (take) {
            try {
                return Number(take);
            } catch(e) {
                console.log("Warning: trying to take non-numeric " + take + " rows")
            }
        }
        return this.defaultTake;
    }

    /**
     * Returns the take parameter in the URL which is the maximum number of
     * results skip before returning the `take` number of rows. 
     * (Prisma `skip` value)
     * @returns the number of rows to skip as set in the URL params
     */
    getSkip() : number {
        const skip = this.url ? this.url.searchParams.get("k"+this.suffix) : (this.body?this.body["k"+this.suffix]:undefined);
        if (skip) {
            try {
                return Number(skip);
            } catch(e) {
                console.log("Warning: trying to skip non-numeric " + skip + " rows")
            }
        }
        return 0;
    }

    /**
     * Puts the maximum number of rows to return in the URL params (Prisma `take`)
     * @param val the number of rows to return
     */
    take(val : number) : void {
        if (this.url) this.url.searchParams.set("t"+this.suffix, encodeURIComponent(""+val));
        else if (this.body) this.body.t = encodeURIComponent(""+val);
    }

    /**
     * Puts the number of rows to skip in the URL params (Prisma `skip`)
     * @param val the number of rows to skip
     */
    skip(val : number) : void {
        if (this.url) this.url.searchParams.set("k"+this.suffix, encodeURIComponent(""+val));
        else if (this.body) this.body.k = encodeURIComponent(""+val);
    }

    /**
     * Returns the URL-encoded search params
     * @returns URL-encoded search params
     */
    encode() : string {
        if (!this.url) return ""; // doesn't make sense for body
       return encodeURIComponent(this.url.search);
    }

    /**
     * You can inplement go-to-previous-url functionality by setting the
     * `b` field in the URL params to a `SearchUrl` using this method.
     * 
     * This `SearchUrl` can then be popped of with `popBack`.
     * 
     * Back URLs are chained so you can keep a stain by repeatedly calling
     * `setBack` and `getBack`
     * @param back the url to set as back (eg the current URL)
     */
    setBack(back : SearchUrl) {
        if (!this.url || !back.url) return; // only supported for query params
        let partialBackUrl = back.url.pathname + back.url.search;
            // use query pareams
            let encodedBack = encodeURIComponent(partialBackUrl);
            this.url.searchParams.set("b", encodedBack);
            if (String(this.url).length >= parseInt(env.PUBLIC_SEARCHURL_MAX_LENGTH ?? ""+MAX_URL_LENGTH)) {
                this.clipBack();
            }
    }

    private clipBack() {
        while (String(this.url).length >= parseInt(env.PUBLIC_SEARCHURL_MAX_LENGTH ?? ""+MAX_URL_LENGTH)) {
            //console.log("Clipping", String(this.url), String(this.url).length)
            let back : SearchUrl|null = this;
            if (!back) return;
            let stack : SearchUrl[] = [];
            while (back) {
                stack.push(back);
                back = back.popBack();
            }
            if (stack.length == 0) return;
            stack.pop();
            if (stack.length == 0) return;        
            stack[stack.length-1].url?.searchParams.delete("b");
            for (let i=stack.length-2; i>=0; --i) {
                stack[i].setBack(stack[i+1])
            }
            this._url = stack[0]._url;
        }

    }

    /**
     * See `setBack` 
     * @returns 
     */
    popBack() : SearchUrl|null {
        if (!this.url) return null; // only supported for query params
        let back : string|null = null;
        back = this.url.searchParams.get("b");
        if (!back) return null;
            back = decodeURIComponent(back);
        let tempUrl = new URL(this.url.origin + back);
        let pathname = tempUrl.pathname;
        let newUrl = new URL(this.url.origin + pathname + tempUrl.search);
        return new SearchUrl(newUrl, this.defaultTake); 
    }

    static makePrismaWhere(name : string, value : string, models : PrismaModelMaps, modelName: string, suffix : string="", emptySearch : string|undefined = undefined, columns: CombiTableColumn[]|undefined = undefined, insensitive : boolean = false) : {[key:string]:any} {
        if (name == "") return {};
        const colMatch = columns?.filter((val : {[key:string]:any}) => val.col == name);
        if (colMatch && colMatch.length > 0 && colMatch[0].prismaWhere) {
            return colMatch[0].prismaWhere(value)
        }
        if (colMatch && colMatch.length > 0 && colMatch[0].prismaWhereIgnore) {
            return {}
        }
        

        const parts = name.split(".");
        let type : string|undefined = undefined;
        let modelName1 = modelName;
        let invert = false;
        if (value.startsWith("!") && value.length > 1) {
            value = value.substring(1);
            invert = true;
        }
        for (let part of parts) {
            if (!(modelName1 in models) || !(part in models[modelName1].fields)) break;
            let field = models[modelName1].fields[part];
            if (field.kind != "object") {
                if (field.type == "Int") type = "Int";
                else if (field.type == "Float") type = "Float";
                else if (field.type == "Boolean") type = "Boolean";
                else if (field.type == "DateTime") type = "DateTime";
                else type = "String";
                break;
            } else {
                modelName1 = field.type;
            }
        }
        let isContains = false;
        let isStartsWith = false;
        if (type == undefined) {
            console.log("Warning: type for " + name + " not found - setting to String");
        }
        let value1 : string|number|boolean|Date|null = value;
        if (type == "Boolean") {
            value1 = ["1", "yes", "y", "true", "t"+suffix, "on"].includes(value.toLocaleLowerCase());
        } else if (type == "Int") {
            value1 = value == "" ? null : parseInt(value);
        } else if (type == "Float") {
            value1 = value == "" ? null : parseFloat(value);
        } else if (type == "DateTime") {
            value1 = value == "" ? null : new Date(value);
        } else {
            if (value1.length > 1 && value1.endsWith("*") && !(value1.substring(0, value1.length-1).includes("*"))) {
                // escape special characters _ and %
                value1 = value1.replaceAll('_', '\\').replaceAll('%', '\\');
                // replace * with % for wildcard
                value1 = value1.replaceAll('*', '%');
                isStartsWith = true;
            } else if (value1.includes("*") && !invert) {
                // escape special characters _ and %
                value1 = value1.replaceAll('_', '\\').replaceAll('%', '\\');
                // replace * with % for wildcard
                value1 = value1.replaceAll('*', '%');
                isContains = true;
            } else if (emptySearch && value1 == emptySearch) {
                value1 = null;
            }
        }

        if (parts.length == 1) {
            if (invert) return {[name]: {not: value1}} ;
            if (isContains) {
                if (insensitive) return {[name]: {contains: value1, mode: 'insensitive'}} ;
                return {[name]: {contains: value1}} ;
            } else if (isStartsWith) {
                if (insensitive) return {[name]: {startsWith: value1, mode: 'insensitive'}} ;
                return {[name]: {startsWith: value1}} ;
            }
            return {[name]: value1}
        }

        let where : {[key:string]:any} = {};
        if (invert) where[parts[parts.length-1]] = {not: value1};
        else if (isContains) {
            if (insensitive) where[parts[parts.length-1]] = {contains: value1, mode: 'insensitive'};
            else where[parts[parts.length-1]] = {contains: value1};
        }
        else where[parts[parts.length-1]] = value1;
        for (let i=parts.length-2; i>=0; --i) {
            const part = parts[i];
            where = {[part]: {is: where}};
        }
        return where;
    }

     static makePrismaOrderBy(name : string, direction : "asc"|"desc", suffix : string="") : {[key:string]:any} {
        if (name == "") return {};
        const parts = name.split(".");
        let type : string|undefined = undefined;
        if (parts.length == 1) return {[name]: direction};
        let orderBy : OrderBy = {[parts[parts.length-1]]: direction};
        for (let i = parts.length-2; i>=0; --i) {
            const part = parts[i];
            orderBy = {[part]: orderBy}
        }
        return orderBy;
    }

    /**
     * Convenience function to retun the URL search params as a string
     * @returns string representation of URL search params
     */
    searchParamsAsString() : string {
        if (!this.url) return "";
        return this.url.searchParams.toString();

    }
}