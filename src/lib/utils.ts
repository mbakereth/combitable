import { json, type RequestEvent } from '@sveltejs/kit';
import type { CombiTableColumn, ColumnType } from '$lib/combitabletypes';
import { env } from '$env/dynamic/public';
import { PartialDateType } from '$lib/types'
/**
 * Provides autocomplete functionality with Prisma
 * 
 * This is designed to use inside a `+server.ts` file in a route which
 * has parameters `table` and `col` 
 * (for example `routes/autocomplete/[table][col]`).  It returns 
 * an array of matches starting with the text in the `t` query parameter.
 * The maximum number returned can be customised in the 
 * `PUBLIC_COMBITABLE_AUTOCOMPLETE_TAKE` variable with a default of 10.
 *    
 *  ```ts
 *  const prisma = new PrismaClient();
 *  return await autocomplete(prisma, event, {god: ["**"]});
 * ```
 * 
 * The third parameter is the tables and columns to arrow (we wouldn't want,
 * for example, someone to call it with a table of user).
 * 
 * The format of the this parameter is an object whose keys are names of
 * tables (Prisma lowercase version) and whose valoues is an array of
 * allowed columns.  If that array is a single item and it is * then all
 * columns are allowed.  If it is ** then all columns on related tables
 * are allowed as well (eg "god.father.name").
 * 
 * @param client prisma client
 * @param event the Sveltelkit request event
 * @param cols tables and columns to allow (see description)
 * @returns a JSON array of results
 */
export async function autocomplete(client : any, event : RequestEvent, cols? : {[key:string]: string[]}, insensitive=false, maxItems=10) : Promise<Response> {
    const table = event.params.table;
    const col = event.params.col;

    if (table && col && cols ) {
        if (!(table in cols)) {
            return json({error: "Invalid table"},
                {status: 400}
            );
        }
        const t = cols[table];
        if (col && !(t.includes(col)) && !(t.length == 1 && (t[0] == "*"  || t[0] == "**")) ) {
            return json({error: "Invalid column"},
                {status: 400}
            );
        }
        if (col && (t.length == 1 && t[0] == "*" && col.includes(".")) ) {
            return json({error: "Invalid column"},
                {status: 400}
            );
        }
    }

    let text = event.url.searchParams.get("t");
    if (!text || text == "") {
        return json([])
    }

    if (!table || !col) {
        return json({error: "Table and/or col missing"},
            {status: 400}
        )
    }
    const parts = (col??"").split(".")
    let include : {[key:string]:any}|undefined = undefined;
    let select : {[key:string]:any}|undefined = undefined;
    const isPostgres = process.env["DATABASE_URL"]?.startsWith("postgres");
    const mode = isPostgres ? (insensitive ? {mode: "insensitive"} : {}) : {};
    let where : {[key:string]:any} = {[parts[parts.length-1]]: {startsWith: text, ...mode}};
    
    if (parts.length == 1) {
        select = {[parts[parts.length-1]]: true};
    } else {
        include = {select: {[parts[parts.length-1]]: true}};
        for (let i=parts.length-2; i>=0; --i) {
            include = {[parts[i]]: include};
            where = {[parts[i]]: where}; 
        }
    }
    const distinct = (parts.length == 1)  ? [parts[0]] : undefined;
    const query : {[key:string]:any} = {
        distinct,
        include,
        where,
        take: env.PUBLIC_COMBITABLE_AUTOCOMPLETE_TAKE ? parseInt(env.PUBLIC_COMBITABLE_AUTOCOMPLETE_TAKE) :  maxItems,
    };
    try {
            const res : {[key:string]:any}[] = await client[table??""].findMany(query); 
            const ret : string[] = res.map((el) => {
                let obj = el;
                for (let i=0; i<parts.length-1; ++i) {
                    obj = el[parts[i]];
                }
                return obj[parts[parts.length-1]];
            });
            return json(ret);
    } catch (e : any) {
        console.log(e);
        return json({error: e.message ?? "Unknown error"},
            {status: 500}
        )
    }
}

