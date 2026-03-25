<!-- svelte-ignore unknown_code -->
<!-- svelte-ignore state_referenced_locally -->
<!-- svelte-ignore state_referenced_locally -->
<!-- svelte-ignore state_referenced_locally -->
<!--
    @component Table component with adding, editing, deleting filtering
        and type conversion from string fields    

    Used in combination with {@link SearchUrl} which implements sorting
    and filtering as URL parameters
 -->
<script lang="ts">
    // Copyright (c) 2024 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file

    type Props = {

        /** the rows to display */
        rows : {[key:string]:any|undefined}[];

        /**
         * Column configuration, in the order they will be displayed
         */
        columns : CombiTableColumn[];

        /**
         * Whether to enable sorting.  Default false
         */
        enableSort? : boolean;

        /**
         * Whether to enable filtering.  Default false
        */
        enableFilter? : boolean;

        /**
         * If no sorting is defined in the URL, sort on this
        */
        defaultSort : string;

        /**
         * Date format for date cols.  Default `yyyy-mm-dd`.
         * 
         * Possible values `yyyy-mm-dd`, `dd-mm-yyyy`, `nn-dd-yyyy`
        */
        dateFormat? : string;

        /**
         * Number of rows to show per page.  Default 0 which is no pagination
        */
        paginate? : number;

        /**
         * Whether there are more rows before the ones passed to this table
         * (activates the Previous button).  Default false
        */
        havePrevious? : boolean;

        /**
         * Whether there are more rows after the ones passed to this table
         * (activates the Next button).  Default false
        */
        haveNext? : boolean;

        /**
         * URL to call to add a new row.  If not given, adding is not activated.
         */
        addUrl? : string;

        /**
         * URL to call to link this record to another.  If not given, linking is not activated.
         */
        linkUrl? : string;

        /**
         * URL to call to unlink this record from another.  If not given, unlinking is not activated.
         */
        unlinkUrl? : string;

        /**
         * URL to call to edit a row.  If not given, editing is not activated.
         */
        editUrl? : string;

        /**
         * URL to call to delete a row.  If not given, deleting is not activated.
         */
        deleteUrl? : string;

        /**
         * If passed, any column in this map will be pre-populated with
         * the corresponding value when a new record is being created.  If
         * it is not here, the field will be empty.
         */
        presets? : CombiTablePresets;

        /**
         * Tailwind CSS class for clickable fields.  Default empty
         */
        linkFormat? : string;

        /**
         * Use this if you have multiple tables on one page.  Pass this
         * as the suffix to {@link SearchUrl}
         */
        urlSuffix? : string;

        /**
         * Tailwind table with type `auto` or `fixed`.  Default `auto`
         */
        widthType? : "auto"|"fixed";

        /**
         * Primary key field name,  Only needed when activating, edit, add or delete.
         */
        primaryKey? : string;

        /**
         * Enable selecting rows.  Default false
         */
        select? : boolean;

        /**
         * Height of page not occupied by this table.  Needed to put the
         * buttons at the bottom of the page and put a scrollbar on the table.
         * 
         * If not given, the whole page will scroll.
         */
        restOfScreenHeight? : number;

        /**
         * Whether to make the title row sticky.  Default false.
        */
        stickyHeadRow? : boolean;

        /**
         * Optional operations when setting `select` to true.
         */
        ops? : CombiTableOp[];

        /**
         * Turn on preview mode.  In this mode, only a small number of rows
         * is displayed, without the manipulation buttons.  Intented to show
         * the user what column configuration will look like.
         * Default false.
         */
        preview? : boolean;

        /**
         * Use this to make a whole row linkable, as opposed to individual columns.
         * 
         * Will not give intended results if you have select buttons or operations
         * (edit, delete) on the row.
         */
        link?: ((row:{[key:string]:any}, i? : number) => string);

        /**
         * Bind to this to get a list of primary keys that have been selected
         * when `select` is true.
         * Default empty set.
         */
        primaryKeysChecked? : (string|number)[];

        onUpdate?: () => Promise<void> ;
        /**
         * Set this if you want to be able to disable/reenable all
         * editinng
        */
       updateDisabled? : boolean

       /**
        * Bind to this to find out when the table has unsaved data
        */
       dirty? : boolean

       /**
        * When a value is empty, display this
        */
       emptyValue? : string

       /**
        * Extra buttons to put next to the Add button
        */
       addExtra? : CombiTableExtraButton[]

       /**
        * Extra buttons to put in the navigation area (bottom of the table)
        */
       navExtra? : CombiTableExtraButton[]

       /**
        * Typing this character in a filter field will match the empty string.
        * 
        * Default "-"
        */
       emptySearch? : string,

       /**
        * Language for buttons etc.
        * 
        * Default "en".  Other supported values "de" and "el".
        */
       lang?:  string,

    /**
      * If true, columns can be resized.  
      * 
      * Only supported if widthType = "fixed"
    */
    resizable? : boolean,

    /**
      * If defined, this will be called when resizing starts
      */
    resizeStarted? : (colidx : number) => Promise<void>,

    /**
      * If defined, this will be called every resizeUpdateInterval move moves
      */
     resized? : (colidx : number, width: string) => Promise<void>,

    /**
      * See resized.  Default 1
    */
    resizeUpdateInterval? : number

    resizeEnded? : (colidx : number, width: string) => Promise<void>,

    /**
     * Maximum height of dropdown before adding a scrollbar.
     * 
     * Default "10rem"".
     */
    maxDropdownHeight? : string,

    tableClasses? : string,

    zebra? : boolean,

    tableStyles? : string,

    }
    import { onMount, untrack } from 'svelte';
    import { page } from '$app/state';
    import { goto, invalidateAll } from '$app/navigation'
    import type { CombiTableColumn, CombiTableOp, CombiTableExtraButton , CombiTablePresets } from '$lib/combitabletypes';
    import { SearchUrl } from '$lib/searchurl';
    import upIcon from "$lib/assets/prime--sort-up-fill.svg?raw"
    import downIcon from "$lib/assets/prime--sort-down-fill.svg?raw"
    import checkIcon from "$lib/assets/bitcoin-icons--check-filled.svg?raw"
    import crossIcon from "$lib/assets/bitcoin-icons--cross-filled.svg?raw"
    import trashIcon from "$lib/assets/bitcoin-icons--trash-outline.svg?raw"
    import editIcon from "$lib/assets/bitcoin-icons--edit-outline.svg?raw"
    import exitIcon from "$lib/assets/bitcoin-icons--exit-outline.svg?raw"
    import calendarIcon from "$lib/assets/bitcoin-icons--calendar-outline.svg?raw"
    import CombiTableDiscardChanges from '$lib/components/CombiTableDiscardChanges.svelte';
    import CombiTableValidateDialog from '$lib/components/CombiTableErrorDialog.svelte';
    import CombiTableInfoDialog from '$lib/components/CombiTableInfoDialog.svelte';
    import CombiTableConfirmDeleteDialog from '$lib/components/CombiTableConfirmDeleteDialog.svelte';
    import { updated } from '$app/state';
    import { PartialDateType } from '$lib/types';
    import { PartialDateYear_Month, 
        PartialDateYear_Day, 
        PartialDateMonth_Day, getToday, 
        splitPartialDate, 
        joinPartialDate } from '$lib/utils';

    import DateSelector from './DateSelector.svelte';

    let table : HTMLElement;
    let div : HTMLElement;

    let {
        rows,
        columns,
        enableSort,
        enableFilter = false,
        defaultSort = "",
        dateFormat = "yyyy-mm-dd",
        paginate = 0,
        havePrevious = false,
        haveNext = false,
        addUrl = undefined,
        linkUrl = undefined,
        unlinkUrl = undefined,
        editUrl = undefined,
        deleteUrl = undefined,
        presets = undefined,
        linkFormat = "",
        urlSuffix = "",
        widthType = "auto",
        primaryKey = "",
        select = false,
        restOfScreenHeight = undefined,
        stickyHeadRow = false,
        ops = [],
        preview = false,
        link = undefined,
        onUpdate = undefined,
        updateDisabled = undefined,
        dirty = $bindable(false),
        emptyValue = "-",
        addExtra = [],
        navExtra = [],
        primaryKeysChecked = $bindable([]),
        emptySearch = "-",
        lang = "en",
        resizable = false,
        resizeStarted = undefined,
        resized = undefined,
        resizeEnded = undefined,
        resizeUpdateInterval = 1,
        maxDropdownHeight = "10rem",
        tableClasses = "",
        tableStyles = "",
        zebra = false,
    } : Props = $props();

    let No = $derived(lang == "de" ? "Nein" : (lang == "el" ? "Όχι" : "No"));
    let Yes = $derived(lang == "de" ? "Ja" : (lang == "el" ? "Ναι" : "Yes"));
    let Unset = $derived(lang == "de" ? "Ungefasst" : (lang == "el" ? "Άδιο" : "Unset"));

    function normalize(str : string) : string {
        return str.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    }

    const columnMap = (cols : CombiTableColumn[], fn : (v: CombiTableColumn) => any) =>
        Object.fromEntries(
            cols.map((c) => [c.col, fn(c)])
            );
    

    let rrows = $derived(rows);

    let uuid = crypto.randomUUID();

    let haveOps = $derived(ops.length > 0);
    let haveAddExtra = $derived(addExtra.length > 0);
    let haveNavExtra = $derived(navExtra.length > 0);

    let stickyHeadRowClass = $derived(stickyHeadRow ? "sticky top-0" : "");

    // svelte-ignore state_referenced_locally
    let rowChecked = $state(rows.map((row) => false)); // this is set again in the effect below
    let rowsAreChecked = $derived(rowChecked.reduce(
        (accumulator, currentValue) => accumulator || currentValue,
        false,
    ));

    $effect(() => {
        //if (haveOps && !select) select = true; // XXX
        if (rows.length != rowChecked.length) {
            rowChecked = rows.map((row) => false)
        }

        if (primaryKey) {
            const newPrimaryKeysChecked : (string|number)[] = [];
            //primaryKeysChecked = [];
            rowChecked.forEach((checked, i) => {
                if (checked) newPrimaryKeysChecked.push(rrows[i][primaryKey]);
            });
            if (primaryKeysChecked.length != newPrimaryKeysChecked.length) {
                primaryKeysChecked = [...newPrimaryKeysChecked]
            } else {
                for (let i=0; i<primaryKeysChecked.length; ++i) {
                    if (primaryKeysChecked[i] != newPrimaryKeysChecked[i]) {
                        primaryKeysChecked[i] = newPrimaryKeysChecked[i]
                    }
                }
            }
        }
    });

    let innerWidth = $state(0)
    let innerHeight = $state(0)
    let maxHeight = $derived(restOfScreenHeight ? innerHeight - restOfScreenHeight : undefined);
    let tableHeightStyle = $derived(maxHeight && innerWidth > 0 ? "display: block; max-height:" + maxHeight + "px; min-height: " + maxHeight + "px" : "");

    function resize() {
        maxHeight = restOfScreenHeight ? innerHeight - restOfScreenHeight : undefined;
        tableHeightStyle = maxHeight ? "display: block; max-height:" + maxHeight + "px; min-height: " + maxHeight + "px;" : "";
        //console.log("Table height " + innerHeight + " " + restOfScreenHeight + " " + maxHeight + " " + tableHeightStyle);
    }
    
    onMount(() => {
        resize();
		window.addEventListener('resize', resize);
		
		return () => {
			window.removeEventListener('resize', resize);
		}
    });

    export function printDate(date : Date|undefined|null, edit=false) : string {
        if (!date) return edit ? "" : emptyValue;
        if (dateFormat == "yyyy-mm-dd") {
            return String(date.getFullYear()) + "-" + String((date.getMonth())+1).padStart(2, '0') + "-" + String(date.getDate()).padStart(2, '0')
        }
        if (dateFormat == "mm-dd-yyyy") {
            return String(date.getMonth()).padStart(2, '0') + "-" + String((date.getDate())+1).padStart(2, '0') + "-" + String(date.getFullYear())
        }
        return String(date.getDate()).padStart(2, '0') + "-" + String((date.getMonth())+1).padStart(2, '0') + "-" + String(date.getFullYear())
    }

    export function printPartialDate(date : Date|undefined|null, dateType: PartialDateType, edit=false) : string {
        if (!date) return edit ? "" : emptyValue;
        if (dateType == PartialDateType.year) {
            return String(date.getFullYear());
        } else if (dateType == PartialDateType.month) {
            return String((date.getMonth())+1).padStart(2, '0') + "-" + String(date.getFullYear());
        } else if (dateFormat == "yyyy-mm-dd") {
            return String(date.getFullYear()) + "-" + String((date.getMonth())+1).padStart(2, '0') + "-" + String(date.getDate()).padStart(2, '0')
        }
        if (dateFormat == "mm-dd-yyyy") {
            return String(date.getMonth()).padStart(2, '0') + "-" + String((date.getDate())+1).padStart(2, '0') + "-" + String(date.getFullYear())
        }
        return String(date.getDate()).padStart(2, '0') + "-" + String((date.getMonth())+1).padStart(2, '0') + "-" + String(date.getFullYear())
    }

    export function stringIsDate(val : string) {
        if (dateFormat == "yyyy-mm-dd") return /^( *[0-9][0-9][0-9][0-9][/\.-][0-9][0-9]?[/\.-][0-9][0-9]? *?)$/.test(val);
        return /^( *[0-9][0-9]?[/\.-][0-9][0-9]?[/\.-][0-9][0-9][0-9][0-9] *?)$/.test(val) ;
    }

    export function stringIsDateMonth(val : string) {
        return /^( *[0-9][0-9]?[/\.-][0-9][0-9][0-9][0-9] *?)$/.test(val) ;
    }

    export function stringIsDateYear(val : string) {
        return /^( *[0-9][0-9][0-9][0-9] *?)$/.test(val);
    }

    export function stringIsPartialDate(val : string) {
        return stringIsDate(val) || stringIsDateMonth(val) || stringIsDateYear(val);
    }

    export function parseDate(val : string, df:string|undefined=undefined) : Date {
        val = val.trim();
        if (df == undefined) df = dateFormat;
        if (val.indexOf("T") > 0) {
            val = val.split("T")[0];
            return parseISODate(val);
        }
        const parts = val.includes("-") ? val.trim().split("-") : (val.includes(".") ? val.trim().split(".") : val.trim().split("/"));
        if (parts.length != 3) throw Error("Date " + val + " should be " + df);
        let dateStr = parts[2] + "-" + parts[1] + "-" + parts[0];
        if (df == "yyyy-mm-dd") dateStr = val;
        if (df == "mm-dd-yyyy") dateStr = parts[2] + "-" + parts[0] + "-" + parts[1];
        return parseISODate(dateStr);
    }

    export function parsePartialDate(val : string) : {date: Date, type: PartialDateType} {
        val = val.trim();
        if (val.indexOf("T") > 0) {
            val = val.split("T")[0];
            let date = parseISODate(val);
            return {date, type: PartialDateType.datetime};
        }
        let parts = val.includes("-") ? val.trim().split("-") : (val.includes(".") ? val.trim().split(".") : val.trim().split("/"));
        let type :PartialDateType = PartialDateType.date;
        if (parts.length == 2) {
            if (dateFormat == "yyyy-mm-dd") {
                parts = [parts[1], parts[0], PartialDateMonth_Day+""];
            } else if (dateFormat == "mm-dd-yyyy") {
                parts = [parts[0], ""+PartialDateMonth_Day, parts[1]]
            } else { // dd-mm-yyyy
                parts.unshift(PartialDateMonth_Day+""); 
            }
            type = PartialDateType.month;
        } else if (parts.length == 1) {
            if (dateFormat == "yyyy-mm-dd") {
                parts.push(PartialDateYear_Month+"");
                parts.push(PartialDateYear_Day+"");
            } else if (dateFormat == "mm-dd-yyyy") {
                parts = [PartialDateYear_Month+"", PartialDateYear_Day+"", parts[0]]
            } else { // dd-mm-yyyy
                parts = [PartialDateYear_Day+"", PartialDateYear_Month+"", parts[0]]
            }
            type = PartialDateType.year;
        } else if (parts.length != 3) throw Error("Date " + val + " should be " + dateFormat);
        let dateStr = parts[2] + "-" + parts[1] + "-" + parts[0];
        if (dateFormat == "yyyy-mm-dd") dateStr = parts[0] + "-" + parts[1] + "-" + parts[2];
        else if (dateFormat == "mm-dd-yyyy") dateStr = parts[2] + "-" + parts[0] + "-" + parts[1];
        let date = parseISODate(dateStr);
        return {date, type};
    }

    // SVG wants to display with a new line.  Depending on what icons
    // we are displaying in the actions column set how far to offset
    // the delete icon
    let exitHeightClass = $derived(editUrl ? "-mt-4.5" : "");
    let exitWidthClass = $derived(editUrl ? "ml-1" : "-ml-6");
    let trashHeightClass = $derived(editUrl && unlinkUrl ? "-mt-5" : (editUrl || unlinkUrl ? "-mt-5.25" : ""));
    let trashWidthClass = $derived(editUrl && unlinkUrl ? "ml-6" :  (editUrl || unlinkUrl ? "-ml-1" : "-ml-6"));
    let trashColorClass = $derived(updateDisabled ? "text-neutral-500" : "text-error");
    let saveColorClass = $derived(updateDisabled ? "text-neutral-500" : "text-success");
    let cancelColorClass = $derived(updateDisabled ? "text-neutral-500" : "text-error");

    // put the name of the primary key in pk
    // also save select maps
    let pk  = $derived(primaryKey);
    let selectMap : {[key:string] : {[key:string|number]:string}} = $derived.by(() => {
        let ret : {[key:string] : {[key:string|number]:string}} = {}
        for (let column of columns) {
            if ((column.type == "select:string" || column.type == "select:integer") && column.names && column.values) {
                ret[column.col] = {};
                for (let i=0; i<column.values.length; ++i) {
                    ret[column.col][column.values[i]] = column.names[i];
                }
            }
        }
        return ret;
    });
    let selectReverseMap : {[key:string] : {[key:string]:string|number}} = $derived.by(() => {
        let ret :  {[key:string] : {[key:string]:string|number}} = {};
        for (let column of columns) {
            if ((column.type == "select:string" || column.type == "select:integer") && column.names && column.values) {
                selectReverseMap[column.col] = {};
                for (let i=0; i<column.values.length; ++i) {
                    selectReverseMap[column.col][column.names[i]] = column.values[i];
                }
            }
        }
        return ret
    });

    let editable = $derived(columns.reduce((acc, cur) => acc && cur.type != "array:string", true));
    $effect(() => {
        if (!editable && (addUrl || editUrl)) {
            console.log("Warning: Add and edit disabled as array:string is not supported when editing table data");
        }
        if (pk == "" && (editUrl)) {
            console.log("Warning: edit enabled but no primary key column - disabling edit");
            editUrl = undefined;
        }
    })

    function parseISODate(s : String) {
        let b = s.split(/\D+/);
        return new Date(Date.UTC(parseInt(b[0]), parseInt(b[1])-1, parseInt(b[2]), 0, 0, 0));
    }

    /////
    // Functions to fetch data from a variable of arbitrary type as a given type

    function asBoolean(val : string|number|boolean|undefined) : boolean {
        if (val == undefined) return false;
        if (typeof(val) == "boolean") return val;
        if (typeof(val) == "number") return val > 0;
        if (typeof(val) == "string") {
            val = val.toLowerCase();
            return val == "yes" || val == "y" || val == "t" || val == "true" || val == "on";
        }
        return false;
    }
    function asBooleanOrUndefined(val : string|number|boolean|undefined) : boolean|undefined {
        if (typeof(val) == "string" && val == "") return undefined;
        return val == undefined ? undefined : asBoolean(val);
    }

    function asNumber(val : string|number|boolean|undefined) : number {
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
    function asNumberOrUndefined(val : string|number|boolean|undefined) : number|undefined {
        if (typeof(val) == "string" && val == "") return undefined;
        return val == undefined ? undefined : asNumber(val);
    }

    function asString(val : string|number|boolean|undefined|Date, type : string|undefined=undefined, dateType: PartialDateType=PartialDateType.date, edit = false) : string {
        if (val == undefined) return "";
        if (typeof(val) == "boolean") return val ? Yes : No;
        if (typeof(val) == "number") return val+"";
        if (typeof(val) == "string") return val;
        if (val instanceof Date && type=="date") printDate(val, edit)
        if (val instanceof Date && type=="partialdate") printPartialDate(val, dateType, edit)
        if (val instanceof Date) return printDate(val, edit);
        if (typeof(val) == "object" && "name" in val) return val["name"];
        return ""+val;
    }
    function asStringOrUndefined(val : string|number|boolean|undefined, type : string|undefined=undefined) : string|undefined {
        if (typeof(val) == "string" && val == "") return undefined;
        return val == undefined ? undefined : asString(val, type);
    }

    function asDate(val : string|Date) : Date {
        if (val == undefined) return new Date();
        if (typeof(val) == "string") {
            const dateString = val.trim();
            if (dateFormat == "yyyy-mm-dd") return parseISODate(dateString);
            const parts = dateString.split("-");
            if (parts.length != 3) return new Date();
            if (dateFormat == "mm-dd-yyyy") return parseISODate(parts[2] + "-" + parts[0] + "-" + parts[1]);
            return parseISODate(parts[2] + "-" + parts[1] + "-" + parts[0]);
        } 
        return val;
    }
    function asDateOrUndefined(val : string|Date|undefined) : Date|undefined {
        if (typeof(val) == "string" && val == "") return undefined;
        return val == undefined ? undefined : asDate(val);
    }


    // parse a column name with dots and fetch from the nested data
    function getColumn(obj : {[key:string]:any}, col: CombiTableColumn) : any|undefined{
        const name = col.col;
        const parts = name.split(".");
        let res : any|undefined = obj;
        for (let i=0; i<parts.length; ++i) {
            const part = parts[i];
            if (!res || !(part in res)) {
                res = undefined;
            } else if (Array.isArray(res[part])) {
                if (res[part].length == 0) res = undefined;
                else if (i == parts.length-2) {
                    res = res[part].map((row) => row[parts[i+1]]).filter((row) => row != undefined && row !== null && row != "").join(", ");
                    break;
                } else {
                    if (i == parts.length-1 && col.type == "array:string") {
                        res = res[part];
                    } else {
                        res = res[part][0]
                    }
                }
            } else {
                if (col.type == "partialdate") {
                    res = res && part in res ? {date: res[part], type: res[part+"_type"] as PartialDateType} : undefined;
                } else {
                    res = res && part in res ? res[part] : undefined;
                }
            }
        }
        return res;
    }
    
    // format a value of arbitrary type for displaying in the table
    // according to the column type
    function formatColumn(val : any, col: CombiTableColumn, editing=false) {
        if (val == undefined) return editing ? "" : emptyValue;
        if (typeof(val) == "boolean") {
            return val ? Yes : No;
        }
        if (typeof(val) == "object" && col.type == "partialdate") {
            return printPartialDate(val.date as Date, val.type as PartialDateType);
        }
        if (col.type == "date") {
            if (val instanceof Date) {
                return printDate(val);
            }
        }
        if (col.type == "datetime") {
            if (val instanceof Date) {
                return val.toISOString();
            }
        }
        if (col.type == "select:integer" || col.type == "select:string" && col.col in selectMap) {
            return selectMap[col.col][val];
        }
        if (col.type == "array:string") {
            if (!Array.isArray(val)) return [val];
            return val;
        }
        return val;
    }

    // load previous page, confirming discard changes if dirty
    function previous() {
        if (!internalDirty) {
            confirmPrevious()
        } else {
            (document.querySelector('#confirmPreviousDiscard_'+uuid) as HTMLDialogElement)?.showModal(); 
        }
    }
    async function confirmPrevious() {
        confirmCancelEdit();
        const url = new SearchUrl(page.url, paginate);
        url.setSuffix(urlSuffix);
        let skip = url.getSkip();
        if (skip <= 0) return;
        let take = url.getTake();
        if (skip < take) {
            skip = 0;
        } else {
            skip -= take;
        }
        url.skip(skip);
            
        await invalidateAll();
        searchParams = `?${url.searchParamsAsString()}`;
        goto(searchParams);
    
    }

    // load next page, confirming discard changes if dirty
    function next() {
        if (!internalDirty) {
            confirmNext()
        } else {
            (document.querySelector('#confirmNextDiscard_'+uuid) as HTMLDialogElement)?.showModal(); 
        }
    }
    async function confirmNext() {
        confirmCancelEdit();
        const url = new SearchUrl(page.url, paginate);
        url.setSuffix(urlSuffix);
        let skip = url.getSkip();
        let take = url.getTake();
        skip += take;
        if (skip < 0) skip = 0;
        url.skip(skip);
            
        await invalidateAll();
        searchParams = `?${url.searchParamsAsString()}`;
        goto(searchParams);
    
    }

    /////
    // sorting and filtering

    async function sort(col : string, dir? : "ascending"|"descending") {
        const url = new SearchUrl(page.url, paginate);
        url.setSuffix(urlSuffix);
        url.setDefaultSortCol(defaultSort);
        let { sortCol, sortDirection } = url.getSort();
        url.sort(col, dir);
        if (col == sortCol) url.skip(0);    
        await invalidateAll()
        searchParams = `?${url.searchParamsAsString()}`;
        goto(searchParams);
    
    }

    function filterKeyPress(evt: KeyboardEvent, col : CombiTableColumn, value : string|boolean|undefined) {
        if (evt.key === 'Enter') {
            load(() => filter(col, value));
        }
    }

    async function clearFilters() {
        filters = {};
        haveFilters = false;
        for (let col of columns) {
            filterText[col.col] = "";
            filterValues[col.col] = "";
        }

        const url = new SearchUrl(page.url, paginate);
        url.setSuffix(urlSuffix);
        url.setFilters(filters);
        await invalidateAll()
        searchParams = `?${url.searchParamsAsString()}`;
        goto(searchParams);
    }

    async function filter(col : CombiTableColumn, value : string|boolean|undefined) {
        //if (/*value === undefined &&*/ !(col.col in urlfilters) && !urlfilters[col.col]) return;
        if (col.col in urlfilters && urlfilters[col.col] == value) return;
        if (col.col in filterMenusOpen) filterMenusOpen[col.col] = false;
        if (col.type == "boolean") {
            if (value == undefined) {
                delete filters[col.col];
                filters = {...filters};
            } else {
                filters[col.col] = value ? "t" : "f";
                filters = {...filters};
            }
        } else if (col.type == "select:string" || col.type == "select:integer") {
            if (col.values) {
                if (value == "") {
                    filterValues[col.col] = value;
                    filterText[col.col] = value;
                    delete filters[col.col];
                    filters = {...filters}

                } else {
                    for (let i=0; i<col.values?.length; ++i) {
                        if (col.values[i] == value) {
                            filterValues[col.col] = asString(value);
                            filterText[col.col] = col.names ? col.names[i] : col.values[i]+"";
                            filters = {...filters, [col.col]: filterValues[col.col]}
                        }
                    }

                }

            } else if (col.names) {
                if (value == "") {
                    filterValues[col.col] = value;
                    filterText[col.col] = value;
                    delete filters[col.col];
                    filters = {...filters}

                } else {
                    for (let i=0; i<col.names?.length; ++i) {
                        if (col.names[i] == value) {
                            filterValues[col.col] = asString(value);
                            filterText[col.col] = col.names ? col.names[i] : col.names[i];
                            filters = {...filters, [col.col]: filterValues[col.col]}
                        }
                    }

                }
                
            }
        } else if (col.type == "date" || col.type == "partialdate") {
            if (value == undefined || value == "") {
                delete filters[col.col];
                filters = {...filters};
            } else {
                try {
                    if (typeof(value) == "boolean" || (value && !stringIsPartialDate(value))) {
                        throw new Error("Date format")
                    };
                    if (typeof(value) == "boolean") filters[col.col] = value ? Yes : No;
                    else filters[col.col] = value ?? "";
                    const val = filters[col.col];
                    const partialDate = parsePartialDate(val);
                    filterText[col.col] = filterDateText(partialDate.date, partialDate.type);
                    const dateTime = partialDate.date.toISOString();
                    let parts = dateTime.split("T")
                    filters = {...filters, [col.col]: parts[0] + "_" + partialDate.type}
                } catch (e) {
                    console.log(e);
                    validationErrors = "Dates must be " + dateFormat + ", mm-yyyy or yyyy";
                    (document.querySelector('#validateDialog_'+uuid) as HTMLDialogElement)?.showModal(); 
                }
            }
        } else {
            if (value == undefined || value == "") {
                delete filters[col.col];
                filters = {...filters};
            } else {
                if (typeof(value) == "boolean") filters[col.col] = value ? Yes : No;
                else filters[col.col] = value ?? "";
                filters = {...filters, [col.col]: filters[col.col]}
            }
        }

        const url = new SearchUrl(page.url, paginate);
        url.setSuffix(urlSuffix);
        url.setFilters(filters);
        url.skip(0);
        await invalidateAll()
        searchParams = `?${url.searchParamsAsString()}`;
        goto(searchParams);

    }

    function filterDateText(date : Date, type: PartialDateType) : string {
        if (type == PartialDateType.date || type == PartialDateType.datetime) {
            return printDate(date);
        } else if (type == PartialDateType.month) {
            return ((date.getMonth()+1)+"").padStart(2, '0') + "-" + (date.getFullYear()+"").padStart(4, '0');
        } else {
            return (date.getFullYear() + "").padStart(4, '0');
        }
    }

    async function clearIds() {

        const url = new SearchUrl(page.url, paginate);
        url.setSuffix(urlSuffix);
        url.setFilters(filters);
        url.ids([])
        await invalidateAll()
        searchParams = `?${url.searchParamsAsString()}`;
        goto(searchParams);

    }



    const url = $derived(new SearchUrl(page.url, paginate));
    // svelte-ignore state_referenced_locally
    let urlfilters = {...url.getFilters()}; // set in effect below
    let sortCol = $state("");
    let sortDirection = $state("ascending");
    let searchParams = "";
    let filters : {[key:string]:string}= {};
    let haveFilters = $state(false);
    // svelte-ignore state_referenced_locally
    let filterText : {[key:string]:string} = $state(columnMap(columns, v => "")) // set in effect below
    // svelte-ignore state_referenced_locally
    let filterValues : {[key:string]:string} = $state(columnMap(columns, v => "")) // set in effect below
    // svelte-ignore state_referenced_locally
    let filterMenusOpen : {[key:string]:boolean} = $state(columnMap(columns, v => false)) // set in effect below

    // svelte-ignore state_referenced_locally
    let autoCompleteOpen : {[key:string]:boolean} = $state(columnMap(columns, v => false));

    let editRow = $state(undefined as number|undefined);
    // svelte-ignore state_referenced_locally
    let editRowSelectValue : {[key:string]:string|number|boolean|undefined} = $state(columnMap(columns, v => undefined));
    // svelte-ignore state_referenced_locally
    let editRowText : {[key:string]:string} = $state(columnMap(columns, v => ""));
    // svelte-ignore state_referenced_locally
    let editRowMenusOpen : {[key:string]:boolean} = $state(columnMap(columns, v => false))

    $effect(() => {
        url.setSuffix(urlSuffix);
        url.setDefaultSortCol(defaultSort);
        url.setSuffix(urlSuffix);
        urlfilters = {...url.getFilters()};

        const resp = url.getSort();
        sortCol = resp.sortCol;
        sortDirection = resp.sortDirection;
        searchParams = `?${url.searchParamsAsString()}`;
        filters = url.getFilters();
        haveFilters = Object.keys(filters).length > 0
        untrack(() => {

            for (let col in filterText) {
                if (!(col in columns)) {
                    delete filterText[col];
                    if (col in filterValues) delete filterValues[col];
                    if (col in autoCompleteOpen) delete autoCompleteOpen[col];
                    if (col in filterMenusOpen) delete filterMenusOpen[col];
                    if (col in editRowSelectValue) delete editRowSelectValue[col];
                    if (col in editRowText) delete editRowText[col];
                    if (col in editRowMenusOpen) delete editRowMenusOpen[col];
                }
            }
            for (let col of columns) {
                if (!(col.col in urlfilters)) {
                    filterText[col.col] = "";
                }
                if (!(col.col in filterMenusOpen)) filterMenusOpen[col.col] = false;
                if (!(col.col in autoCompleteOpen)) autoCompleteOpen[col.col] = false;
                if (!(col.col in editRowMenusOpen)) editRowMenusOpen[col.col] = false;
                if (!(col.col in editRowText)) editRowText[col.col] = "";
                if (!(col.col in editRowSelectValue)) editRowSelectValue[col.col] = "";
            }
            for (let col in urlfilters) {
                if (col in filterText || true) {
                    for (let i=0; i<columns.length; ++i) {
                        if (col == columns[i].col) {
                            if (columns[i].type == "boolean") {
                                filterText[col] = urlfilters[col] == "t" ? Yes : No
                                filterValues[col] = urlfilters[col];
                            } else if (columns[i].type == "date" || columns[i].type == "partialdate") {
                                let parts = urlfilters[col].split("_")
                                if (parts.length > 1) {
                                    if (parts[1] == PartialDateType.datetime+"" || parts[1] == PartialDateType.date+"") {
                                        filterText[col] = parts[0]
                                    } else if (parts[1] == PartialDateType.month+"") {
                                        let date = parseDate(parts[0], "yyyy-mm-dd")
                                        filterText[col] = filterDateText(date, PartialDateType.month);
                                    } else if (parts[1] == PartialDateType.year+"") {
                                        let date = parseDate(parts[0], "yyyy-mm-dd")
                                        filterText[col] = filterDateText(date, PartialDateType.year);
                                    } 
                                }

                            } else if (columns[i].type == "select:string" || columns[i].type == "select:integer") {
                                    let values = columns[i].values ?? [];
                                    let names = columns[i].names ?? values;
                                    for (let j=0; j<values.length; ++j) {
                                        if (urlfilters[col] == values[j]) {
                                            filterValues[col] = values[j]+"";
                                            filterText[col] = names[j]+"";
                                        }
                                    }

                            } else {
                                filterValues[col] = urlfilters[col];
                                filterText[col] = urlfilters[col];
                            }
                        }
                    }
                }
            }   

        })

    })
    let internalDirty = $state(false);
    let ids = $derived(url.getIds());

    function closeFilter(evt : FocusEvent, col: CombiTableColumn) {
        let id = (evt.relatedTarget as any)?.id as string;
        if (!id || ( !(id.startsWith("filter_select_"+uuid+"_"+col.col+"-")) && !(id.startsWith("xfilter_select_summary_"+uuid+"_"+col.col+"-")) ) ){
            //for (let col of columns) {
                //console.log("Close", col.col)
                filterMenusOpen[col.col] = false;
            //}
        }
    }
    function closeEdit(evt : FocusEvent, col: CombiTableColumn) {
        let id = (evt.relatedTarget as any)?.id as string;
        if (!id || (!(id.startsWith("edit_select_"+uuid+"_"+col.col+"-")) && !(id.startsWith("xedit_select_summary_"+uuid+"_"+col.col+"-"))) ) {
            //for (let col of columns) {
                editRowMenusOpen[col.col] = false;
            //}
        }
    }
    //$effect(() => {

    //})

    //////
    // Auto complete

    let autoCompleteData : string[] = $state([]);

    async function autoCompleteUpdate_filter(col : CombiTableColumn, value : string|undefined|null) {
        if (value) {
            filterText[col.col] = value;
            for (let col in autoCompleteOpen) {
                autoCompleteOpen[col] = false;
            }
            filter(col, value);
        }
    }

    function autoCompleteUpdate(col : CombiTableColumn, value : string|undefined|null) {
        if (value == undefined || value == null || value == "") {
            /*editRowSelectValue[col.col] = "";
            delete editRowSelectValue[col.col];
            editRowSelectValue = {...editRowSelectValue}*/


        } else {
            editRowText[col.col] = value;
            editRowSelectValue = {...editRowSelectValue, [col.col]: value}
        }


        internalDirty = true;
        dirty = internalDirty;
        for (let col in autoCompleteOpen) {
            autoCompleteOpen[col] = false;
        }
        autoCompleteData = [];
    }

    async function autoCompleteKeyPress(evt: KeyboardEvent, col : CombiTableColumn, value : string|undefined, isFilter: boolean) {
        if (!col.autoCompleteLink) return;

        if (evt.key === 'Enter' && value) {
            if (isFilter) {
                filterText[col.col] = value;
                for (let col in autoCompleteOpen) {
                    autoCompleteOpen[col] = false;
                }
                filter(col, value);
            }
        }

        if (value && value.length > 0) {
            autoCompleteOpen[col.col] = true;

            // call link
            const url = col.autoCompleteLink + "?t="+encodeURIComponent(value);
            const resp = await fetch(url, {
                method: "GET",
                headers: {"content-type": "application/json"},
            });
            if (!resp.ok) {
                console.log("Auto complete error on", col.col);
                return;
            } else {
                const body = await resp.json() as string[];
                //console.log("Autocomplete", body)
                autoCompleteData = [...body];
            }

            if (autoCompleteData.length > 0) {
                let target = isFilter ? document.getElementById("filter_ac_"+col.col) : document.getElementById("edit_ac_"+col.col);
                if (target instanceof Element) {
                    if (target.getBoundingClientRect().bottom > table.getBoundingClientRect().bottom) {
                        setTimeout(() => {target.scrollIntoView({behavior: "smooth", block: "nearest"})}, 100); 
                    }
                }
            } else {
                autoCompleteOpen[col.col] = false;
            }

        } else {
            autoCompleteOpen[col.col] = false;
            autoCompleteData = []
        }
        
        if (!isFilter) {
            internalDirty = true;
            dirty = internalDirty;
        }
    }

    /////
    // Editing

    function getPreset(col : CombiTableColumn) : string|undefined {
        if (presets == undefined || presets[col.col] == undefined) return undefined;
        let colName = col.col;
        let p : string|number|boolean|Date = "";
        if (typeof presets[colName] == 'function') {
            p = (presets[colName])();
        } else {
            p = presets[colName];
        }
        if (col.values && col.names) {
            let val = "";
            for (let i=0; i<col.values.length; ++i) {
                if (p == col.values[i]) {
                    p = col.names[i];
                    break;
                }
            }
        }
            
        return asString(p, col.type);
    }
    function getPresetSelectValue(col : CombiTableColumn) : string|undefined|number|boolean {
        if (presets == undefined || presets[col.col] == undefined) return undefined;
        let colName = col.col;
        if (typeof presets[colName] == 'function') return asString((presets[colName])(), col.type);
        if (typeof(presets[colName]) == "object") return undefined;
        return presets[colName];
    }

    function edit(rowidx : number) {
        // make sure all dropdowns are closed
        for (let row in editRowMenusOpen) {
            editRowMenusOpen[row] = false;
        }

        // show edit row or add row and hide data row/add button
        editRow = rowidx;

        if (editRow != undefined && editRow >= 0) {

            // set edit fields from row
            for (let col of columns) {
                let colName = col.col;
                if (col.type == "boolean") {
                    editRowText[colName] = asString(rrows[rowidx][colName]);
                    editRowSelectValue[colName] = rrows[rowidx][colName];
                } else if (col.type == "select:string" || col.type == "select:integer") {
                    if (col.names && col.values) {
                        const val = getColumn(rrows[rowidx], col);
                        if (val == undefined || (typeof(val) == "string" && val == "")) {
                            editRowText[colName] = "";
                            editRowSelectValue[colName] = "";
                        } else {
                            for (let i=0; i<col.names.length; ++i) {
                                if (val == col.values[i]) {
                                    editRowText[colName] = col.names[i];
                                    editRowSelectValue[colName] = col.values[i];
                                }
                            }  
                        }
                    } else if (col.values) {
                        const val = getColumn(rrows[rowidx], col)
                        if (val == undefined || (typeof(val) == "string" && val == "")) {
                            editRowText[colName] = "";
                            editRowSelectValue[colName] = "";
                        } else {
                            for (let i=0; i<col.values.length; ++i) {
                                if (val == col.values[i]) {
                                    editRowText[colName] = col.values[i]+"";
                                    editRowSelectValue[colName] = col.values[i];
                                }

                            }  
                        }
                    }

                } else {
                    let val = getColumn(rrows[rowidx], col)
                    let dateType : PartialDateType = PartialDateType.date;
                    if (col.type == "partialdate" && typeof(val) == "object" && "type" in val) {
                        dateType = val.type
                    }
                    if (col.type == "date" || col.type == "partialdate")
                        editRowText[colName] = asString(printPartialDate(val.date, dateType, true), col.type, dateType);
                    else
                        editRowText[colName] = asString(val, undefined, PartialDateType.date, true);
                }
                editRowText = {...editRowText}
            }

        } else if (editRow == -1 || editRow == -2) {
            
            // set columns to contents of presets or blank if preset not present for a column
            for (let col of columns) {
                let colName = col.col;
                if (col.type == "boolean") {
                    //editRowText[colName] = (presets && presets[colName]) ? asString(rrows[rowidx][colName], col.type) : "";
                    editRowText[colName] = getPreset(col) ??  "";
                    editRowSelectValue[colName] = getPresetSelectValue(col);
                } else if (col.type == "select:string" || col.type == "select:integer") {
                    if (col.col in editRowSelectValue) editRowSelectValue[col.col] = undefined;
                    if (col.names && col.values) {
                        //const val = presets && col.col in presets ? presets[col.col] : undefined;
                        const val = getPreset(col);
                        editRowSelectValue[colName] = getPresetSelectValue(col);
                        if (!val) {
                            editRowText[colName] = "";
                            editRowSelectValue[colName] = "";
                        } else {
                            for (let i=0; i<col.names.length; ++i) {
                                if (val == col.names[i]) {
                                    editRowText[colName] = col.names[i];
                                    editRowSelectValue[colName] = col.values[i];
                                }
                            }  
                        }
                    } else if (col.names) {
                        //const val = presets && col.col in presets ? presets[col.col] : undefined;
                        const val = getPreset(col);
                        for (let i=0; i<col.names.length; ++i) {
                            if (val == col.names[i]) {
                                editRowText[colName] = col.names[i];
                                editRowSelectValue[colName] = col.names[i];
                            }

                        }  
                    }

                } else {
                    //let val = presets && col.col in presets ? presets[col.col] : undefined;
                    const val = getPreset(col);
                    let dateType : PartialDateType = PartialDateType.date;
                    if (col.type == "partialdate" && rrows[rowidx] && col.col + "_type" in rrows[rowidx]) {
                        dateType = rrows[rowidx][col.col + "_type"] as PartialDateType
                    }
                    /*if (col.type == "partialdate" && typeof(val) == "object" && "type" in val) {
                        dateType = val.type
                    }*/
                    editRowText[colName] = asString(val, col.type, dateType);
                }
                editRowText = {...editRowText}
            }

        }

    }

    function clearEdit() {
        // clear previous edit
        for (let col in editRowMenusOpen) {
            editRowMenusOpen[col] = false;
        }
        for (let col in editRowText) {
            editRowText[col] = "";
            editRowSelectValue[col] = undefined;
        }
    }
    
    function editRowUpdate(col : CombiTableColumn, value : string|boolean|undefined|null) {
        if (col.type == "boolean") {
            if (value == undefined) {
                editRowText[col.col] = "";
                delete editRowSelectValue[col.col];
                editRowSelectValue = {...editRowSelectValue};
            } else {
                editRowText[col.col] = value ? Yes : No;
                editRowSelectValue[col.col] = value;
                editRowSelectValue = {...editRowSelectValue};
            }
        } else if (col.type == "select:string" || col.type == "select:integer") {
            if (col.values) {
                if (value == undefined || value == null || value == "") {
                    editRowSelectValue[col.col] = "";
                    delete editRowSelectValue[col.col];
                    editRowSelectValue = {...editRowSelectValue}

                } else {
                    for (let i=0; i<col.values?.length; ++i) {
                        if (col.values[i] == value) {
                            editRowText[col.col] = col.names ? col.names[i] : col.values[i]+"";
                            editRowSelectValue = {...editRowSelectValue, [col.col]: value}
                        }
                    }

                }

            } else if (col.names) {
                if (value == null || value == undefined || value == "") {
                    editRowSelectValue[col.col] = "";
                    delete editRowSelectValue[col.col];
                    editRowSelectValue = {...editRowSelectValue}

                } else {
                    for (let i=0; i<col.names?.length; ++i) {
                        if (col.names[i] == value) {
                            editRowText[col.col] = col.names ? col.names[i] : col.names[i];
                            editRowSelectValue = {...editRowSelectValue, [col.col]: value}
                        }
                    }

                }

            }
        }

        internalDirty = true;
        dirty = internalDirty;
        for (let col in editRowMenusOpen) {
            editRowMenusOpen[col] = false;
        }
    }

    function editInputUpdate(evt : KeyboardEvent, col : CombiTableColumn) {
        if (editRow == -1 || editRow == -2) {
            if (editRowText[col.col] != "") {
                internalDirty = true;
                dirty = internalDirty;
            }
        } else if (editRow !== undefined) {
            if (editRowText[col.col] != rrows[editRow][col.col]) {
                internalDirty = true;
                dirty = internalDirty;
            }
        }
    }

    let validationErrors = $state(undefined as string[]|string|undefined);
    let opInfo = $state("");

    async function saveEdit() {
        if (preview) {
            clearEdit();
            editRow = undefined;
            internalDirty = false;
            dirty = internalDirty;
            showInfo("Data not saved in preview mode");
            return;

        }
        
        validationErrors = validate();
        if (validationErrors.length > 0) {
            (document.querySelector('#validateDialog_'+uuid) as HTMLDialogElement)?.showModal(); 
        } else {
            let url = editRow == -1 ? addUrl : (editRow == -2 ? linkUrl : editUrl);
            if (url == undefined) {
                console.log("saveEdit called but edit/add url is not set");
                return;
            }
            try {
                let data : {[key:string]:any} = {};
                for (let col of columns) {

                    if (editRow == -2 && col.col != primaryKey) continue;
                    if (col.type == "select:string") {
                        data[col.col] = editRowSelectValue[col.col];
                    } else if (col.type == "select:integer") {
                        data[col.col] = asNumberOrUndefined(editRowSelectValue[col.col]);
                    } else if (col.type == "boolean") {
                        data[col.col] = asBooleanOrUndefined(editRowSelectValue[col.col]);
                    } else if (col.type == "integer") {
                        data[col.col] = asNumberOrUndefined(editRowText[col.col]);
                    } else if (col.type == "float") {
                        data[col.col] = asNumberOrUndefined(editRowText[col.col]);
                    } else if (col.type == "date") {
                        data[col.col] = asStringOrUndefined(editRowText[col.col], col.type);
                    } else if (col.type == "partialdate") {
                        data[col.col] = asStringOrUndefined(editRowText[col.col], col.type);
                    } else if (col.type == "datetime") {
                        data[col.col] = asStringOrUndefined(editRowText[col.col], col.type);
                    } else {
                        data[col.col] = editRowText[col.col];
                    }
                }
                if (editRow !== undefined && editRow >= 0) data._pk = rrows[editRow][pk];
                const resp = await fetch(url, {
                    method: "POST",
                    headers: {"content-type": "application/json"},
                    body: JSON.stringify(data),
                });
                if (!resp.ok) {
                    showError("Error saving data");
                } else {
                    const body = await resp.json();
                    if (body.errors) {
                        showError(body.errors);
                    } else {
                        for (let column of columns) {
                            if (column.type == "date" && typeof(body.row[column.col]) == "string") {
                                body.row[column.col] = parseDate(body.row[column.col]);
                            } else if (column.type == "datetime" && typeof(body.row[column.col]) == "string") {
                                body.row[column.col] = new Date(body.row[column.col]);
                            }
                        }
                        if (editRow == -1 || editRow == -2) {
                            rrows = [body.row, ...rrows]
                            rowChecked.unshift(false);
                        } else if (editRow !== undefined) {
                            rrows[editRow] = body.row;
                            rrows = [...rrows];
                        }
                        clearEdit();
                        editRow = undefined;
                        internalDirty = false;
                        dirty = internalDirty;
                        if (body.info) {
                            showInfo(body.info);
                        }  
                        if (onUpdate !== undefined) await onUpdate();
                    }
                }
            } catch (e) {
                console.log(e);
                showError("Couldn't call save function");
            }
        }
    }

    function validate() {
        let errors : string[] = [];
        for (let col of columns) {
            if (editRow == -2 && col.col != primaryKey) continue;
            if (!col.nullable && !col.readOnly && col.type != "string" && editRowText[col.col] == "") {
                errors.push("Must enter a value for " + col.name);
            } else if (editRowText[col.col]) {
                if (col.type == "integer") {
                    if (!/^ *([+-]?[0-9]+) *$/.test(editRowText[col.col])) {
                        errors.push(col.name + " must be an integer");
                    }
                } else if (col.type == "float") {
                    if (!/^ *[-+]?([0-9]*[.])?[0-9]+([eE][-+]?\d+)? *$/.test(editRowText[col.col])) {
                        errors.push(col.name + " must be a number");
                    }
                } else if (col.type == "date") {
                    if (!stringIsDate(editRowText[col.col])) {
                        errors.push(col.name + " must be in the form " + dateFormat);
                    }

                } else if (col.type == "partialdate") {
                    if (!stringIsPartialDate(editRowText[col.col])) {
                        errors.push(col.name + " must be in the form " + dateFormat);
                    }

                }
            } else if (col.type == "datetime") {
                if (!/^( *[0-9][0-9][0-9][0-9]-[0-9][0-9]?-[0-9][0-9](T[0-9][0-9]?:[0-9][0-9]?:[0-9][0-9]?(\.[0-9]*)?[A-Za-z]?)? *?)$/.test(editRowText[col.col])) {
                    errors.push(col.name + " must be in the form yyyy-mm-ddThh:99:ss.sssZ");
                }
            } 
        }
        return errors;
    }

    function cancelEdit() {
        if (!internalDirty) {
            confirmCancelEdit();
        } else {
            (document.querySelector('#confirmEditDiscard_'+uuid) as HTMLDialogElement)?.showModal(); 
        }
    }
    function confirmCancelEdit() {
            clearEdit();
            editRow = undefined;
            internalDirty = false;
            dirty = internalDirty;
    }

    /////
    // Deleting
    
    let deleteIdx = -1;
    function deleteRow(idx : number) {
        deleteIdx = idx;
        (document.querySelector('#confirmDelete_'+uuid) as HTMLDialogElement)?.showModal(); 
    }
    async function confirmDeleteRow() {
        if (deleteUrl === undefined) {
            console.log("No delete URL provided");
        } else if (!pk) {
            console.log("Cannot delete as no primary key defined in columns");
        } else if (deleteIdx == -1) {
            console.log("Delete not initiated");
        } else {
            const data = {_pk: rrows[deleteIdx][pk]}
            const resp = await fetch(deleteUrl, {
                    method: "POST",
                    headers: {"content-type": "application/json"},
                    body: JSON.stringify(data),
                });
                if (!resp.ok) {
                    showError("Error deleting row");
                } else {
                    const body = await resp.json();
                    if (body.error) {
                        showError("Error deleting row");
                    } else {
                        rrows = rrows.filter((_el, i) => i != deleteIdx);
                        rowChecked = rowChecked.filter((_el, i) => i != deleteIdx);
                    }
                }
        }
        deleteIdx = -1;
        invalidateAll();
        if (onUpdate !== undefined) onUpdate();
}

    // show dialogs
    export function showInfo(info : string) {
        opInfo = info;
        (document.querySelector('#infoDialog_'+uuid) as HTMLDialogElement)?.showModal(); 
    }

    export function showError(errors: string[]|string) {
        validationErrors = errors;
        (document.querySelector('#validateDialog_'+uuid) as HTMLDialogElement)?.showModal(); 
    }

    // show dialogs
    function showReload(info : string) {
        opInfo = info;
        (document.querySelector('#reloadDialog_'+uuid) as HTMLDialogElement)?.showModal(); 
    }

    ///// Custom operations

    async function reload() {
        const url = new SearchUrl(page.url, paginate);            
        url.setSuffix(urlSuffix);
        await invalidateAll();
        searchParams = `?${url.searchParamsAsString()}`;
        goto(searchParams);
    }

    function clearSelection() {
        rowChecked.forEach((row, i) => {rowChecked[i] = false})
    }

    async function execOp(op: CombiTableOp) {
        let pks : (string|number)[] = [];
        for (let i=0; i<rowChecked.length; ++i) {
            if (rowChecked[i]) pks.push(rrows[i][primaryKey]);
        }
        if (pks.length > 0) {
            let ret = await op.fn(pks);
            if (ret.error) {
                showError(ret.error)
            } else if (ret.info) {
                showReload(ret.info);
            } else {
                showReload("Operation successful")
            }
        }
    }

    async function callExtra(op: CombiTableExtraButton) {
        let ret = await op.fn();
    }

    /////
    // Unlinking
    let unlinkIdx = -1;
    function unlinkRow(idx : number) {
        unlinkIdx = idx;
        (document.querySelector('#confirmUnlink_'+uuid) as HTMLDialogElement)?.showModal(); 
    }
    async function confirmUnlinkRow() {
        if (unlinkUrl === undefined) {
            console.log("No unlink URL provided");
        } else if (!pk) {
            console.log("Cannot unlink as no primary key defined in columns");
        } else if (unlinkIdx == -1) {
            console.log("Unlink not initiated");
        } else {
            const data = {_pk: rrows[unlinkIdx][pk]}
            const resp = await fetch(unlinkUrl, {
                    method: "POST",
                    headers: {"content-type": "application/json"},
                    body: JSON.stringify(data),
                });
                if (!resp.ok) {
                    showError("Error deleting row");
                } else {
                    let body = await resp.json();
                    if (body.error) {
                        console.log(body.error);
                        showError("Error deleting row");
                    } else {
                        rrows = rrows.filter((_el, i) => i != unlinkIdx);
                        rowChecked = rowChecked.filter((_el, i) => i != unlinkIdx);
                    }
                }
        }
        unlinkIdx = -1;
    }

    let ncolumns = $derived(columns.length + (select? 1 : 0));

    async function handleACBlur(event : any, col: CombiTableColumn) {
        // if the blur was because of outside focus
        // currentTarget is the parent element, relatedTarget is the clicked element
        //setTimeout(() => {autoCompleteUpdate(col, null)}, 100);
        if (event.relatedTarget == null || !event.relatedTarget && event.currentTarget.parentNode.contains(event.relatedTarget)) {
            //autoCompleteUpdate(col, null);
            autoCompleteOpen[col.col] = false;
            autoCompleteData = [];
        }

    }

    ///// Date Selectors

    // filter

    let filterDateSelectorYear : number|undefined = $state();
    let filterDateSelectorMonth: number|undefined|null = $state();
    let filterDateSelectorDay : number|undefined|null = $state();
    
    function toggleFilterDateDialog(col: string) {
        const dateStr = filterText[col];
        if (!dateStr) {
            filterDateSelectorYear = getToday().getUTCFullYear();
            filterDateSelectorMonth = getToday().getUTCMonth();
            filterDateSelectorDay = getToday().getUTCDate();
        } else {
            try {
                let {year, month, day} = splitPartialDate(dateStr, dateFormat);
                filterDateSelectorYear = year;
                filterDateSelectorMonth = month;
                filterDateSelectorDay = day;
            } catch (e) {
                console.log(e);
                filterText[col] = "";
                filterDateSelectorYear = getToday().getUTCFullYear();
                filterDateSelectorMonth = getToday().getUTCMonth();
                filterDateSelectorDay = getToday().getUTCDate();
            }
        }
        if (filterMenusOpen[col]) {
            filterMenusOpen[col] = false;
        } else {
            for (let c in filterMenusOpen) {
                if (c == col) {
                    filterMenusOpen[col] = true;
                } else if (filterMenusOpen[c] == true) {
                    filterMenusOpen[c] = false;
                }
            }
        }
        
    }

    async function filterDateSelectorOk(col: CombiTableColumn, year: number, month: number|null, day: number|null) {
        filterText[col.col] = joinPartialDate(year, month, day, dateFormat);
        filterMenusOpen[col.col] = false;
        filter(col, filterText[col.col]);
    }

    function filterDateSelectorCancel(col: CombiTableColumn) {
        filterMenusOpen[col.col] = false;
    }

    // edit/add

    let editRowDateSelectorYear : number|undefined = $state();
    let editRowDateSelectorMonth: number|undefined|null = $state();
    let editRowDateSelectorDay : number|undefined|null = $state();
    
    function toggleEditRowDateDialog(col: string) {
        const dateStr = editRowText[col];
        if (!dateStr) {
            editRowDateSelectorYear = getToday().getUTCFullYear();
            editRowDateSelectorMonth = getToday().getUTCMonth();
            editRowDateSelectorDay = getToday().getUTCDate();
        } else {
            try {
                let {year, month, day} = splitPartialDate(dateStr, dateFormat);
                editRowDateSelectorYear = year;
                editRowDateSelectorMonth = month;
                editRowDateSelectorDay = day;
            } catch (e) {
                console.log(e);
                editRowText[col] = "";
                editRowDateSelectorYear = getToday().getUTCFullYear();
                editRowDateSelectorMonth = getToday().getUTCMonth();
                editRowDateSelectorDay = getToday().getUTCDate();
            }
        }
        if (editRowMenusOpen[col]) {
            editRowMenusOpen[col] = false;
        } else {
            for (let c in editRowMenusOpen) {
                if (c == col) {
                    editRowMenusOpen[col] = true;
                } else if (editRowMenusOpen[c] == true) {
                    editRowMenusOpen[c] = false;
                }
            }
        }
        
    }

    async function editRowDateSelectorOk(col: CombiTableColumn, year: number, month: number|null, day: number|null) {
        const newValue = joinPartialDate(year, month, day, dateFormat);
        if (!internalDirty && newValue != editRowText[col.col]) {
            internalDirty = true;
            dirty = internalDirty;
        }
        editRowText[col.col] = newValue;
        editRowMenusOpen[col.col] = false;
    }

    function editRowDateSelectorCancel(col: CombiTableColumn) {
        editRowMenusOpen[col.col] = false;
    }

    ///// 
    // Width helpers

    function cwidth(col: CombiTableColumn) {
        if (widthType == "auto") return "";
        let out = "";
        if (col.width ) out += `width: ${col.width};`;
        if (col.minWidth ) out += `min-width: ${col.minWidth}:`;
        return out;
    }
    function minw(col: CombiTableColumn) {
        if (widthType == "fixed") return "width: 100%;";
        return col.minWidth ? "min-width:" + col.minWidth + ";" : "";
    }
    function maxw(col: CombiTableColumn) {
        if (widthType == "fixed") return "width: 100%;";
        return col.maxWidth ? "max-width:" + col.maxWidth + ";" : "";
    }
    function eminw(col: CombiTableColumn, min="") {
        if (widthType == "fixed") return "width: 100%;";
        if (min != "") {
            return col.editMinWidth ? "min-width:" + col.editMinWidth + ";" : "min-width: " + min + ";"
        }
        return col.minWidth ? "min-width:" + col.editMinWidth + ";" : "";
    }
    function emaxw(col: CombiTableColumn) {
        if (widthType == "fixed") return "width: 100%;";
        return col.maxWidth ? "max-width:" + col.editMaxWidth + ";" : "";
    }
    function drwidth(col : CombiTableColumn) {
        return col.dropdownWidth ? "width:" + col.dropdownWidth : ";"
    }
    function bg(col : CombiTableColumn) {
        return col.nullable != true ? "bg-required" : "bg-base-200"
    }

    ////////////////////////////////////////////////////////////////
    // Resizing
    
    function disableSelect(event : Event) {
        event.preventDefault();
    }

    /*
    The following will soon be filled with column objects containing
    the header element and their size value for grid-template-columns 
    */
    let headerBeingResized : HTMLElement|null = null;
    let colidxBeingResized: number = -1;
    let mouseMoveCount = 0;

    // The next three functions are mouse event callbacks

    // Where the magic happens. I.e. when they're actually resizing
    const onMouseMove = (e: MouseEvent) => requestAnimationFrame(() => {
        if (!headerBeingResized || colidxBeingResized < 0) return;
    
        // Calculate the desired width
        const horizontalScrollOffset = document.documentElement.scrollLeft;
        let width = (horizontalScrollOffset + e.clientX) - headerBeingResized.offsetLeft;
        const column = columns[colidxBeingResized];
        let minWidthNumberMatch = column.minWidth && column.minWidth.endsWith("px") ?  /([0-9]+)/.exec(column.minWidth) : undefined;
        const minWidthNumber = minWidthNumberMatch && minWidthNumberMatch[0] ? parseInt(minWidthNumberMatch[0]) : undefined;
        if (minWidthNumber && width < minWidthNumber) width = minWidthNumber;
    
        // Update the column object with the new size value
        if (!column) return;
        column.width =  String(width/div.offsetWidth*100 + "%"); // Enforce our minimum
        headerBeingResized.style.width = column.width;

        mouseMoveCount++;
        if (resized && mouseMoveCount == resizeUpdateInterval ) resized(colidxBeingResized, column.width);
        if (resized && mouseMoveCount == resizeUpdateInterval ) resized(colidxBeingResized, column.width);
        if (mouseMoveCount == resizeUpdateInterval) mouseMoveCount = 0;
    });

    // Clean up event listeners, classes, etc.
    const onMouseUp = () => {
        
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('selectstart', disableSelect);
        if (headerBeingResized) headerBeingResized.classList.remove('header--being-resized');
        if (resizeEnded) resizeEnded(colidxBeingResized, columns[colidxBeingResized].width ?? "");
        headerBeingResized = null;
        colidxBeingResized = -1;
    };

    // Get ready, they're about to resize
    const initResize = (evt : MouseEvent, colidx: number) => {
        if (widthType == "auto" || !resizable) return;
        window.addEventListener('selectstart', disableSelect);
        
        //headerBeingResized = (evt.target as any).parentNode as HTMLElement;
        headerBeingResized = document.getElementById("table_"+uuid+"_header_"+colidx);
        if (!headerBeingResized) {
            console.log("Didn't click on header");
            return;
        }
        colidxBeingResized = colidx;
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        headerBeingResized.classList.add('header--being-resized');
        mouseMoveCount = 0;
        if (resizeStarted) resizeStarted(colidx);
    };

    let loading = $state(false);

    async function load(fn: () => Promise<void>) {
        loading = true;
        try {
            await fn();
        } finally {
            loading = false;
        }
    }
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<div class="{loading ? "cursor-wait" : "cursor-auto"} {widthType=="auto" ? "overflow-x-auto": "w-full"} overflow-y-visible" bind:this={div}>
    <table class="table table-{widthType} {zebra? "table-zebra" : ""} {tableClasses} overflow-y-visible {widthType=="auto" ? "overflow-x-auto": "w-full"} {link? "cursor-pointer" : ""}" style="{tableHeightStyle} bg-base-100 {tableStyles}" 
        bind:this={table}>
        <thead class="{stickyHeadRowClass} z-10">

            <!-- header row -->
            <tr class="bg-base-100 z-10 ">
                {#if select}
                    <!-- checkbox column -->
                    <td id={"table_"+uuid+"_header_-1"} class="bg-base-200" style="width: 40px;"></td>
                {/if}
                {#each columns as col, colidx}
                    <th id={"table_"+uuid+"_header_"+colidx} class="z-10 bg-base-200 my-0 {widthType=="fixed" && resizable? "pr-0" : ""} py-0 {colidx == columns.length-1 || !resizable  || widthType == "auto" || true ? "" : "border-r-2 border-r-base-100"}" style="{cwidth(col)}">
                        <div class="flex flex-row m-0 ">
                            <div class="flex-1 py-3">
                        {#if enableSort && (col.sortable === undefined || col.sortable == true)}
                            <!-- svelte-ignore a11y_missing_attribute -->
                            <a tabindex="0" class="{loading ? 'cursor-wait' : 'cursor-pointer'}" 
                                onclick={() => load(() => sort(col.col))} 
                                role="button" onkeyup={(evt) => {if (evt.key == "Enter") sort(col.col)}}
                                style="{minw(col)} {maxw(col)}"
                                >{col.name}</a>&nbsp;{#if col.col == sortCol}
                                <span class="tail-icon align-text-top">
                                    {#if sortDirection == "ascending"}
                                        {@html upIcon}
                                    {:else}
                                        {@html downIcon}
                                    {/if}
                                </span>
                            {/if}
                        {:else}
                            <span class="text-primary"
                                style="{minw(col)} {maxw(col)}"
                            
                            >{col.name}</span>
                        {/if}
                        </div>
                        {#if widthType == "fixed" && resizable && colidx < columns.length-1}
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div class="flex-0 resize-handle w-2 p-0 m-0 min-w-1" onmousedown={(evt) => initResize(evt, colidx)}></div>
                        {/if}
                        </div>
                    </th>
                {/each}

                <!-- actions column-->
                {#if enableFilter || (addUrl && editable) || (editUrl && editable) || deleteUrl || linkUrl || unlinkUrl}
                {@const width = deleteUrl && unlinkUrl ? "80px" : "60px"}
                    <td class="last:sticky last:right-0 z-10 bg-base-200 border-l-0" style="width: {deleteUrl && unlinkUrl ? "80px" : "60px"};"></td>
                {/if}
            </tr>
        </thead>

        <!-- body -->
        <tbody>

            <!-- filter row -->
            {#if enableFilter}
                <tr class="pb-0 border-none mb-0">
                    {#if select}
                        <td></td>
                    {/if}
                    <td colspan="{columns.length+1}" class="pb-0">
                        <p class="small m-0 p-0 text-primary ml-1 mb-0">
                            Filter
                            {#if ids.length > 0}
                                    <!-- svelte-ignore a11y_missing_attribute -->
                                    &nbsp;&nbsp;<a tabindex="0" class="{loading ? 'cursor-wait' : 'cursor-pointer'}" onclick={() => clearIds()} role="button" onkeyup={() => clearIds()}>[Clear ID filter]</a>
                            {/if}
                        </p>
                    </td>
                </tr>
                <tr class="mt-0">
                    {#if select}
                        <!-- checkbox column -->
                        <td></td>
                    {/if}
                    {#each columns as col, colidx}
                        <td class="align-bottom" > <!-- style="{maxWidthStyle[col.col]}"-->
                            {#if col.type == "boolean"}
                                <div tabindex="-1" class="join bg-base-200">
                                    <input readonly tabindex="-1" bind:value={filterText[col.col]} class="input join-item bg-base-200" style="{eminw(col)} {emaxw(col)}"/>
                                    <details class="dropdown dropdown-end" bind:open={filterMenusOpen[col.col]}>
                                    <summary id={"filter_select_summary_"+uuid+"_"+col.col} class="btn join-item btn-outline px-2 border-gray-600" 
                                        onkeyup={(evt) => {if (evt.key == "Escape") {
                                                filterMenusOpen[col.col]=false
                                            } else if (evt.key.toLowerCase() == normalize(Yes.charAt(0))) {
                                                filterMenusOpen[col.col] = false;
                                                load(() => filter(col, true));
                                            } else if (evt.key.toLowerCase() == normalize(No.charAt(0))) {
                                                filterMenusOpen[col.col] = false;
                                               load(() => filter(col, false));
                                            } else if (evt.key.toLowerCase() == "-") {
                                                filterMenusOpen[col.col] = false;
                                                load(() => filter(col, undefined));
                                            }}}
                                        onblur={(evt) => closeFilter(evt, col)}>&#x25bc</summary>
                                    <ul id={"filter_select_"+uuid+"_"+col.col} class="menu dropdown-content bg-base-100 rounded z-1 p-2 border mt-2 border-gray-600" style="{drwidth(col)}">
                                        <!-- svelte-ignore a11y_missing_attribute -->
                                        <li><a tabindex="0" id={"filter_select_"+uuid+"_"+col.col+"-"} 
                                            onclick={() => load(() => filter(col, undefined))} 
                                            role="button" onkeyup={(evt) => {if (evt.key == "Enter") {
                                                load(() => filter(col, undefined));
                                            } else if (evt.key == "Escape") {
                                                filterMenusOpen[col.col]=false
                                            } else if (evt.key.toLowerCase() == normalize(Yes.charAt(0))) {
                                                filterMenusOpen[col.col] = false;
                                                load(() => filter(col, true));
                                            } else if (evt.key.toLowerCase() == normalize(No.charAt(0))) {
                                                filterMenusOpen[col.col] = false;
                                                load(() => filter(col, false));
                                            } else if (evt.key.toLowerCase() == "-") {
                                                filterMenusOpen[col.col] = false;
                                                load(() => filter(col, undefined));
                                            }}}>{Unset}</a></li>
                                        <!-- svelte-ignore a11y_missing_attribute -->
                                        <li><a tabindex="0" id={"filter_select_"+uuid+"_"+col.col+"-f"} 
                                            onclick={() => load(() => filter(col, false))} 
                                            role="button" onkeyup={(evt) => {if (evt.key == "Enter") {
                                                load(() => filter(col, undefined));
                                            } else if (evt.key == "Escape") {
                                                filterMenusOpen[col.col]=false
                                            } else if (evt.key.toLowerCase() == normalize(Yes.charAt(0))) {
                                                filterMenusOpen[col.col] = false;
                                                load(() => filter(col, true));
                                            } else if (evt.key.toLowerCase() == normalize(No.charAt(0))) {
                                                filterMenusOpen[col.col] = false;
                                                load(() => filter(col, false));
                                            } else if (evt.key.toLowerCase() == "-") {
                                                filterMenusOpen[col.col] = false;
                                                load(() => filter(col, undefined));
                                            }}}>{No}</a></li>
                                        <!-- svelte-ignore a11y_missing_attribute -->
                                        <li><a tabindex="0" id={"filter_select_"+uuid+"_"+col.col+"-t"} 
                                            onclick={() => load(() => filter(col, true))} 
                                            role="button" onkeyup={(evt) => {if (evt.key == "Enter") {
                                                load(() => filter(col, undefined));
                                            } else if (evt.key == "Escape") {
                                                filterMenusOpen[col.col]=false
                                            } else if (evt.key.toLowerCase() == normalize(Yes.charAt(0))) {
                                                filterMenusOpen[col.col] = false;
                                                load(() => filter(col, true));
                                            } else if (evt.key.toLowerCase() == normalize(No.charAt(0))) {
                                                filterMenusOpen[col.col] = false;
                                                load(() => filter(col, false));
                                            } else if (evt.key.toLowerCase() == "-") {
                                                filterMenusOpen[col.col] = false;
                                                load(() => filter(col, undefined));
                                            }}}>{Yes}</a></li>
                                    </ul>
                                    </details>
                                </div>
                           {:else if (col.type == "select:string" || col.type == "select:integer") && col.names != undefined}    
                                <div tabindex="-1" class="join bg-base-200">
                                    <input readonly tabindex="-1" class="input bg-base-200 join-item" style="{eminw(col)} {emaxw(col)}"
                                    onblur={(evt) => closeFilter(evt, col)} bind:value={filterText[col.col]}/>
                                    <details class="dropdown dropdown-end join-item" bind:open={filterMenusOpen[col.col]}>
                                        <summary id={"filter_select_summary_"+uuid+"_"+col.col} class="btn px-2 join-item btn-outline border-gray-600" 
                                            onkeyup={(evt) => {if (evt.key == "Escape") {
                                                filterMenusOpen[col.col]=false
                                            } else if (col.names) {
                                                const k = evt.key.toLowerCase();
                                                for (let i=0; i<col.names.length; ++i) {
                                                    if (k == normalize(col.names[i].charAt(0))) {
                                                        filterMenusOpen[col.col]= true;
                                                        document.getElementById("filter_select_"+uuid+"_"+col.col+"-"+i)?.focus();
                                                        break;
                                                    }
                                                }
                                            }}}
                                            onblur={(evt) => closeFilter(evt, col)}>&#x25bc</summary>
                                        <ul id={"filter_select_"+uuid+"_"+col.col} class="menu dropdown-content bg-base-100 rounded   z-1 p-2 mt-2 border border-gray-600" style={drwidth(col)}>
                                            <div class="overflow-y-auto" style="max-height: {maxDropdownHeight};">
                                                <!-- svelte-ignore a11y_missing_attribute -->
                                                <li><a tabindex="0" id={"filter_select_"+uuid+"_"+col.col+"-"} 
                                                    onclick={() => load(() => filter(col, ""))} 
                                                    role="button" onkeyup={(evt) => {if (evt.key == "Enter") {
                                                        load(() => filter(col, ""));
                                                    } else if (evt.key == "Escape") {
                                                        filterMenusOpen[col.col]=false
                                                    } else if (col.names) {
                                                        const k = evt.key.toLowerCase();
                                                        for (let i=0; i<col.names.length; ++i) {
                                                            if (k == normalize(col.names[i].charAt(0))) {
                                                                filterMenusOpen[col.col]= true;
                                                                document.getElementById("filter_select_"+uuid+"_"+col.col+"-"+i)?.focus();
                                                                break;
                                                            }
                                                        }
                                                   }}}>{Unset}</a></li>
                                                {#each col.names as name, i}
                                                    <!-- svelte-ignore a11y_missing_attribute -->
                                                    <li><a tabindex="0" id={"filter_select_"+uuid+"_"+col.col+"-"+i} 
                                                    onclick={() => load(() => filter(col, col.values ? col.values[i]+"" : name))} 
                                                    role="button" onkeyup={(evt) => {if (evt.key == "Enter") {
                                                        load(() => filter(col, col.values ? col.values[i]+"" : name));
                                                    } else if (evt.key == "Escape") {
                                                        filterMenusOpen[col.col]=false
                                                    } else if (col.names) {
                                                        const k = evt.key.toLowerCase();
                                                        for (let i=0; i<col.names.length; ++i) {
                                                            if (k == normalize(col.names[i].charAt(0))) {
                                                                filterMenusOpen[col.col]= true;
                                                                document.getElementById("filter_select_"+uuid+"_"+col.col+"-"+i)?.focus();
                                                                break;
                                                            }
                                                        }
                                                    }}}>{name}</a></li>
                                                {/each}
                                            </div>
                                        </ul>
                                    </details>
                                </div>

                            {:else if col.autoCompleteLink}    
                                <div class="dropdown overflow:visible dropdown-open" id={"filter_ac_"+col.col} >
                                    <input class="input m-0 w-full bg-base-200" style="{col.editMinWidth ? "min-width:" + col.editMinWidth + ";" : ""} {col.editMaxWidth ? "max-width:" + col.editMaxWidth + ";" : ""}"
                                        onkeyup={(evt) => {if (evt.key == "Escape") {
                                            autoCompleteOpen[col.col]=false
                                        } else if (evt.key != "Tab") {
                                            autoCompleteKeyPress(evt, col, filterText[col.col], true)
                                        }}}
                                        bind:value={filterText[col.col]}
                                        onfocusout={(event) => {handleACBlur(event, col)}}
                                        />
                                    {#if autoCompleteOpen[col.col] && editRow == undefined}
                                    <ul class="menu dropdown-content border rounded border-gray-600 max-h-0.3 overflow-auto bg-base-200 rounded-box z-1 p-2 mt-2 shadow" style="{drwidth(col)}">
                                        {#each autoCompleteData as name}
                                            <!-- svelte-ignore a11y_missing_attribute -->
                                            <li><a tabindex="0" 
                                            onclick={() => load(() => autoCompleteUpdate_filter(col, name))} 
                                            role="button" onkeyup={(evt) => {if (evt.key == "Enter") {load(() => autoCompleteUpdate_filter(col, name))} else if (evt.key == "Escape") {autoCompleteOpen[col.col]=false}}}>{name}</a></li>
                                        {/each}
                                    </ul>
                                    {/if}                                                                            
                                </div>
                            {:else if col.type == "date" || col.type == "partialdate"}    
                                <div class="join">
                                    <input type="text join-item" class="input bg-base-200 w-full" style="{eminw(col)} {emaxw(col)}" 
                                        bind:value={filterText[col.col]} 
                                        onkeypress={(evt) => {if (evt.key == "Escape") {filterMenusOpen[col.col]=false} else {filterKeyPress(evt, col, filterText[col.col])}}}/>
                                    <button class="btn join-item btn-outline px-1 border-gray-600" 
                                        onclick={() => toggleFilterDateDialog(col.col)} 
                                        onkeyup={(evt) => {if (evt.key == "Escape") {filterMenusOpen[col.col]=false} }}>{@html calendarIcon}</button>
                                    <details class="dropdown dropdown-end" bind:open={filterMenusOpen[col.col]} 
                                        id={"filter_date_"+col.col} 
                                    >
                                        <summary class="hidden" ></summary>
                                            <DateSelector 
                                                id={"filter_dateselector_"+col.col}
                                                classes="menu dropdown-content border rounded border-gray-600 max-h-0.3 overflow-auto bg-base-200 rounded-box z-1 p-2 mt-2 shadow mt-12 ml-4" 
                                                dateFormat={dateFormat as "yyyy-mm-dd"|"mm-dd-yyyy"|"dd-mm-yyyy"}
                                                year={filterDateSelectorYear} 
                                                month={filterDateSelectorMonth} 
                                                day={filterDateSelectorDay} 
                                                allowPartial={true}
                                                onOk={(year, month, day) => load(() => filterDateSelectorOk(col, year, month, day))}
                                                onCancel={() => filterDateSelectorCancel(col)}
                                            ></DateSelector>
                                    </details>

                                </div>
                            {:else}
                                <input type="text" class="input bg-base-200 w-full" style="{eminw(col)} {emaxw(col)}" 
                                    bind:value={filterText[col.col]} 
                                    onblur={() => {if (filterText[col.col]) load(() => filter(col, filterText[col.col]))}} 
                                    onkeyup={(evt) => filterKeyPress(evt, col, filterText[col.col])}/>
                            {/if}
                        </td>
                    {/each}
                    {#if enableFilter || (addUrl && editable) || (editUrl && editable) || deleteUrl || linkUrl}
                        <td class="last:sticky last:right-0 z-10">
                            {#if haveFilters}
                            <span tabindex="0" role="button" onkeyup={(evt) => {if (evt.key == "Enter") load(() => clearFilters())}}
                            class=" mt-1.5 -ml-5.5 flex {loading ? 'cursor-wait' : 'cursor-pointer'}" onclick={() => load(() => clearFilters())}>{@html crossIcon}</span>
                            {/if}
                        </td>
                    {/if}
                </tr>
            {/if}

            <!-- add row -->
            {#if !updateDisabled && ((addUrl && editable) || linkUrl)}
                <tr class="">
                    {#if editRow == -1 || editRow == -2}
                        {#if select}
                            <!-- checkbox column -->
                            <td></td>
                        {/if}
                        {#each columns as col, colidx}
                            {#if editRow == -1 || col.col == primaryKey}
                                <td class="align-bottom" > <!-- style="{maxWidthStyle[col.col]}" -->
                                    {#if colidx == 0}
                                        <p class="small m-0 p-0 pb-1 text-primary ml-1">New</p>
                                    {/if}
                                    {#if !col.readOnly}
                                        {#if col.type == "boolean"}

                                            <div tabindex="-1" class="join bg-base-200">
                                                <input readonly tabindex="-1" bind:value={editRowText[col.col]} 
                                                    class="input join-item bg-base-200 {bg(col)}" style="{eminw(col)} {emaxw(col)}"
                                                    onkeyup={(evt) => {if (evt.key == "Escape") {editRowMenusOpen[col.col]=false}}}
                                                />

                                                <details class="dropdown dropdown-end" bind:open={editRowMenusOpen[col.col]}>
                                                <summary class="btn btn-outline px-2 border-gray-600 {bg(col)} join-item" 
                                                    onkeyup={(evt) => {if (evt.key == "Escape") {
                                                        editRowMenusOpen[col.col]=false
                                                    } else if (evt.key.toLowerCase() == normalize(Yes.charAt(0))) {
                                                        filterMenusOpen[col.col] = false;
                                                        editRowUpdate(col, true);
                                                    } else if (evt.key.toLowerCase() == normalize(No.charAt(0))) {
                                                        filterMenusOpen[col.col] = false;
                                                        editRowUpdate(col, false);
                                                    } else if (col.nullable && evt.key.toLowerCase() == "-") {
                                                        filterMenusOpen[col.col] = false;
                                                        editRowUpdate(col, null);
                                                    }}}
                                                    onblur={(evt) => closeEdit(evt, col)}>&#x25bc</summary>
                                                <ul id={"edit_select_"+uuid+"_"+col.col} class="menu dropdown-content bg-base-100 rounded z-1 p-2 border mt-2 border-gray-600" style="{drwidth(col)}">
                                                    {#if col.nullable}
                                                        <!-- svelte-ignore a11y_missing_attribute -->
                                                        <li><a tabindex="0" id={"edit_select_"+uuid+"_"+col.col+"-"} 
                                                        onclick={() => editRowUpdate(col, null)} role="button" 
                                                        onkeyup={(evt) => {if (evt.key == "Enter") {
                                                            editRowUpdate(col, null)
                                                        } else if (evt.key == "Escape") {
                                                            editRowMenusOpen[col.col]=false
                                                        } else if (evt.key.toLowerCase() == normalize(Yes.charAt(0))) {
                                                            filterMenusOpen[col.col] = false;
                                                            editRowUpdate(col, true);
                                                        } else if (evt.key.toLowerCase() == normalize(No.charAt(0))) {
                                                            filterMenusOpen[col.col] = false;
                                                            editRowUpdate(col, false);
                                                        } else if (col.nullable && evt.key.toLowerCase() == "-") {
                                                            filterMenusOpen[col.col] = false;
                                                            editRowUpdate(col, null);
                                                        }}}>{Unset}</a></li>
                                                    {/if}
                                                    <!-- svelte-ignore a11y_missing_attribute -->
                                                    <li><a tabindex="0" id={"edit_select_"+uuid+"_"+col.col+"-f"} 
                                                    onclick={() => editRowUpdate(col, false)} role="button" 
                                                    onkeyup={(evt) => {if (evt.key == "Enter") {editRowUpdate(col, false)} else if (evt.key == "Escape") {editRowMenusOpen[col.col]=false}}}>{No}</a></li>
                                                    <!-- svelte-ignore a11y_missing_attribute -->
                                                    <li><a tabindex="0" id={"edit_select_"+uuid+"_"+col.col+"-t"} 
                                                    onclick={() => editRowUpdate(col, true)} 
                                                    role="button" onkeyup={(evt) => {if (evt.key == "Enter") {
                                                        editRowUpdate(col, true)
                                                    } else if (evt.key == "Escape") {
                                                        editRowMenusOpen[col.col]=false
                                                    } else if (evt.key.toLowerCase() == normalize(Yes.charAt(0))) {
                                                        filterMenusOpen[col.col] = false;
                                                        editRowUpdate(col, true);
                                                    } else if (evt.key.toLowerCase() == normalize(No.charAt(0))) {
                                                        filterMenusOpen[col.col] = false;
                                                        editRowUpdate(col, false);
                                                    } else if (col.nullable && evt.key.toLowerCase() == "-") {
                                                        filterMenusOpen[col.col] = false;
                                                        editRowUpdate(col, null);
                                                    }}}>{Yes}</a></li>
                                                </ul>
                                                </details>
                                            </div>

                                        {:else if (col.type == "select:string" || col.type == "select:integer") && col.names != undefined}    

                                        <div tabindex="-1" class="join bg-base-200">
                                            <input readonly tabindex="-1" bind:value={editRowText[col.col]} class="input join-item bg-base-200 {bg(col)}" style="{eminw(col)} {emaxw(col)}"/>

                                            <details class="dropdown dropdown-end" bind:open={editRowMenusOpen[col.col]}>
                                            <summary class="btn btn-outline px-2 border-gray-600 {bg(col)} join-item" 
                                                onkeyup={(evt) => {if (evt.key == "Escape") {
                                                    editRowMenusOpen[col.col]=false
                                                } else if (col.names) {
                                                    const k = evt.key.toLowerCase();
                                                    for (let i=0; i<col.names.length; ++i) {
                                                        if (k == normalize(col.names[i].charAt(0))) {
                                                            editRowMenusOpen[col.col]= true;
                                                            document.getElementById("edit_select_"+uuid+"_"+col.col+"-"+i)?.focus();
                                                            break;
                                                        }
                                                    }
                                                }}}
                                                onblur={(evt) => closeEdit(evt, col)}>&#x25bc</summary>
                                            <ul id={"edit_select_"+uuid+"_"+col.col} class="menu dropdown-content bg-base-100 rounded z-1 p-2 border mt-2 border-gray-600" style={drwidth(col)}>
                                                <div class="overflow-y-auto" style="max-height: {maxDropdownHeight};">
                                                    {#if col.nullable}
                                                        <!-- svelte-ignore a11y_missing_attribute -->
                                                        <li><a tabindex="0" id={"edit_select_"+uuid+"_"+col.col+"-"} 
                                                        onclick={() => editRowUpdate(col, null)} 
                                                        role="button" onkeyup={(evt) => {if (evt.key == "Enter") {
                                                            editRowUpdate(col, null)
                                                        } else if (evt.key == "Escape") {
                                                            editRowMenusOpen[col.col]=false
                                                        } else if (col.names) {
                                                            const k = evt.key.toLowerCase();
                                                            for (let i=0; i<col.names.length; ++i) {
                                                                if (k == normalize(col.names[i].charAt(0))) {
                                                                    editRowMenusOpen[col.col]= true;
                                                                    document.getElementById("edit_select_"+uuid+"_"+col.col+"-"+i)?.focus();
                                                                    break;
                                                                }
                                                            }
                                                        }}}>{Unset}</a></li>
                                                    {/if}
                                                    {#each col.names as name, i}
                                                        <!-- svelte-ignore a11y_missing_attribute -->
                                                        <li><a tabindex="0" id={"edit_select_"+uuid+"_"+col.col+"-"+i} 
                                                        onclick={() => editRowUpdate(col, col.values ? col.values[i]+"" : name)} 
                                                        role="button" onkeyup={(evt) => {if (evt.key == "Enter") {
                                                            editRowUpdate(col, col.values ? col.values[i]+"" : name)
                                                        } else if (evt.key == "Escape") {
                                                            editRowMenusOpen[col.col]=false
                                                        } else if (col.names) {
                                                            const k = evt.key.toLowerCase();
                                                            for (let i=0; i<col.names.length; ++i) {
                                                                if (k == normalize(col.names[i].charAt(0))) {
                                                                    editRowMenusOpen[col.col]= true;
                                                                    document.getElementById("edit_select_"+uuid+"_"+col.col+"-"+i)?.focus();
                                                                    break;
                                                                }
                                                            }
                                                        }}}>{name}</a></li>
                                                    {/each}
                                                </div>
                                            </ul>
                                            </details>
                                        </div>

                                        {:else if col.autoCompleteLink}    
                                            <div class="dropdown overflow:visible dropdown-open" id={"edit_ac_"+col.col}>
                                                <input class="input m-0 w-full {bg(col)} cursor-text" style="{col.editMinWidth ? "min-width:" + col.editMinWidth + ";" : ""} {col.editMaxWidth ? "max-width:" + col.editMaxWidth + ";" : ""}"
                                                    onkeyup={(evt) => {if (evt.key == "Escape") {
                                                        autoCompleteOpen[col.col]=false
                                                    } else if (evt.key != "Tab") {
                                                        autoCompleteKeyPress(evt, col, editRowText[col.col], false)
                                                    }}}
                                                    onfocusout={(event) => {handleACBlur(event, col)}}
                                                    bind:value={editRowText[col.col]}/>
                                                 {#if autoCompleteOpen[col.col] && editRow == -1}
                                                    <ul class="menu dropdown-content border max-h-0.3 overflow-auto bg-base-200 rounded-box z-1 p-2 mt-4 shadow" style="{drwidth(col)}">
                                                    {#each autoCompleteData as name}
                                                        <!-- svelte-ignore a11y_missing_attribute -->
                                                        <li><a tabindex="0" 
                                                        onclick={() => autoCompleteUpdate(col, name)} 
                                                        role="button" onkeyup={(evt) => {if (evt.key == "Enter") {autoCompleteUpdate(col, name)} else if (evt.key == "Escape") {autoCompleteOpen[col.col]=false}}}>{name}</a></li>
                                                    {/each}
                                                </ul>
                                                {/if}
                                            </div>
                                        {:else if col.type == "date" || col.type == "partialdate"}    
                                            <div class="join">
                                                <input type="text join-item" class="input bg-base-200 w-full" style="{eminw(col)} {emaxw(col)}" 
                                                    onkeyup={(evt) => {if (evt.key == "Escape") {editRowMenusOpen[col.col]=false} else {editInputUpdate(evt, col)}}}
                                                    bind:value={editRowText[col.col]} 
                                                />
                                                <button class="btn join-item btn-outline px-1 border-gray-600" 
                                                    onkeyup={(evt) => {if (evt.key == "Escape") {editRowMenusOpen[col.col]=false}}}
                                                    onclick={() => toggleEditRowDateDialog(col.col)} >{@html calendarIcon}</button>
                                                <details class="dropdown dropdown-end" bind:open={editRowMenusOpen[col.col]} 
                                                    id={"editRow_date_"+col.col} 
                                                >
                                                    <summary class="hidden" ></summary>
                                                        <DateSelector 
                                                            id={"editRow_dateselector_"+col.col}
                                                            classes="menu dropdown-content border rounded border-gray-600 max-h-0.3 overflow-auto bg-base-200 rounded-box z-1 p-2 mt-2 shadow mt-12 ml-4" 
                                                            dateFormat={dateFormat as "yyyy-mm-dd"|"mm-dd-yyyy"|"dd-mm-yyyy"}
                                                            year={editRowDateSelectorYear} 
                                                            month={editRowDateSelectorMonth} 
                                                            day={editRowDateSelectorDay} 
                                                            allowPartial={col.type == "partialdate"}
                                                            onOk={(year, month, day) => editRowDateSelectorOk(col, year, month, day)}
                                                            onCancel={() => editRowDateSelectorCancel(col)}
                                                        ></DateSelector>
                                                </details>

                                            </div>
                                        {:else}
                                            <input type="text" class="input w-full {bg(col)}" style="{eminw(col)} {emaxw(col)}" 
                                                bind:value={editRowText[col.col]} 
                                                onkeyup={(evt) => editInputUpdate(evt, col)}
                                            />
                                        {/if}
                                    {:else}
                                    &nbsp; 
                                    {/if}
                                </td>
                            {/if}
                        {/each}
                        {#if enableFilter || (addUrl && editable) || (editUrl && editable) || deleteUrl || linkUrl}
                            <td class="w-4 last:sticky last:right-0 z-10 bg-base-100">
                                {#if internalDirty}
                                    <span 
                                    tabindex="0"
                                    role="button"
                                    onkeyup={(evt) => {if (evt.key == "Enter") {saveEdit()}}}
                                    class="{saveColorClass} flex pt-8 -ml-5 {loading ? 'cursor-wait' : 'cursor-pointer'}" onclick={() => saveEdit()}>{@html checkIcon}</span>
                                {:else}
                                    <span 
                                    class="text-neutral-500 flex pt-8 -ml-5">{@html checkIcon}</span>
                                {/if}
                                    <span 
                                    tabindex="0"
                                    role="button"
                                    onkeyup={(evt) => {if (evt.key == "Enter") {cancelEdit()}}}
                                    class="{cancelColorClass} -mt-5.5 ml-1.5 flex {loading ? 'cursor-wait' : 'cursor-pointer'}" onclick={() => cancelEdit()}>{@html crossIcon}</span>
                            </td>
                        {/if}
                    {:else}
                        {#if select}
                            <td></td>
                        {/if}
                        <td colspan="{columns.length+1}">
                        {#if addUrl && editable}
                            <button class="btn btn-sm mr-2" onclick={() => edit(-1)}>Add</button>
                        {/if}
                        {#if linkUrl}
                            <button class="btn btn-sm" onclick={() => edit(-2)}>Link</button>
                        {/if}
                        {#if haveAddExtra} 
                            {#each addExtra as row}
                                <button class="btn btn-sm" onclick={() => callExtra(row)}>{row.label}</button>
                            {/each}
                        {/if}
                        </td>
                    {/if}
                </tr>
            {/if}
            
            <!-- data rows -->
            {#each rrows as row, rowidx}
                {@const rowLinkClass = link ? "{loading ? 'cursor-wait' : 'cursor-pointer'} hover:bg-base-200" : ""}
                <tr class="{rowLinkClass}"  onclick={() => {if (link) goto(link(row))}}>
                    {#if select}
                        <!-- checkbox column -->
                        <td>
                            {#if editRow == undefined || editRow != rowidx}
                            <div class="form-control">
                                <label class="label {loading ? 'cursor-wait' : 'cursor-pointer'}">
                                  <input type="checkbox" bind:checked={rowChecked[rowidx]} class="checkbox rounded-field" />
                                </label>
                              </div>
                            {/if}                            
                        </td>
                    {/if}
                    {#each columns as col, colidx}

                        {#if editRow == undefined || editRow != rowidx}
                            {@const value = formatColumn(getColumn(row, col), col, false)}
                            <td class="align-top" > <!-- style="{maxWidthStyle[col.col]}"-->
                                {#if (col.type == "date" || col.type == "datetime" || col.nowrap)}
                                    {#if col.link}
                                        <span class="text-nowrap text-base-content"><a class="text-base-content {linkFormat}" href={col.link(row)}>{value}</a></span>
                                    {:else}
                                        <span class="text-nowrap text-base-content">{value}</span>
                                    {/if}
                                {:else if col.type == "array:string"}
                                    {#if col.link}
                                        {#each formatColumn(getColumn(row, col), col, false) as el, i} 
                                            <a class="text-base-content {linkFormat}" href={col.link(row, i)}>{el}</a><br>
                                        {/each}
                                    {:else}
                                        {#each formatColumn(getColumn(row, col), col, false) as el} 
                                            {el}<br>
                                        {/each}
                                    {/if}
                                {:else}
                                    {#if col.link}
                                        <a class="text-base-content {linkFormat}" href={col.link(row)}>{value}</a>
                                    {:else}
                                        {value}
                                    {/if}
                                {/if}
                            </td>
                        {:else}
                            <td class="align-bottom" > <!-- style="{maxWidthStyle[col.col]}" -->
                                {#if colidx == 0}
                                    <p class="small m-0 p-0 pb-1 text-primary ml-1">Edit</p>
                                {/if}
                                {#if col.readOnly}
                                    {@const value = formatColumn(getColumn(row, col), col, false)}
                                    {#if (col.type == "date" || col.type == "datetime" || col.nowrap)}
                                        <span class="text-nowrap text-base-content align-middle">{value}</span>
                                    {:else}
                                        <span class="align-middle">{value}</span>
                                    {/if}
                                {:else}
                                    {#if col.type == "boolean"}

                                        <div tabindex="-1" class="join bg-base-200">
                                            <input readonly tabindex="-1" 
                                                bind:value={editRowText[col.col]} class="input join-item bg-base-200 {bg(col)}" 
                                                style="{eminw(col)} {emaxw(col)}"
                                            />
                                            <details class="dropdown dropdown-end" bind:open={editRowMenusOpen[col.col]}>
                                            <summary class="btn btn-outline px-2 border-gray-600 {bg(col)} join-item" 
                                                onkeyup={(evt) => {if (evt.key == "Escape") {
                                                    editRowMenusOpen[col.col] = false
                                                } else if (evt.key.toLowerCase() == normalize(Yes.charAt(0))) {
                                                    filterMenusOpen[col.col] = false;
                                                    editRowUpdate(col, true);
                                                } else if (evt.key.toLowerCase() == normalize(No.charAt(0))) {
                                                    filterMenusOpen[col.col] = false;
                                                    editRowUpdate(col, false);
                                                } else if (col.nullable && evt.key.toLowerCase() == "-") {
                                                    filterMenusOpen[col.col] = false;
                                                    editRowUpdate(col, null);
                                                }}}
                                                onblur={(evt) => closeEdit(evt, col)}>&#x25bc</summary>
                                            <ul id={"edit_select_"+uuid+"_"+col.col} class="menu dropdown-content bg-base-100 rounded z-1 p-2 border mt-2 border-gray-600" style="{drwidth(col)}">
                                                {#if col.nullable}
                                                <!-- svelte-ignore a11y_missing_attribute -->
                                                <li><a tabindex="0" id={"edit_select_"+uuid+"_"+col.col+"-"} 
                                                    onclick={() => editRowUpdate(col, null)} 
                                                    role="button" onkeyup={(evt) => {if (evt.key == "Enter") {
                                                        editRowUpdate(col, null)
                                                    } else if (evt.key == "Escape") {
                                                        editRowMenusOpen[col.col]=false
                                                    } else if (evt.key.toLowerCase() == normalize(Yes.charAt(0))) {
                                                        filterMenusOpen[col.col] = false;
                                                        editRowUpdate(col, true);
                                                    } else if (evt.key.toLowerCase() == normalize(No.charAt(0))) {
                                                        filterMenusOpen[col.col] = false;
                                                        editRowUpdate(col, false);
                                                    } else if (col.nullable && evt.key.toLowerCase() == "-") {
                                                        filterMenusOpen[col.col] = false;
                                                        editRowUpdate(col, null);
                                                    }}}>{Unset}</a></li>
                                                {/if}
                                                <!-- svelte-ignore a11y_missing_attribute -->
                                                <li><a tabindex="0" id={"edit_select_"+uuid+"_"+col.col+"-f"} 
                                                    onclick={() => editRowUpdate(col, false)} 
                                                    role="button" onkeyup={(evt) => {if (evt.key == "Enter") {
                                                        editRowUpdate(col, false)
                                                    } else if (evt.key == "Escape") {
                                                        editRowMenusOpen[col.col] = false
                                                    } else if (evt.key.toLowerCase() == normalize(Yes.charAt(0))) {
                                                        filterMenusOpen[col.col] = false;
                                                        editRowUpdate(col, true);
                                                    } else if (evt.key.toLowerCase() == normalize(No.charAt(0))) {
                                                        filterMenusOpen[col.col] = false;
                                                        editRowUpdate(col, false);
                                                    } else if (col.nullable && evt.key.toLowerCase() == "-") {
                                                        filterMenusOpen[col.col] = false;
                                                        editRowUpdate(col, null);
                                                    }}}>{No}</a></li>
                                                <!-- svelte-ignore a11y_missing_attribute -->
                                                <li><a tabindex="0" id={"edit_select_"+uuid+"_"+col.col+"-t"} 
                                                    onclick={() => editRowUpdate(col, true)} role="button" 
                                                    onkeyup={(evt) => {if (evt.key == "Enter") {
                                                        editRowUpdate(col, true)
                                                    } else if (evt.key == "Escape") {
                                                        editRowMenusOpen[col.col]=false
                                                    } else if (evt.key.toLowerCase() == normalize(Yes.charAt(0))) {
                                                        filterMenusOpen[col.col] = false;
                                                        editRowUpdate(col, true);
                                                    } else if (evt.key.toLowerCase() == normalize(No.charAt(0))) {
                                                        filterMenusOpen[col.col] = false;
                                                        editRowUpdate(col, false);
                                                    } else if (col.nullable && evt.key.toLowerCase() == "-") {
                                                        filterMenusOpen[col.col] = false;
                                                        editRowUpdate(col, null);
                                                    }}}>{Yes}</a></li>
                                            </ul>
                                            </details>
                                        </div>

                                    {:else if (col.type == "select:string" || col.type == "select:integer") && col.names != undefined}    

                                        <div tabindex="-1" class="join bg-base-200">
                                            <input readonly tabindex="-1" bind:value={editRowText[col.col]} class="input join-item bg-base-200 {bg(col)}" style="{eminw(col)} {emaxw(col)}"/>

                                            <details class="dropdown dropdown-end" bind:open={editRowMenusOpen[col.col]}>
                                            <summary class="btn btn-outline px-2 border-gray-600 {bg(col)} join-item" 
                                                onkeyup={(evt) => {if (evt.key == "Escape") {
                                                    editRowMenusOpen[col.col] = false
                                                } else if (col.names) {
                                                    const k = evt.key.toLowerCase();
                                                    for (let i=0; i<col.names.length; ++i) {
                                                        if (k == normalize(col.names[i].charAt(0))) {
                                                            editRowMenusOpen[col.col]= true;
                                                            document.getElementById("edit_select_"+uuid+"_"+col.col+"-"+i)?.focus();
                                                            break;
                                                        }
                                                    }
                                                }}}
                                                onblur={(evt) => closeEdit(evt, col)}>&#x25bc</summary>
                                            <ul id={"edit_select_"+uuid+"_"+col.col} class="menu dropdown-content bg-base-100 rounded z-1 p-2 border mt-2 border-gray-600" style="{drwidth(col)}">
                                                <div class="overflow-y-auto" style="max-height: {maxDropdownHeight};">
                                                    {#if col.nullable}
                                                        <!-- svelte-ignore a11y_missing_attribute -->
                                                        <li><a tabindex="0" id={"edit_select_"+uuid+"_"+col.col+"-"} 
                                                            onclick={() => editRowUpdate(col, null)} 
                                                            role="button" onkeyup={(evt) => {if (evt.key == "Enter") {
                                                                editRowUpdate(col, null)
                                                            } else if (evt.key == "Escape") {
                                                                editRowMenusOpen[col.col] = false
                                                            } else if (col.names) {
                                                                const k = evt.key.toLowerCase();
                                                                for (let i=0; i<col.names.length; ++i) {
                                                                    if (k == normalize(col.names[i].charAt(0))) {
                                                                        editRowMenusOpen[col.col]= true;
                                                                        document.getElementById("edit_select_"+uuid+"_"+col.col+"-"+i)?.focus();
                                                                        break;
                                                                    }
                                                                }
                                                            }}}>{Unset}</a></li>
                                                    {/if}
                                                    {#each col.names as name, i}
                                                        <!-- svelte-ignore a11y_missing_attribute -->
                                                        <li><a tabindex="0" id={"edit_select_"+uuid+"_"+col.col+"-"+i}
                                                        onclick={() => editRowUpdate(col, col.values ? col.values[i]+"" : name)} 
                                                        role="button" onkeyup={(evt) => {if (evt.key == "Enter") {
                                                            editRowUpdate(col, col.values ? col.values[i]+"" : name)
                                                        } else if (evt.key == "Escape") {
                                                            editRowMenusOpen[col.col] = false
                                                        } else if (col.names) {
                                                            const k = evt.key.toLowerCase();
                                                            for (let i=0; i<col.names.length; ++i) {
                                                                if (k == normalize(col.names[i].charAt(0))) {
                                                                    editRowMenusOpen[col.col]= true;
                                                                    document.getElementById("edit_select_"+uuid+"_"+col.col+"-"+i)?.focus();
                                                                    break;
                                                                }
                                                            }
                                                        }}}>{name}</a></li>
                                                    {/each}
                                                </div>
                                            </ul>
                                            </details>
                                        </div>

                                    {:else if col.autoCompleteLink}    
                                        <div class="dropdown overflow:visible dropdown-open" id={"edit_ac_"+col.col}>
                                            <input class="input m-0 -mb-1 w-full {bg(col)} cursor-text" style="{col.editMinWidth ? "min-width:" + col.editMinWidth + ";" : ""} {col.editMaxWidth ? "max-width:" + col.editMaxWidth + ";" : ""}"
                                                onkeyup={(evt) => {if (evt.key == "Escape") {
                                                    autoCompleteOpen[col.col] = false
                                                } else if (evt.key != "Tab") {
                                                    autoCompleteKeyPress(evt, col, editRowText[col.col], false)
                                                }}}
                                                onfocusout={(event) => {handleACBlur(event, col)}}
                                                bind:value={editRowText[col.col]}/>
                                                {#if autoCompleteOpen[col.col] && editRow >= 0}
                                                <ul class="menu dropdown-content max-h-0.3 overflow-auto bg-base-200 rounded-box z-1 p-2 mt-4 shadow" style="{drwidth(col)}">
                                                {#each autoCompleteData as name}
                                                        <!-- svelte-ignore a11y_missing_attribute -->
                                                        <li><a tabindex="0"
                                                         onclick={() => autoCompleteUpdate(col, name)} 
                                                         role="button" onkeyup={(evt) => {if (evt.key == "Enter") {autoCompleteUpdate(col, name)} else if (evt.key == "Escape") {autoCompleteOpen[col.col] = false}}}>{name}</a></li>
                                                {/each}
                                            </ul>
                                            {/if}
                                        </div>
                                    {:else if col.type == "date" || col.type == "partialdate"}    
                                        <div class="join">
                                            <input type="text join-item" class="input bg-base-200 w-full" style="{eminw(col)} {emaxw(col)}" 
                                                bind:value={editRowText[col.col]} 
                                                onkeyup={(evt) => {if (evt.key == "Escape") {editRowMenusOpen[col.col] = false} else {editInputUpdate(evt, col)}}}
                                            />
                                            <button class="btn join-item btn-outline px-1 border-gray-600" 
                                                onkeyup={(evt) => {if (evt.key == "Escape") {editRowMenusOpen[col.col] = false} }}
                                                onclick={() => toggleEditRowDateDialog(col.col)} >{@html calendarIcon}</button>
                                            <details class="dropdown dropdown-end" bind:open={editRowMenusOpen[col.col]} 
                                                id={"editRow_date_"+col.col} 
                                            >
                                                <summary class="hidden" ></summary>
                                                    <DateSelector 
                                                        id={"editRow_dateselector_"+col.col}
                                                        classes="menu dropdown-content border rounded border-gray-600 max-h-0.3 overflow-auto bg-base-200 rounded-box z-1 p-2 mt-2 shadow mt-12 ml-4" 
                                                        dateFormat={dateFormat as "yyyy-mm-dd"|"mm-dd-yyyy"|"dd-mm-yyyy"}
                                                        year={editRowDateSelectorYear} 
                                                        month={editRowDateSelectorMonth} 
                                                        day={editRowDateSelectorDay} 
                                                        allowPartial={col.type == "partialdate"}
                                                        onOk={(year, month, day) => editRowDateSelectorOk(col, year, month, day)}
                                                        onCancel={() => editRowDateSelectorCancel(col)}
                                                    ></DateSelector>
                                            </details>

                                        </div>
                                    {:else}
                                        <input type="text" class="input {bg(col)} w-full" style="{eminw(col)} {emaxw(col)}" 
                                            bind:value={editRowText[col.col]} 
                                            onkeyup={(evt) => editInputUpdate(evt, col)}
                                            />
                                    {/if}
                                {/if}

                            </td>
                        {/if}
                    {/each}
                    {#if editRow == undefined}
                        <!-- displaying row - only show delete icon if delete allowed -->
                        {#if (editUrl  && editable) || deleteUrl !== undefined}
                            <td class="w-4 last:sticky last:right-0 z-10">
                                {#if editUrl && editable}
                                    <span 
                                        tabindex="0"
                                        role="button"
                                        onkeyup={(evt) => {if (evt.key == "Enter") {edit(rowidx)}}}
                                        class="text-primary -ml-4 flex {loading ? 'cursor-wait' : 'cursor-pointer'}" onclick={() => edit(rowidx)}>{@html editIcon}</span>
                                {/if}
                                {#if unlinkUrl !== undefined}
                                    <span 
                                        tabindex="0"
                                        role="button"
                                        onkeyup={(evt) => {if (evt.key == "Enter") {unlinkRow(rowidx)}}}
                                        class="ml-1 text-error {exitWidthClass} flex {exitHeightClass} {loading ? 'cursor-wait' : 'cursor-pointer'}" 
                                        onclick={() => unlinkRow(rowidx)}>{@html exitIcon}</span>
                                {/if}
                                {#if deleteUrl !== undefined}
                                    <span 
                                        tabindex="0"
                                        role="button"
                                        onkeyup={(evt) => {if (evt.key == "Enter") {deleteRow(rowidx)}}}
                                        class="ml-1 {trashColorClass} {trashWidthClass} flex {trashHeightClass} {loading ? 'cursor-wait' : 'cursor-pointer'}" 
                                        onclick={() => {if (!updateDisabled) deleteRow(rowidx)}}>{@html trashIcon}</span>
                                {/if}
                            </td>
                        {:else if enableFilter}
                            <td class="w-4 last:sticky last:right-0 z-10">
                            </td>
                {/if}
                    {:else if editRow == rowidx}
                        <td class="w-4 last:sticky last:right-0 z-10 bg-base-100">
                            {#if internalDirty}
                                <span 
                                    tabindex="0"
                                    role="button"
                                    onkeyup={(evt) => {if (evt.key == "Enter") {if (!updateDisabled) saveEdit()}}}
                                    class="text-success flex pt-8 -ml-5 {loading ? 'cursor-wait' : 'cursor-pointer'}" 
                                    onclick={() => {if (!updateDisabled) saveEdit()}}>{@html checkIcon}</span>
                            {:else}
                                <span 
                                class="text-neutral-500 flex pt-8 -ml-5">{@html checkIcon}</span>
                            {/if}
                                <span 
                                    tabindex="0"
                                    role="button"
                                    onkeyup={(evt) => {if (evt.key == "Enter") {if (!updateDisabled) cancelEdit()}}}
                                    class="text-error -mt-5.5 ml-1.5 flex {loading ? 'cursor-wait' : 'cursor-pointer'}" 
                                    onclick={() => {if (!updateDisabled) cancelEdit()}}>{@html crossIcon}</span>
                        </td>
                    {/if}
                </tr>
            {/each}
    
        </tbody>
        
    </table>
</div>

{#if paginate > 0 || haveOps}
<div class="ml-3 mt-2">
    {#if paginate > 0}
        {#if havePrevious}
            <button class="btn btn-primary" onclick={() => previous()}>Previous</button>
        {:else}
            <button class="btn btn-disabled">Previous</button>
        {/if}
        {#if haveNext}
            <button class="btn btn-primary ml-2" onclick={() => next()}>Next</button>
        {:else}
            <button class="btn btn-disabled ml-2">Next</button>
        {/if}

        {#if haveOps}
            {@const disabled = !updateDisabled && rowsAreChecked ? "" : "btn-disabled"}
            {#each ops as op}
                <button class="btn {op.highlight === true ? "btn-secondary" : "btn-default"} {disabled} ml-2" onclick={() => execOp(op) }>{op.label}</button>
            {/each}
            <button class="btn btn-neutral {disabled} ml-2" onclick={() => clearSelection() }>Clear Selection</button>
        {/if}

        {#if haveNavExtra}
            {@const disabled = !updateDisabled ? "" : "btn-disabled"}
            {#each navExtra as op}
                <button class="btn {disabled} {op.highlight === true ? "btn-secondary" : "btn-default"} ml-2" onclick={() => callExtra(op) }>{op.label}</button>
            {/each}
        {/if}
        {/if}
</div>
{/if}

<!-- Modal to confirm discarding edit -->
<CombiTableDiscardChanges id={"confirmEditDiscard_"+uuid} okFn={confirmCancelEdit}/>

<!-- Modal to confirm discarding edit when clicking previous -->
<CombiTableDiscardChanges id={"confirmPreviousDiscard_"+uuid} okFn={confirmPrevious}/>

<!-- Modal to confirm discarding edit when clicking previous -->
<CombiTableDiscardChanges id={"confirmNextDiscard_"+uuid} okFn={confirmNext}/>

<!-- Modal to confirm discarding edit when clicking previous -->
<CombiTableDiscardChanges id={"confirmUnlink_"+uuid} title="Unlink god from Olympus?" okFn={confirmUnlinkRow}/>

<!-- Modal to display validation errors -->
<CombiTableValidateDialog id={"validateDialog_"+uuid} errors={validationErrors}/>

<!-- Modal to display information after executing a function -->
<CombiTableInfoDialog id={"infoDialog_"+uuid} info={opInfo}/>

<!-- Modal to display info message then reload -->
<CombiTableInfoDialog id={"reloadDialog_"+uuid} info={opInfo} okFn={reload}/>

<!-- Modal to display validation errors -->
<CombiTableConfirmDeleteDialog id={"confirmDelete_"+uuid} okFn={confirmDeleteRow}/>

<!-- To instantiate tailwind classes that are in variables therefore not seen by the preprocessor -->
<div class="hidden w-full"></div>
<div class="hidden ml-1"></div>
<div class="hidden ml-6"></div>
<div class="hidden ml-12"></div>
<div class="hidden -mt-5.5 "></div>
<div class="hidden overflow-x-auto"></div>
<div class="hidden table-fixed border-r-2 border-r-base-100"></div>
<div class="hidden table-auto"></div>
<div class="hidden -mt-5.25 pr-0"></div>
<div class="hidden -mt-10.5"></div>
<div class="hidden w-20"></div>
<div class="hidden w-15"></div>
<div class="hidden w-12 "></div>
<div class="hidden -mt-5"></div>
<div class="hidden text-base-content"></div>
<div class="hidden align-middle"></div>
<div class="hidden sticky"></div>
<div class="hidden top-0"></div>
<div class="hidden bg-required"></div>
<div class="hidden bg-required"></div>
<div class="hidden -mt-4.5"></div>
<div class="hidden bg-base-200"></div>
<div class="hidden  -mt-5"></div>
<div class="hidden -mt-5.25"></div>
<div class="hidden hover:bg-base-200"></div>
<div class="hidden text-error"></div>
<div class="hidden text-success"></div>
<div class="hidden "></div>
<div class="hidden cursor-auto"></div>
<div class="hidden cursor-wait"></div>
<div class="hidden cursor-pointer  hover:bg-neutral   text-neutral-500"></div>
<div class="table table-zebra"></div>
<style>
.tail-icon {
  white-space: nowrap;
  /* Make sure last word and icon will break ultimately */
  display: inline-flex;
  flex-wrap: wrap; 
}

.acdropdown {
  position: relative;
  display: inline-block;
}

.acdropdown > *:not(summary):focus {
  outline: 2px solid transparent;
  outline-offset: 2px;
}

.acdropdown .dropdown-content {
  position: absolute;
}

.acdropdown:is(:not(details)) .dropdown-content {
  visibility: hidden;
  opacity: 0;
  transform-origin: top;
  --tw-scale-x: .95;
  --tw-scale-y: .95;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, -webkit-backdrop-filter;
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter, -webkit-backdrop-filter;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-timing-function: cubic-bezier(0, 0, 0.2, 1);
  transition-duration: 200ms;
}

#modalOverlay {
  position: fixed; /* Sit on top of the page content */
  width: 100%; /* Full width (cover the whole page) */
  height: 100%; /* Full height (cover the whole page) */
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.5); /* Black background with opacity */
  z-index: 2; /* Specify a stack order in case you're using a different order for other elements */
  /*cursor: pointer;*/ /* Add a pointer on hover */
}

.resize-handle {
  /*position: absolute;
  top: 0;
  bottom: 0;*/
  background: var(--color-base-100);
  /*background: white;*/
  /*opacity: 0;*/
  opacity: 1;
  width: 2px;
  cursor: col-resize;
}

.resize-handle:hover,
/* The following selector is needed so the handle is visible during resize even if the mouse isn't over the handle anymore */
.header--being-resized .resize-handle {
  opacity: 0.5;
}

/*th:hover .resize-handle {
  opacity: 0.3;
}*/

</style>