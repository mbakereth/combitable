// Copyright (c) 2024 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file

import type { CombiTableColumn } from "./combitabletypes";

export interface PrismaFields {
    take? : number,
    skip? : number,
    where?: {[key:string]:any},
    orderBy?: {[key:string]: "asc"|"desc"},
}
interface PrismaField {
    name: string,
    kind: string,
    type: string,
};
export interface PrismaModel {
    name: string,
    fields: readonly PrismaField[],
};
interface PrismaFieldMap {
   [key:string]:PrismaField,
}
interface PrismaModelMap {
    name: string,
    fields: PrismaFieldMap,
};
interface PrismaModelMaps {
    [key:string]: PrismaModelMap
}

interface OrderByObj {[key:string]: "asc"|"desc"}

type OrderBy = "asc"|"desc"|{[key:string]: OrderByObj|OrderBy}

/**
 * 
 * Creates and parses URLs which have the following:
 * 
 *   - `s` sort field optionally prefixed with `+` or `-`
 *   - `f` filter string which is `fieldname:value`
 *   - `t` take: return at most this number odf rows
 *   - `k` skip: skip  this number of rows
 *   - `b` back URL - all of the above, prefixed with the pathname and `?`, URL-encoded.
 *   - `i` individual ids, comma-separated
 * 
 * `b` may also contain a `b` so this is recursive
 */
export class SearchUrl {

    defaultTake;

    readonly url : URL|undefined;
    readonly body : {[key:string]:any}|undefined = undefined;
    private suffix = "";
    private idColumn = "id_pk";
    emptySearch : string|undefined = "-";

    constructor(url : URL|{[key:string]:any}, defaultTake = 20, emptySearch : string|undefined = "-") {
        this.url = url instanceof URL ? url : undefined;
        this.body = url instanceof URL ? undefined : url;
        this.defaultTake = defaultTake;
        this.emptySearch = emptySearch;
    }

    setSuffix(val : string|undefined) {
        this.suffix = val ?? "";
    }

    getSuffix() : string {
        return this.suffix;
    }

    setIdColumn(val : string) {
        this.idColumn = val;
    }

    getIdColumn() : string {
        return this.idColumn;
    }

    ///// sorting

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

    setDefaultSortCol(col : string) {
        const curCol = this.url ? this.url.searchParams.get("s"+this.suffix) : (this.body?this.body["s"+this.suffix]:undefined);
        if (curCol == null || curCol == "") {
            if (col.startsWith("-")) this.sort(col.substring(1), "descending");
            else if (col.startsWith("+")) this.sort(col.substring(1), "ascending");
            else this.sort(col, "ascending");
        }
    }

    ///// individual ids

    ids(vals : number[]|undefined) {
        if (vals == undefined || vals.length == 0) {
            if (this.url) this.url.searchParams.delete("i"+this.suffix);
            else if (this.body) this.body.i = undefined;
        } else {
            if (this.url) this.url.searchParams.set("i"+this.suffix, vals.join(","));
            else if (this.body) this.body["i"+this.suffix] = vals.join(",");

        }
    }

    getIds() : number[] {
        const curIds = this.url ? this.url.searchParams.get("i"+this.suffix) : (this.body?this.body["i"+this.suffix]:undefined);
        if (!curIds) return []
        return curIds.split(",").map((x:string) => Number(x));
    }

    ///// filtering