export function stringIsDate(val : string, dateFormat="yyyy-mm-dd") {
    if (dateFormat == "yyyy-mm-dd") return /^( *[0-9][0-9][0-9][0-9][/\.-][0-9][0-9]?[/\.-][0-9][0-9]? *?)$/.test(val);
    return /^( *[0-9][0-9]?[/\.-][0-9][0-9]?[/\.-][0-9][0-9][0-9][0-9] *?)$/.test(val) ;
}

export function stringIsDateMonth(val : string, dateFormat="yyyy-mm-dd") {
    return /^( *[0-9][0-9]?[/\.-][0-9][0-9][0-9][0-9] *?)$/.test(val) ;
}

export function stringIsDateYear(val : string, dateFormat="yyyy-mm-dd") {
    return /^( *[0-9][0-9][0-9][0-9] *?)$/.test(val);
}

export function stringIsPartialDate(val : string, dateFormat="yyyy-mm-dd") {
    return stringIsDate(val, dateFormat) || stringIsDateMonth(val, dateFormat) || stringIsDateYear(val, dateFormat);
}

export function validateField(col : CombiTableColumn, value: string|number|Date|null|boolean|undefined, dateFormat = "yyyy-mm-dd") {
    let error : string|undefined = undefined;
    if (!col.nullable && !col.readOnly && col.type != "string" && (value === "" || value === undefined || value === null)) {
        error = "Must enter a value for " + col.name;
    } else if (value) {
        if (col.type == "integer" && typeof(value) == "string") {
            if (!/^ *([+-]?[0-9]+) *$/.test(value)) {
                error = col.name + " must be an integer";
            }
        } else if (col.type == "float" && typeof(value) == "string") {
            if (!/^ *[-+]?([0-9]*[.])?[0-9]+([eE][-+]?\d+)? *$/.test(value)) {
                error = col.name + " must be a number";
            }
        } else if (col.type == "date" && typeof(value) == "string") {
            if (!stringIsDate(value, dateFormat)) {
                error = col.name + " must be in the form " + dateFormat;
            }

        } else if (col.type == "partialdate" && typeof(value) == "string") {
            if (!stringIsPartialDate(value, dateFormat)) {
                error = col.name + " must be in the form " + dateFormat;
            }

        }
    } else if (col.type == "datetime" && typeof(value) == "string") {
        if (!/^( *[0-9][0-9][0-9][0-9]-[0-9][0-9]?-[0-9][0-9](T[0-9][0-9]?:[0-9][0-9]?:[0-9][0-9]?(\.[0-9]*)?[A-Za-z]?)? *?)$/.test(value)) {
            error = col.name + " must be in the form yyyy-mm-ddThh:99:ss.sssZ";
        }
    }
    return error;
}

/////
// Functions to fetch data from a variable of arbitrary type as a given type

export function asBoolean(val : string|number|boolean|undefined) : boolean {
    if (val == undefined) return false;
    if (typeof(val) == "boolean") return val;
    if (typeof(val) == "number") return val > 0;
    if (typeof(val) == "string") {
        val = val.toLowerCase();
        return val == "yes" || val == "y" || val == "t" || val == "true" || val == "on";
    }
    return false;
}
export function asBooleanOrUndefined(val : string|number|boolean|undefined) : boolean|undefined {
    if (typeof(val) == "string" && val == "") return undefined;
    return val == undefined ? undefined : asBoolean(val);
}

export function asNumber(val : string|number|boolean|undefined) : number {
    if (val == undefined) return 0;
    if (typeof(val) == "boolean") return val ? 1 : 0;
    if (typeof(val) == "number") return val;
    if (typeof(val) == "string") {
        return Number(val)
    }
    if (typeof(val) == "object") {
        if ("value" in val) return Number(val["value"])
        if ("name" in val) return Number(val["name"])
    }
    return Number(val);
}
export function asNumberOrUndefined(val : string|number|boolean|undefined) : number|undefined {
    if (typeof(val) == "string" && val == "") return undefined;
    return val == undefined ? undefined : asNumber(val);
}

