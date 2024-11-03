// Copyright (c) 2024 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file

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

/**
 * Creates and parses URLs which have the following:
 * 
 *   - `s` sort field optionally prefixed with `+` or `-`
 *   - `f` filter string which is `fieldname:value`
 *   - `t` take: return at most this number odf rows
 *   - `k` skip: skip  this number of rows
 *   - `b` back URL - all of the above, prefixed with the pathname and `?`, URL-encoded.
 * 
 * `b` may also contain a `b` so this is recursive
 */
export class SearchUrl {

    defaultTake;

    readonly url : URL;
    readonly body : {[key:string]:any}|undefined = undefined;

    constructor(url : URL, defaultTake = 20) {
        this.url = url
        this.defaultTake = defaultTake;
    }

    ///// sorting

    sort(col : string, direction? : "ascending"|"descending") {
        const curCol = this.url.searchParams.get("s");
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
        if (this.body) {
            this.body.sort = dir + col
        } else {
            this.url.searchParams.set("s", dir + col);
        }
    }

    getSort(defaultCol : string="") : {sortCol: string, sortDirection : "ascending"|"descending"} {
        const curCol = this.url.searchParams.get("s");
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
        const curCol = this.url.searchParams.get("s");
        if (curCol == null || curCol == "") this.sort(col, "ascending");
    }

    ///// filtering

    setFilterComponent(col : string, value : string) {
        let filters = this.url.searchParams.get("f");
        if (value == "") {
            if (filters == undefined) return;
            let filtersArray = filters == "" ? [] : filters?.split(",");
            for (let i=0; i<filtersArray.length; ++i) {
                let filter = filtersArray[i]
                let components = filter.split(":");
                if (components[0] == col) {
                    filtersArray = filtersArray.filter(
                        (val : any, index : number) => index != i);
                    this.url.searchParams.set("f", filtersArray.join(","));
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
            this.url.searchParams.set("f", filtersArray.join(","));
        }
    }

    setFilters(values: {[key:string]:string}) {
        let filters = "";
        for (let key in values) {
            if (filters != "") filters += ",";
            filters += key + ":" + values[key]
        }
        if (Object.keys(values).length == 0) {
            this.url.searchParams.delete("f")
        } else {
            this.url.searchParams.set("f", filters);
        }

    }

    getFilters() : {[key:string]:string} {
        const filters = this.url.searchParams.get("f");
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
        const take = this.url.searchParams.get("t");
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
        const skip = this.url.searchParams.get("k");
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
        this.url.searchParams.set("t", encodeURIComponent(""+val));
    }

    skip(val : number) : void {
        this.url.searchParams.set("k", encodeURIComponent(""+val));
    }

    encode() : string {
        return encodeURIComponent(this.url.search);
    }

    setBack(back : SearchUrl) {
        let partialBackUrl = back.url.pathname + back.url.search;
        let encodedBack = encodeURIComponent(partialBackUrl);
        this.url.searchParams.set("b", encodedBack);
    }

    popBack() : SearchUrl|null {
        let back = this.url.searchParams.get("b");
        if (!back) return null;
        back = decodeURIComponent(back);
        let tempUrl = new URL(this.url.origin + back);
        let pathname = tempUrl.pathname;
        let newUrl = new URL(this.url.origin + pathname + tempUrl.search);
        return new SearchUrl(newUrl, this.defaultTake); 
    }

    getPrismaFields(models : readonly PrismaModel[], modelName: string, defaultSearch : string = "") : PrismaFields {

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
        if (!sortCol) sortCol = defaultSearch;
        if (sortCol != "") {
            ret.orderBy = {
                [sortCol]: sortDirection == "ascending" ? "asc" : "desc",
            };    
        }
        let filters = this.getFilters();
        let where : {[key:string]:any} = {}
        for (let filter in filters) {
            where = {...where, ...SearchUrl.makePrismaWhere(filter, filters[filter], map, modelName)};
        }
        if (Object.keys(where).length !== 0) {
            ret.where = where;
        }
        return ret;
    
    }

    static makePrismaWhere(name : string, value : string, models : PrismaModelMaps, modelName: string) : {[key:string]:any} {
        if (name == "") return {};
        const parts = name.split(".");
        let type : string|undefined = undefined;
        let modelName1 = modelName;
        for (let part of parts) {
            if (!(modelName1 in models) || !(part in models[modelName1].fields)) break;
            let field = models[modelName1].fields[part];
            if (field.kind != "object") {
                if (field.type == "Int") type = "Int";
                else if (field.type == "Float") type = "Float";
                else if (field.type == "Boolean") type = "Boolean";
                else type = "String";
                break;
            } else {
                modelName1 = field.type;
            }
        }
        if (type == undefined) {
            console.log("Warning: type for " + name + " not found - setting to String");
        }
        let value1 : string|number|boolean|null = value;
        if (type == "Boolean") {
            value1 = ["1", "yes", "y", "true", "t", "on"].includes(value.toLocaleLowerCase());
        } else if (type == "Int") {
            value1 = value == "" ? null : parseInt(value);
        } else if (type == "Float") {
            value1 = value == "" ? null : parseFloat(value);
        }
        if (parts.length == 1) return {[name]: value1}
        let where : {[key:string]:any} = {};
        where[parts[parts.length-1]] = value1;
        for (let i=parts.length-2; i>=0; --i) {
            const part = parts[i];
            where = {[part]: {is: where}};
        }
        return where;
    }


}