    setFilterComponent(col : string, value : string, label: string) {
        return this.setFilterComponent_internal(col, value, "f"+this.suffix);
    }
    setPreFilterComponent(col : string, value : string, label: string) {
        return this.setFilterComponent_internal(col, value, "pf"+this.suffix);
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

    setFilters(values: {[key:string]:string}) {
        return this.setFilters_internal(values, "f"+this.suffix);
    }
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

    getFilters() : {[key:string]:string} {
        return this.getFilters_internal("f"+this.suffix);
    }
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

    take(val : number) : void {
        if (this.url) this.url.searchParams.set("t"+this.suffix, encodeURIComponent(""+val));
        else if (this.body) this.body.t = encodeURIComponent(""+val);
    }

    skip(val : number) : void {
        if (this.url) this.url.searchParams.set("k"+this.suffix, encodeURIComponent(""+val));
        else if (this.body) this.body.k = encodeURIComponent(""+val);
    }

    encode() : string {
        if (!this.url) return ""; // doesn't make sense for body
       return encodeURIComponent(this.url.search);
    }

    setBack(back : SearchUrl, storage?: Storage) {
        if (!this.url || !back.url) return; // only supported for query params
        let partialBackUrl = back.url.pathname + back.url.search;
        if (storage) {
            let stack : string[] = []
            let stack_str = storage.getItem("history");
            if (stack_str) stack = JSON.parse(stack_str);
            stack.push(partialBackUrl)
            storage.setItem("history", JSON.stringify(stack));
        } else {
            // use query pareams
            let encodedBack = encodeURIComponent(partialBackUrl);
            this.url.searchParams.set("b", encodedBack);
            if (String(this.url).length >= 2048) {

                // reset url to justory of just 1
                this.url.searchParams.delete("b");
                partialBackUrl = back.url.pathname + back.url.search;
                let encodedBack = encodeURIComponent(partialBackUrl);
                this.url.searchParams.set("b", encodedBack);
            }
        }
    }

    popBack(storage?: Storage) : SearchUrl|null {
        if (!this.url) return null; // only supported for query params
        let back : string|null = null;
        if (storage) {
            let stack : string[] = []
            let stack_str = storage.getItem("history");
            if (!stack_str) return null;
            stack = JSON.parse(stack_str);
            if (stack.length == 0) return null;
            back = stack.pop() ?? null;
            storage.setItem("history", JSON.stringify(stack));

        } else {
            back = this.url.searchParams.get("b");
            if (!back) return null;
            back = decodeURIComponent(back);
        }
        let tempUrl = new URL(this.url.origin + back);
        let pathname = tempUrl.pathname;
        let newUrl = new URL(this.url.origin + pathname + tempUrl.search);
        return new SearchUrl(newUrl, this.defaultTake); 
    }

    getPrismaFields(models : readonly PrismaModel[], modelName: string, defaultSearch : string = "", columns: CombiTableColumn[]|undefined = undefined) : PrismaFields {

        let map : PrismaModelMaps = {}
        for (let model of models) {
            let name = model.name;
            let model1 : PrismaModelMap = {
                name: name,
                fields: {}
            };
            for (let field of model.fields) {
                model1.fields[field.name] = field; 
            }
            map[name] = model1;
        }

        let ret : PrismaFields = {}
        let { sortCol, sortDirection} = this.getSort();
        const take = this.getTake();
        if (take > 0) {
            ret.take = take;
            ret.skip = this.getSkip();
        }
        //if (!sortCol) sortCol = defaultSearch;
        if (!sortCol) {
            if (defaultSearch.substring(0,1) == "+") {
                sortCol = defaultSearch.substring(1);
                sortDirection = "ascending";
            }
            else if (defaultSearch.substring(0,1) == "-") {
                sortCol = defaultSearch.substring(1);
                sortDirection = "descending";
            } else {
                sortCol = defaultSearch;
                sortDirection = "ascending";
            }
        }
        if (sortCol != "") {
            /*ret.orderBy = {
                [sortCol]: sortDirection == "ascending" ? "asc" : "desc",
            };   */
            ret.orderBy = SearchUrl.makePrismaOrderBy(sortCol, sortDirection == "ascending" ? "asc" : "desc") 
        }
        let filters = this.getFilters();
        let prefilters = this.getPreFilters();
        let where : {[key:string]:any} = {}
        for (let filter in filters) {
            where = {...where, ...SearchUrl.makePrismaWhere(filter, filters[filter], map, modelName, this.suffix, this.emptySearch, columns)};
        }
        for (let filter in prefilters) {
            where = {...where, ...SearchUrl.makePrismaWhere(filter, prefilters[filter], map, modelName, this.suffix, this.emptySearch, columns)};
        }
        const ids = this.getIds();
        if (ids.length > 0) {
            const inClause = {[this.idColumn]: {in: ids}};
            where = {...where, ...inClause}
        }
        if (Object.keys(where).length !== 0) {
            ret.where = where;
        }        
        return ret;
    
    }

    private static makePrismaWhere(name : string, value : string, models : PrismaModelMaps, modelName: string, suffix : string="", emptySearch : string|undefined = undefined, columns: CombiTableColumn[]|undefined = undefined) : {[key:string]:any} {
        if (name == "") return {};

        const colMatch = columns?.filter((val : {[key:string]:any}) => val.col == name);
        if (colMatch && colMatch.length > 0 && colMatch[0].prismaWhere) {
            return colMatch[0].prismaWhere(value)
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
                return {[name]: {contains: value1}} ;
            } else if (isStartsWith) {
                return {[name]: {startsWith: value1}} ;
            }
            return {[name]: value1}
        }

        let where : {[key:string]:any} = {};
        if (invert) where[parts[parts.length-1]] = {not: value1};
        else if (isContains) {
            where[parts[parts.length-1]] = {contains: value1};
        }
        else where[parts[parts.length-1]] = value1;
        for (let i=parts.length-2; i>=0; --i) {
            const part = parts[i];
            where = {[part]: {is: where}};
        }
        return where;
    }

    private static makePrismaOrderBy(name : string, direction : "asc"|"desc", suffix : string="") : {[key:string]:any} {
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

    searchParamsAsString() : string {
        if (!this.url) return "";
        return this.url.searchParams.toString();

    }
}