export function asString(val : string|number|boolean|undefined|Date, type : ColumnType|undefined=undefined, dateFormat="yyyy-mm-dd", dateType: PartialDateType=PartialDateType.date) : string {
    if (val == undefined) return "";
    if (typeof(val) == "boolean") return val ? "Yes" : "No";
    if (typeof(val) == "number") return val+"";
    if (typeof(val) == "string") return val;
    if (val instanceof Date && type=="date") printDate(val, dateFormat)
    if (val instanceof Date && type=="date") printPartialDate(val, dateType, dateFormat)
    if (val instanceof Date) return printDate(val, dateFormat);
    if (typeof(val) == "object" && "name" in val) return val["name"];
    return ""+val;
}
export function asStringOrUndefined(val : string|number|boolean|undefined, type : ColumnType|undefined=undefined) : string|undefined {
    if (typeof(val) == "string" && val == "") return undefined;
    return val == undefined ? undefined : asString(val, type);
}

export function printDate(date : Date|undefined|null|string, dateFormat: string, nullValue="-") : string {
    if (!date) return nullValue;
    if (typeof(date) == "string") return date;
    let d = 0;
    let m = 1;
    let y = 2;
    if (dateFormat == "yyyy-mm-dd") {
        d = 2;
        m = 1;
        y = 0;
    } else if (dateFormat == "mm-dd-yyyy") {
        d = 1;
        m = 0;
        y = 2;
    }
    const parts = [String(date.getDate()).padStart(2, '0'), String((date.getMonth())+1).padStart(2, '0'), String(date.getFullYear())]
    let s = parts[d] + "-" + parts[m] + "-" + parts[y];
    //let s = String(date.getDate()).padStart(2, '0') + "-" + String((date.getMonth())+1).padStart(2, '0') + "-" + String(date.getFullYear())
    return s;
}

export function printPartialDate(date : Date|undefined|null, type: PartialDateType, dateFormat="yyyy-mm-dd") : string {
    if (!date) return "-";
    if (type == PartialDateType.year) {
        return String(date.getFullYear());
    } else if (type == PartialDateType.month) {
        return String((date.getMonth())+1).padStart(2, '0') + "-" + String(date.getFullYear()) 
    } else if (dateFormat == "yyyy-mm-dd") {
        return String(date.getFullYear()) + "-" + String((date.getMonth())+1).padStart(2, '0') + "-" + String(date.getDate()).padStart(2, '0')
    }
    if (dateFormat == "mm-dd-yyyy") {
        return String(date.getMonth()).padStart(2, '0') + "-" + String((date.getDate())+1).padStart(2, '0') + "-" + String(date.getFullYear())
    }
    return String(date.getDate()).padStart(2, '0') + "-" + String((date.getMonth())+1).padStart(2, '0') + "-" + String(date.getFullYear())
}

function parseISODate(s : String) {
    let b = s.split(/\D+/);
    return new Date(Date.UTC(parseInt(b[0]), parseInt(b[1])-1, parseInt(b[2]), 0, 0, 0));
}

export function parseDate(val : string, dateFormat="yyyy-mm-dd") : Date {
    val = val.trim();
    if (val.indexOf("T") > 0) {
        val = val.split("T")[0];
        return parseISODate(val);
    }
    const parts = val.trim().split("-");
    if (parts.length != 3) throw Error("Date " + val + " should be dd-mm-yyyy");
    let dateStr = parts[2] + "-" + parts[1] + "-" + parts[0];
    if (dateFormat == "yyyy-mm-dd") {
        dateStr = parts[0] + "-" + parts[1] + "-" + parts[2];
    } else if (dateFormat == "mm-dd-yyyy") {
        dateStr = parts[1] + "-" + parts[0] + "-" + parts[2];
    }
    return parseISODate(dateStr );
}

export function splitPartialDate(val : string, dateFormat="yyyy-mm-dd") : {year: number, month: number|null, day: number|null} {
    if (dateFormat == "yyyy-mm-dd") {
        const parts = val.split("-");
        const year = parseInt(parts[0]);
        const month = parts.length < 2 ? null : parseInt(parts[1])-1;
        const day = parts.length < 3 ? null : parseInt(parts[2]);
        return {year, month, day}
    } else if (dateFormat == "dd-mm-yyyy") {
        const parts = val.split("-");
        if (parts.length == 1) {
            return {year: parseInt(parts[0]), month: null, day: null}
        } else if (parts.length == 2) {
            return {year: parseInt(parts[1]), month: parseInt(parts[0])-1, day: null}
        } else {
            return {year: parseInt(parts[2]), month: parseInt(parts[1])-1, day: parseInt(parts[0])}
        }
    } else { // mm-dd-yyyy
        const parts = val.split("-");
        if (parts.length == 1) {
            return {year: parseInt(parts[0]), month: null, day: null}
        } else if (parts.length == 2) {
            return {year: parseInt(parts[1]), month: parseInt(parts[0])-1, day: null}
        } else {
            return {year: parseInt(parts[2]), month: parseInt(parts[0])-1, day: parseInt(parts[1])}
        }
    }
}

export function joinPartialDate(year: number, month: number|null, day: number|null, dateFormat="yyyy-mm-dd") : string {
    let out = "";
    if (dateFormat == "yyyy-mm-dd") {
        out += String(year)
        if (month !== null) {
            out += "-" + String(month+1).padStart(2, "0");
            if (day !== null) {
                out += "-" + String(day).padStart(2, "0");
            }
        }
    } else if (dateFormat == "dd-mm-yyyy") {
        if (day !== null && month !== null) {
            out += String(day).padStart(2, "0") + "-";
            out += String(month+1).padStart(2, "0") + "-";
        } else if (month !== null) {
            out += String(month+1).padStart(2, "0") + "-";
        }
        out += String(year)
    } else { // mm-dd-yyyy
        if (day !== null && month !== null) {
            out += String(month+1).padStart(2, "0") + "-";
            out += String(day).padStart(2, "0") + "-";
        } else if (month !== null) {
            out += String(month+1).padStart(2, "0") + "-";
        }
        out += String(year)
    }
    return out;
}

export function yearFromPartialDate(val : string, dateFormat="yyyy-mm-dd") : number {
    return splitPartialDate(val, dateFormat).year;
}

export function monthFromPartialDate(val : string, dateFormat="yyyy-mm-dd") : number|null {
    return splitPartialDate(val, dateFormat).month;
}

export function dayFromPartialDate(val : string, dateFormat="yyyy-mm-dd") : number|null {
    return splitPartialDate(val, dateFormat).day;
}

export function getToday() {
    const now = new Date();
    var utcDate = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
    utcDate.setUTCHours(0);
    utcDate.setUTCMinutes(0);
    utcDate.setUTCSeconds(0);
    utcDate.setUTCMilliseconds(0);
    return utcDate;
    //return new Date(utcDate.getFullYear()+'-'+(utcDate.getMonth()+1)+'-'+utcDate.getDate()) ;
}

export function firstOfMonth(year: number, month: number|null, day: number|null) {
    const now = new Date();
    var utcDate = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
    utcDate.setUTCFullYear(year);
    utcDate.setUTCMonth(month ?? 0);
    utcDate.setUTCDate(1);
    utcDate.setUTCHours(0);
    utcDate.setUTCMinutes(0);
    utcDate.setUTCSeconds(0);
    utcDate.setUTCMilliseconds(0);
    return utcDate;
}

export function addDays(date : Date, days : number) : Date {
    return new Date(date.getTime() + days * 3600 * 24 * 1000)
}

export function lastOfMonth(year: number, month: number|null, day: number|null) {
    if (month == null) month = 0;
    month++;
    if (month == 12) {
        month = 0;
        year++;
    }
    return addDays(firstOfMonth(year, month, day), -1);
}

export function numDaysBetween(date1 : Date, date2: Date) {
    // Convert dates to UTC timestamps
    let utc1 = 
        Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
    let utc2 = 
        Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());

    // Calculate the time difference in milliseconds
    let timeDiff = Math.abs(utc2 - utc1);

    // Convert milliseconds to days
    let daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)-0.2);

    // Display the result
    return daysDiff;
}

export const PartialDateYear_Month = 7;
export const PartialDateYear_Day = 1;
export const PartialDateMonth_Day = 15;
