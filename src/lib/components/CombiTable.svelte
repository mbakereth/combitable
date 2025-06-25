<script lang="ts">
    // Copyright (c) 2024 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file
    import { tick } from 'svelte';
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
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
    import CombiTableDiscardChanges from '$lib/components/CombiTableDiscardChanges.svelte';
    import CombiTableValidateDialog from '$lib/components/CombiTableErrorDialog.svelte';
    import CombiTableInfoDialog from '$lib/components/CombiTableInfoDialog.svelte';
    import CombiTableConfirmDeleteDialog from '$lib/components/CombiTableConfirmDeleteDialog.svelte';

    let table : Element;

    export let rows : {[key:string]:any|undefined}[];
    $: rrows = rows;
    export let columns : CombiTableColumn[];
    export let enableSort = false;
    export let enableFilter = false;
    export let defaultSort : string;
    export let dateFormat = "yyyy-mm-dd"; // or "yyyy-mm-dd" or "mm-dd-yyyy"
    export let paginate = 0;
    export let havePrevious = false;
    export let haveNext = false;
    export let addUrl : string|undefined = undefined;
    export let linkUrl : string|undefined = undefined;
    export let unlinkUrl : string|undefined = undefined;
    export let editUrl : string|undefined = undefined;
    export let deleteUrl : string|undefined = undefined;
    export let presets : CombiTablePresets|undefined = undefined;
    export let linkFormat : string = "";
    export let urlSuffix : string = "";
    export let widthType : "auto"|"fixed" = "auto";
    export let primaryKey : string = "";
    export let select : boolean = false;
    export let restOfScreenHeight : number|undefined = undefined;
    export let stickyHeadRow = false;
    export let ops : CombiTableOp[] = [];
    export let preview : boolean = false;
    let haveOps = ops.length > 0;
    if (haveOps) select = true;
    export let addExtra : CombiTableExtraButton[] = [];
    let haveAddExtra = addExtra.length > 0;
    export let navExtra : CombiTableExtraButton[] = [];
    let haveNavExtra = navExtra.length > 0;

    let stickyHeadRowClass = stickyHeadRow ? "sticky top-0" : "";

    $: rowChecked = rows.map((row) => false);
    $: rowsAreChecked = rowChecked.reduce(
        (accumulator, currentValue) => accumulator || currentValue,
        false,
    );
    export let primaryKeysChecked : (string|number)[] = [];
    $: {
        if (primaryKey) {
            primaryKeysChecked = [];
            rowChecked.forEach((checked, i) => {
                if (checked) primaryKeysChecked.push(rrows[i][primaryKey]);
            });
        }
    }

    let innerWidth = 0
    let innerHeight = 0
    $: maxHeight = restOfScreenHeight ? innerHeight - restOfScreenHeight : undefined;
    $: tableHeightStyle = maxHeight && innerWidth > 0 ? "display: block; max-height:" + maxHeight + "px; min-height: " + maxHeight + "px" : "";
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

    export function printDate(date : Date|undefined|null) : string {
        if (!date) return "-";
        if (dateFormat == "yyyy-mm-dd") {
            return String(date.getFullYear()) + "-" + String((date.getMonth())+1).padStart(2, '0') + "-" + String(date.getDate()).padStart(2, '0')
        }
        if (dateFormat == "mm-dd-yyyy") {
            return String(date.getMonth()).padStart(2, '0') + "-" + String((date.getDate())+1).padStart(2, '0') + "-" + String(date.getFullYear())
        }
        return String(date.getDate()).padStart(2, '0') + "-" + String((date.getMonth())+1).padStart(2, '0') + "-" + String(date.getFullYear())
    }

    export function stringIsDate(val : string) {
        if (dateFormat == "yyyy-mm-dd") return /^( *[0-9][0-9][0-9][0-9]-[0-9][0-9]?-[0-9][0-9]? *?)$/.test(val);
        return /^( *[0-9][0-9]?-[0-9][0-9]?-[0-9][0-9][0-9][0-9] *?)$/.test(val) ;
    }

    export function parseDate(val : string) : Date {
        val = val.trim();
        if (val.indexOf("T") > 0) {
            val = val.split("T")[0];
            return parseISODate(val);
        }
        const parts = val.trim().split("-");
        if (parts.length != 3) throw Error("Date " + val + " should be " + dateFormat);
        let dateStr = parts[2] + "-" + parts[1] + "-" + parts[0];
        if (dateFormat == "yyyy-mm-dd") dateStr = val;
        if (dateFormat == "mm-dd-yyyy") dateStr = parts[2] + "-" + parts[0] + "-" + parts[1];
        return parseISODate(dateStr);
    }

    // SVG wants to display with a new line.  Depending on what icons
    // we are displaying in the actions column set how far to offset
    // the delete icon
    let exitHeightClass = editUrl ? "-mt-[18px]" : "";
    let exitWidthClass = editUrl ? "ml-1" : "-ml-6";
    let trashHeightClass = editUrl && unlinkUrl ? "-mt-[20px]" : (editUrl || unlinkUrl ? "-mt-[21px]" : "");
    let trashWidthClass = editUrl && unlinkUrl ? "ml-6" :  (editUrl || unlinkUrl ? "-ml-1" : "-ml-6");

    // put the name of the primary key in pk
    // also save select maps
    let pk  = primaryKey;
    let selectMap : {[key:string] : {[key:string|number]:string}} = {}
    let selectReverseMap : {[key:string] : {[key:string]:string|number}} = {}
    for (let column of columns) {
        if ((column.type == "select:string" || column.type == "select:integer") && column.names && column.values) {
            selectMap[column.col] = {};
            selectReverseMap[column.col] = {};
            for (let i=0; i<column.values.length; ++i) {
                selectMap[column.col][column.values[i]] = column.names[i];
                selectReverseMap[column.col][column.names[i]] = column.values[i];
            }
        }
    }
    if (pk == "" && (editUrl)) {
        console.log("Warning: edit enabled but no primary key column - disabling edit");
        editUrl = undefined;
    }

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

    function asString(val : string|number|boolean|undefined|Date, type : string|undefined=undefined) : string {
        if (val == undefined) return "";
        if (typeof(val) == "boolean") return val ? "Yes" : "No";
        if (typeof(val) == "number") return val+"";
        if (typeof(val) == "string") return val;
        if (val instanceof Date && type=="date") printDate(val)
        if (val instanceof Date) return printDate(val);
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
    function getColumn(obj : {[key:string]:any}, name : string) : any|undefined{
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
                    res = res[part][0]
                }
            } else {
                res = res && part in res ? res[part] : undefined;
            }
        }
        return res;
    }
    
    // format a value of arbitrary type for displaying in the table
    // according to the column type
    function formatColumn(val : any, col: CombiTableColumn) {
        if (val == undefined) return "-";
        if (typeof(val) == "boolean") {
            return val ? "Yes" : "No";
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
        return val;
    }

    // load previous page, confirming discard changes if dirty
    function previous() {
        if (!dirty) {
            confirmPrevious()
        } else {
            (document.querySelector('#confirmPreviousDiscard') as HTMLDialogElement)?.showModal(); 
        }
    }
    async function confirmPrevious() {
        confirmCancelEdit();
        const url = new SearchUrl($page.url, paginate);
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
        if (!dirty) {
            confirmNext()
        } else {
            (document.querySelector('#confirmNextDiscard') as HTMLDialogElement)?.showModal(); 
        }
    }
    async function confirmNext() {
        confirmCancelEdit();
        const url = new SearchUrl($page.url, paginate);
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

    function colMaxWidthStyle(col : CombiTableColumn) : string {
        if (col.maxWidth == undefined && col.editMaxWidth == undefined) return "";
        if (col.maxWidth != undefined && col.editMaxWidth == undefined) return col.maxWidth;
        if (col.maxWidth == undefined && col.editMaxWidth != undefined) return col.editMaxWidth;
        if (col.maxWidth != undefined && col.editMaxWidth != undefined) {
            const isNumber = (/[0-9]+/.test(col.maxWidth) && /[0-9]+/.test(col.editMaxWidth));
            const isRem = (/\[?[0-9]+px\]?/.test(col.maxWidth) && /\[?[0-9]+px\]?/.test(col.editMaxWidth));
            const isPx = (/\[?[0-9]+rem\]?/.test(col.maxWidth) && /\[?[0-9]+rem\]?/.test(col.editMaxWidth));
            if (isNumber || isRem || isNumber) {
                let editMaxWidthMatch = /([0-9]+)/.exec(col.editMaxWidth);
                let maxWidthMatch = /([0-9]+)/.exec(col.maxWidth);
                if (editMaxWidthMatch == null || editMaxWidthMatch.length == 0) return "";
                if (maxWidthMatch == null || maxWidthMatch.length == 0) return "";
                let editMaxWidth = parseInt(editMaxWidthMatch[0]);
                let maxWidth = parseInt(maxWidthMatch[0]);
                let maxMax = editMaxWidth > maxWidth ? editMaxWidth : maxWidth;
                let maxMaxStr = "";
                if (isNumber)  maxMaxStr = "max-width:"+maxMax + "px;";
                else if (isRem) maxMaxStr = `max-width:${maxMax}rem;`;
                else maxMaxStr = `max-width:${maxMax}px;`;
                return maxMaxStr;
            }

        }
        return "";
    }
    let maxWidthStyle : {[key:string]: string} = {}
    for (let col of columns) {
        maxWidthStyle[col.col] = colMaxWidthStyle(col);
    }

    /////
    // sorting and filtering

    async function sort(col : string, dir? : "ascending"|"descending") {
        const url = new SearchUrl($page.url, paginate);
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
            filter(col, value);
        }
    }

    async function clearFilters() {
        filters = {};
        haveFilters = false;
        for (let col of columns) {
            filterText[col.col] = "";
            filterValues[col.col] = "";
        }

        const url = new SearchUrl($page.url, paginate);
        url.setSuffix(urlSuffix);
        url.setFilters(filters);
        await invalidateAll()
        searchParams = `?${url.searchParamsAsString()}`;
        goto(searchParams);
    }

    async function filter(col : CombiTableColumn, value : string|boolean|undefined) {
        if (col.col in filterMenusOpen) filterMenusOpen[col.col] = false;
        if (col.type == "boolean") {
            if (value == undefined) {
                delete filters[col.col];
                filters = {...filters};
            } else {
                filters[col.col] = value ? "Yes" : "No";
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
        } else if (col.type == "date") {
            if (value == undefined || value == "") {
                delete filters[col.col];
                filters = {...filters};
            } else {
                try {
                    if (typeof(value) == "boolean" || (value && !stringIsDate(value))) {
                        throw new Error("Date format")
                    };
                    if (typeof(value) == "boolean") filters[col.col] = value ? "Yes" : "No";
                    else filters[col.col] = value ?? "";
                    const val = filters[col.col];
                    const dateTime = new Date(parseDate(val)).toISOString();
                    let parts = dateTime.split("T")
                    filters = {...filters, [col.col]: parts[0]}
                } catch (e) {
                    console.log(e);
                    validationErrors = "Dates must be " + dateFormat;
                    (document.querySelector('#validateDialog') as HTMLDialogElement)?.showModal(); 
                }
            }
        } else {
            if (value == undefined || value == "") {
                delete filters[col.col];
                filters = {...filters};
            } else {
                if (typeof(value) == "boolean") filters[col.col] = value ? "Yes" : "No";
                else filters[col.col] = value ?? "";
                filters = {...filters, [col.col]: filters[col.col]}
            }
        }

        const url = new SearchUrl($page.url, paginate);
        url.setSuffix(urlSuffix);
        url.setFilters(filters);
        url.skip(0);
        await invalidateAll()
        searchParams = `?${url.searchParamsAsString()}`;
        goto(searchParams);

    }

    async function clearIds() {

        const url = new SearchUrl($page.url, paginate);
        url.setSuffix(urlSuffix);
        url.setFilters(filters);
        url.ids([])
        await invalidateAll()
        searchParams = `?${url.searchParamsAsString()}`;
        goto(searchParams);

    }

    $: sortCol = defaultSort;
    $: sortDirection = "ascending";
    $: searchParams = "";
    $: filters = {} as {[key:string]:string};
    $: haveFilters = false;
    $: dirty = false;
    $: ids = [] as number[];
    $: {
        const url = new SearchUrl($page.url, paginate);
        url.setSuffix(urlSuffix);
        url.setDefaultSortCol(defaultSort);
        const resp = url.getSort();
        sortCol = resp.sortCol;
        sortDirection = resp.sortDirection;
        searchParams = `?${url.searchParamsAsString()}`;
        filters = url.getFilters();
        haveFilters = Object.keys(filters).length > 0
        ids = url.getIds();
    }
    let filterText : {[key:string]:string} = {}
    let filterValues : {[key:string]:string} = {}
    let filterMenusOpen : {[key:string]:boolean} = {}
    columns.forEach((val: CombiTableColumn, i: number) => {filterMenusOpen[val.col] = false})
    const url = new SearchUrl($page.url, paginate);
    url.setSuffix(urlSuffix);
    let urlfilters = url.getFilters();
    for (let col in urlfilters) {
        if (col in filterText || true) {
            for (let i=0; i<columns.length; ++i) {
                if (col == columns[i].col) {
                    if (columns[i].type == "boolean") {
                        filterText[col] = urlfilters[col] == "t" ? "Yes" : "No"
                        filterValues[col] = urlfilters[col];
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

    //////
    // Auto complete

    let autoCompleteDivs : {[key:string]:Element|null} = {};
    columns.forEach((val: CombiTableColumn, i: number) => {autoCompleteDivs[val.col] = null})
    let autoCompleteData : string[];
    $: autoCompleteData = [];
    let autoCompleteOpen : {[key:string]:boolean} = {};
    columns.forEach((val: CombiTableColumn, i: number) => {autoCompleteOpen[val.col] = false})

    function autoCompleteUpdate(col : CombiTableColumn, value : string|undefined|null) {
        if (value == undefined || value == null || value == "") {
            /*editRowSelectValue[col.col] = "";
            delete editRowSelectValue[col.col];
            editRowSelectValue = {...editRowSelectValue}*/


        } else {
            editRowText[col.col] = value;
            editRowSelectValue = {...editRowSelectValue, [col.col]: value}
        }


        dirty = true;
        for (let col in autoCompleteOpen) {
            autoCompleteOpen[col] = false;
        }
        autoCompleteData = [];
    }

    async function autoCompleteKeyPress(evt: KeyboardEvent, col : CombiTableColumn, value : string|undefined) {
        if (!col.autoCompleteLink) return;
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
                autoCompleteData = [...body];
            }

            if (autoCompleteData.length > 0) {
                let target = autoCompleteDivs[col.col];
                if (target instanceof Element) {
                    if (target.getBoundingClientRect().bottom > table.getBoundingClientRect().bottom) {
                        setInterval(() => {target.scrollIntoView({behavior: "smooth", block: "nearest"})}); 
                    }
                }
            } else {
                autoCompleteOpen[col.col] = false;
            }

        } else {
            autoCompleteOpen[col.col] = false;
            autoCompleteData = []
        }
        
        dirty = true;
    }

    /////
    // Editing

    function getPreset(col : CombiTableColumn) : string|undefined {
        if (presets == undefined || presets[col.col] == undefined) return undefined;
        let colName = col.col;
        if (typeof presets[colName] == 'function') return asString((presets[colName])(), col.type);
        return asString(presets[colName], col.type);
    }

    $: editRow = undefined as number|undefined;
    $: editRowSelectValue = {} as {[key:string]:string|number|boolean|undefined};
    let editRowText : {[key:string]:string} = {}
    columns.forEach((val: CombiTableColumn, i: number) => {editRowText[val.col] = ""})
    let editRowMenusOpen : {[key:string]:boolean} = {}
    columns.forEach((val: CombiTableColumn, i: number) => {editRowMenusOpen[val.col] = false})

    function filterDetailsClicked(col : CombiTableColumn) {
        //console.log(filterMenusOpen[col.col])
    }

    function editDetailsClicked(e : Event, col : CombiTableColumn) {
        console.log("editDetailsClicked")
        if (editRowMenusOpen[col.col]) {
            let target = e.currentTarget;
            if (target instanceof Element) {
                console.log("scrolling", target.getBoundingClientRect().bottom, table.getBoundingClientRect().bottom)
                //if (target.getBoundingClientRect().bottom > table.getBoundingClientRect().bottom) {
                    target.scrollIntoView({behavior: "smooth", block: "start"}); 
                //}
            }
        }
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
                        const val = getColumn(rrows[rowidx], col.col);
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
                        const val = getColumn(rrows[rowidx], col.col)
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
                    let val = getColumn(rrows[rowidx], colName)
                    editRowText[colName] = asString(val, col.type);
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
                } else if (col.type == "select:string" || col.type == "select:integer") {
                    if (col.col in editRowSelectValue) editRowSelectValue[col.col] = undefined;
                    if (col.names && col.values) {
                        //const val = presets && col.col in presets ? presets[col.col] : undefined;
                        const val = getPreset(col);
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
                    editRowText[colName] = asString(val, col.type);
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
                editRowText[col.col] = value ? "Yes" : "No";
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

        dirty = true;
        for (let col in editRowMenusOpen) {
            editRowMenusOpen[col] = false;
        }
    }

    function editInputUpdate(evt : KeyboardEvent, col : CombiTableColumn) {
        if (editRow == -1 || editRow == -2) {
            if (editRowText[col.col] != "") dirty = true;
        } else if (editRow !== undefined) {
            if (editRowText[col.col] != rrows[editRow][col.col]) dirty = true;
        }
    }

    $: validationErrors = undefined as string[]|string|undefined;
    $: opInfo = "";

    async function saveEdit() {
        if (preview) {
            clearEdit();
            editRow = undefined;
            dirty = false;
            showInfo("Data not saved in preview mode");
            return;

        }
        
        validationErrors = validate();
        if (validationErrors.length > 0) {
            (document.querySelector('#validateDialog') as HTMLDialogElement)?.showModal(); 
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
                        dirty = false;
                        if (body.info) {
                            showInfo(body.info);
                        }  
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
        if (!dirty) {
            confirmCancelEdit();
        } else {
            (document.querySelector('#confirmEditDiscard') as HTMLDialogElement)?.showModal(); 
        }
    }
    function confirmCancelEdit() {
            clearEdit();
            editRow = undefined;
            dirty = false;
    }

    /////
    // Deleting
    
    let deleteIdx = -1;
    function deleteRow(idx : number) {
        deleteIdx = idx;
        (document.querySelector('#confirmDelete') as HTMLDialogElement)?.showModal(); 
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
    }

    // show dialogs
    export function showInfo(info : string) {
        opInfo = info;
        (document.querySelector('#infoDialog') as HTMLDialogElement)?.showModal(); 
    }

    export function showError(errors: string[]|string) {
        validationErrors = errors;
        (document.querySelector('#validateDialog') as HTMLDialogElement)?.showModal(); 
    }

    // show dialogs
    function showReload(info : string) {
        opInfo = info;
        (document.querySelector('#reloadDialog') as HTMLDialogElement)?.showModal(); 
    }

    ///// Custom operations

    async function reload() {
        const url = new SearchUrl($page.url, paginate);            
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
        (document.querySelector('#confirmUnlink') as HTMLDialogElement)?.showModal(); 
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

    let ncolumns = columns.length;
    if (select) ncolumns += 1;

    async function handleACBlur(event : any, col: CombiTableColumn) {
        // if the blur was because of outside focus
        // currentTarget is the parent element, relatedTarget is the clicked element
        //setTimeout(() => {autoCompleteUpdate(col, null)}, 100);
        if (event.relatedTarget == null || !event.relatedTarget && event.currentTarget.parentNode.contains(event.relatedTarget)) {
            autoCompleteUpdate(col, null);
        }

}

let activeElement : Element

</script>

<svelte:window bind:innerWidth bind:innerHeight />
<svelte:document bind:activeElement={activeElement} />

<div class="overflow-x-auto overflow-y-visible">
    <table class="table table-{widthType} overflow-y-visible" style="{tableHeightStyle} bg-base-100" bind:this={table}>
        <thead class="{stickyHeadRowClass} z-10">
            <!-- header row -->
            <tr class="bg-base-100 z-10">
                {#if select}
                    <!-- checkbox column -->
                    <td class="w-10"></td>
                {/if}
                {#each columns as col, colidx}
                    {@const minw = col.minWidth ? "min-w-" + col.minWidth : ""}
                    {@const maxw = col.maxWidth ? "max-w-" + col.maxWidth : ""}
                    {@const minwStyle = col.minWidth ? "min-width:" + col.minWidth + ";" : ""}
                    {@const maxwStyle = col.maxWidth ? "max-width:" + col.maxWidth + ";" : ""}
                    <th class="z-10" style="{minwStyle} {maxwStyle}">
                        {#if enableSort && (col.sortable === undefined || col.sortable == true)}
                            <!-- svelte-ignore a11y-invalid-attribute -->
                            <a href="#" on:click={() => sort(col.col)}>
                                {col.name}</a>&nbsp;{#if col.col == sortCol}
                                <span class="tail-icon align-text-top">
                                    {#if sortDirection == "ascending"}
                                        {@html upIcon}
                                    {:else}
                                        {@html downIcon}
                                    {/if}
                                </span>
                            {/if}
                        {:else}
                            <span class="text-primary">{col.name}</span>
                        {/if}
                    </th>
                {/each}

                <!-- actions column-->
                {#if enableFilter || addUrl || editUrl || deleteUrl || linkUrl || unlinkUrl}
                {@const width = deleteUrl && unlinkUrl ? "80px" : "60px"}
                    <td class="w-[{width}] last:sticky last:right-0 z-10 bg-base-100 "></td>
                {/if}
            </tr>
        </thead>

        <!-- body -->
        <tbody>

            <!-- filter row -->
            {#if enableFilter}
                <tr class="pb-0 border-none mb-0">
                    <td colspan="{columns.length}" class="pb-0">
                        <p class="small m-0 p-0 text-primary ml-1 mb-0">
                            Filter
                            {#if ids.length > 0}
                                    <!-- svelte-ignore a11y-missing-attribute -->
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                                    &nbsp;&nbsp;<a class="cursor-pointer" on:click={() => clearIds()}>[Clear ID filter]</a>
                            {/if}
                        </p>
                    </td>
                </tr>
                <tr class="0 mt-0">
                    {#if select}
                        <!-- checkbox column -->
                        <td></td>
                    {/if}
                    {#each columns as col, colidx}
                        {@const editminwStyle = col.editMinWidth ? "min-width:" + col.editMinWidth + ";" : ""}
                        {@const editmaxwStyle = col.editMaxWidth ? "max-width:" + col.editMaxWidth + ";" : ""}
                        {@const cmaxwStyle = maxWidthStyle[col.col]}
                        {@const dropdownwidthStyle = col.dropdownWidth ? "width:" + col.dropdownWidth : ";"}
                        <td class="align-bottom" style="{cmaxwStyle}">
                            {#if col.type == "boolean"}
                            <details class="dropdown overflow:visible" bind:open={filterMenusOpen[col.col]}  on:toggle={e => filterDetailsClicked(col)}>
                                <summary class="btn m-0 -mb-1 w-full" style="{editminwStyle} {editmaxwStyle}">{filterText[col.col] ?? ""}</summary>
                                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                <ul class="menu dropdown-content max-h-1/3 overflow-auto bg-base-200 rounded-box -z-1 p-2 mt-2 shadow" style="{dropdownwidthStyle}">
                                    <!-- svelte-ignore a11y-missing-attribute -->
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                                    <li><a on:click={() => filter(col, undefined)}>Clear</a></li>
                                    <!-- svelte-ignore a11y-missing-attribute -->
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                                    <li><a on:click={() => filter(col, false)}>No</a></li>
                                    <!-- svelte-ignore a11y-missing-attribute -->
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                                    <li><a on:click={() => filter(col, true)}>Yes</a></li>
                                </ul>
                            </details>  
                            {:else if (col.type == "select:string" || col.type == "select:integer") && col.names != undefined}    
                                <details class="dropdown overflow:visible" bind:open={filterMenusOpen[col.col]}  on:toggle={e => filterDetailsClicked(col)}>
                                    <summary class="btn m-0 -mb-1 w-full" style="{editminwStyle} {editmaxwStyle}">{filterText[col.col] ?? ""}</summary>
                                    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                    <ul class="menu dropdown-content max-h-1/3 overflow-auto bg-base-200 rounded-box -z-1 p-2 mt-2 shadow" style="{dropdownwidthStyle}">
                                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                                        <!-- svelte-ignore a11y-missing-attribute -->
                                        <li><a on:click={() => filter(col, "")}>Unset</a></li>
                                        {#each col.names as name, i}
                                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                                            <!-- svelte-ignore a11y-no-static-element-interactions -->
                                            <!-- svelte-ignore a11y-missing-attribute -->
                                            <li><a on:click={() => filter(col, col.values ? col.values[i]+"" : name)}>{name}</a></li>
                                        {/each}
                                    </ul>
                                </details>
                            {:else}
                                <input type="text" class="input bg-base-200 w-full" style="{editminwStyle} {editmaxwStyle}" 
                                    bind:value={filterText[col.col]} 
                                    on:blur={() => filter(col, filterText[col.col])} 
                                    on:keypress={(evt) => filterKeyPress(evt, col, filterText[col.col])}/>
                            {/if}
                        </td>
                    {/each}
                    {#if enableFilter || addUrl || editUrl || deleteUrl || linkUrl}
                        <td class="last:sticky last:right-0 z-10 bg-base-100">
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <!-- svelte-ignore a11y-no-static-element-interactions -->
                            {#if haveFilters}
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <span 
                            class=" mt-[16px] ml-[-22px] flex cursor-pointer" on:click={() => clearFilters()}>{@html crossIcon}</span>
                            {/if}
                        </td>
                    {/if}
                </tr>
            {/if}

            <!-- add row -->
            {#if addUrl || linkUrl}
                <tr class="0">
                    {#if editRow == -1 || editRow == -2}
                        {#if select}
                            <!-- checkbox column -->
                            <td></td>
                        {/if}
                        {#each columns as col, colidx}
                            {@const editminwStyle = col.editMinWidth ? "min-width:" + col.editMinWidth + ";" : ""}
                            {@const editmaxwStyle = col.editMaxWidth ? "max-width:" + col.editMaxWidth + ";" : ""}
                            {@const dropdownwidthStyle = col.dropdownWidth ? "width:" + col.dropdownWidth + ";" : ""}
                            {@const cmaxwStyle = maxWidthStyle[col.col]}
                            {@const bg = col.nullable != true ? "bg-required" : "bg-base-200"}
                            {#if editRow == -1 || col.col == primaryKey}
                                <td class="align-bottom" style="{cmaxwStyle}">
                                    {#if colidx == 0}
                                        <p class="small m-0 p-0 pb-1 text-primary ml-1">New</p>
                                    {/if}
                                    {#if !col.readOnly}
                                        {#if col.type == "boolean"}
                                            <details class="dropdown overflow:visible" bind:open={editRowMenusOpen[col.col]}  on:toggle={e => editDetailsClicked(e, col)}>
                                                <summary class="btn m-0 -mb-1 w-full {bg}" style="{editminwStyle} {editmaxwStyle}">{editRowText[col.col] ?? ""}</summary>
                                                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                                <ul class="menu dropdown-content max-h-1/3 overflow-auto bg-base-200 rounded-box -z-1 p-2 mt-2 shadow" style="{dropdownwidthStyle}">
                                                    {#if col.nullable == true}
                                                        <!-- svelte-ignore a11y-missing-attribute -->
                                                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                                                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                                                        <li><a on:click={() => editRowUpdate(col, null)}>Unset</a></li>
                                                    {/if}
                                                    <!-- svelte-ignore a11y-missing-attribute -->
                                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                                                    <li><a on:click={() => editRowUpdate(col, false)}>No</a></li>
                                                    <!-- svelte-ignore a11y-missing-attribute -->
                                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                                                    <li><a on:click={() => editRowUpdate(col, true)}>Yes</a></li>
                                                </ul>
                                            </details>  
                                        {:else if (col.type == "select:string" || col.type == "select:integer") && col.names != undefined}    
                                            <details class="dropdown overflow:visible" bind:open={editRowMenusOpen[col.col]}  on:toggle={e => editDetailsClicked(e, col)} >
                                                <summary class="btn m-0 -mb-1 w-full {bg}" style="{editminwStyle} {editmaxwStyle}">{editRowText[col.col] ?? ""}</summary>
                                                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                                <ul class="menu dropdown-content max-h-1/3 overflow-auto bg-base-200 rounded-box -z-1 p-2 mt-2 shadow" style="{dropdownwidthStyle}">
                                                    {#if col.nullable == true}
                                                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                                                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                                                        <!-- svelte-ignore a11y-missing-attribute -->
                                                        <li><a on:click={() => editRowUpdate(col, "")}>Unset</a></li>
                                                    {/if}
                                                    {#each col.names as name, i}
                                                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                                                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                                                        <!-- svelte-ignore a11y-missing-attribute -->
                                                        <li><a on:click={() => editRowUpdate(col, col.values ? col.values[i]+"" : name)}>{name}</a></li>
                                                    {/each}
                                                </ul>
                                            </details>
                                        {:else if col.autoCompleteLink}    
                                            <div class="acdropdown overflow:visible">
                                                <input role="button" class="input m-0 -mb-1 w-full {bg} cursor-text" style="{editminwStyle} {editmaxwStyle}"
                                                    on:keyup={(evt) => autoCompleteKeyPress(evt, col, editRowText[col.col])}
                                                    on:focusout={(event) => {handleACBlur(event, col)}}
                                                    bind:value={editRowText[col.col]}/>
                                                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                                 {#if autoCompleteOpen[col.col]}
                                                <ul bind:this={autoCompleteDivs[col.col]} class="menu dropdown-content max-h-1/3 overflow-auto bg-base-200 rounded-box -z-1 p-2 mt-2 shadow" style="{dropdownwidthStyle}" tabindex="0">
                                                    {#each autoCompleteData as name}
                                                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                                                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                                                        <!-- svelte-ignore a11y-missing-attribute -->
                                                        <li><a on:click={() => autoCompleteUpdate(col, name)}>{name}</a></li>
                                                    {/each}
                                                </ul>
                                                {/if}
                                            </div>
                                        {:else}
                                            <input type="text" class="input w-full {bg}" style="{editminwStyle} {editmaxwStyle}" 
                                                bind:value={editRowText[col.col]} 
                                                on:keyup={(evt) => editInputUpdate(evt, col)}
                                            />
                                        {/if}
                                    {/if}
                                </td>
                            {/if}
                        {/each}
                        {#if enableFilter || addUrl || editUrl || deleteUrl || linkUrl}
                            <td class="w-4 last:sticky last:right-0 z-10 bg-base-100">
                                {#if dirty}
                                    <!-- svelte-ignore missing-declaration -->
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                                    <span 
                                    class="text-success flex pt-6 -ml-[20px] cursor-pointer" on:click={() => saveEdit()}>{@html checkIcon}</span>
                                {:else}
                                    <span 
                                    class="text-neutral-500 flex pt-6 -ml-[20px]">{@html checkIcon}</span>
                                {/if}
                                    <!-- svelte-ignore missing-declaration -->
                                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <span 
                                    class="text-error -mt-[22px] ml-[6px] flex cursor-pointer" on:click={() => cancelEdit()}>{@html crossIcon}</span>
                            </td>
                        {/if}
                    {:else}
                        {#if select}
                            <td></td>
                        {/if}
                        <td colspan="{columns.length}">
                        {#if addUrl}
                            <button class="btn btn-sm mr-2" on:click={() => edit(-1)}>Add</button>
                        {/if}
                        {#if linkUrl}
                            <button class="btn btn-sm" on:click={() => edit(-2)}>Link</button>
                        {/if}
                        {#if haveAddExtra} 
                            {#each addExtra as row}
                                <button class="btn btn-sm" on:click={() => callExtra(row)}>{row.label}</button>
                            {/each}
                        {/if}
                        </td>
                    {/if}
                </tr>
            {/if}
            
            <!-- data rows -->
            {#each rrows as row, rowidx}
                <tr class="hover:bg-neutral">
                    {#if select}
                        <!-- checkbox column -->
                        <td>
                            {#if editRow == undefined || editRow != rowidx}
                            <div class="form-control">
                                <label class="label cursor-pointer">
                                  <input type="checkbox" bind:checked={rowChecked[rowidx]} class="checkbox" />
                              </div>
                            {/if}                            
                        </td>
                    {/if}
                    {#each columns as col, colidx}
                        {@const dropdownwidth = col.dropdownWidth ? "w-" + col.dropdownWidth : ""}

                        {@const minwStyle = col.minWidth ? "min-width:" + col.minWidth + ";" : ""}
                        {@const editminwStyle = col.editMinWidth ? "min-width:" + col.editMinWidth + ";" : ""}
                        {@const maxwStyle = col.maxWidth ? "max-width:" + col.maxWidth + ";" : ""}
                        {@const cmaxwStyle = maxWidthStyle[col.col]}
                        {@const editmaxwStyle = col.editMaxWidth ? "max-width:" + col.editMaxWidth + ";" : ""}
                        {@const dropdownwidthStyle = col.dropdownWidth ? "width:" + col.dropdownWidth + ";" : ""}

                        {@const bg = col.nullable != true ? "bg-required" : "bg-base-200"}
                        {#if editRow == undefined || editRow != rowidx}
                            {@const value = formatColumn(getColumn(row, col.col), col)}
                            <td style="{cmaxwStyle}">
                                {#if (col.type == "date" || col.type == "datetime" || col.nowrap)}
                                    {#if col.link}
                                        <span class="text-nowrap text-base-content"><a class="text-base-content {linkFormat}" href={col.link(row)}>{value}</a></span>
                                    {:else}
                                        <span class="text-nowrap text-base-content">{value}</span>
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
                            <td class="align-bottom" style="{cmaxwStyle}">
                                {#if colidx == 0}
                                <p class="small m-0 p-0 pb-1 text-primary ml-1">Edit</p>
                                {/if}
                                {#if col.readOnly}
                                    {@const value = formatColumn(getColumn(row, col.col), col)}
                                    {#if (col.type == "date" || col.type == "datetime" || col.nowrap)}
                                        <span class="text-nowrap text-base-content align-middle">{value}</span>
                                    {:else}
                                        <span class="align-middle">{value}</span>
                                    {/if}
                                {:else}
                                    {#if col.type == "boolean"}
                                        <details class="dropdown overflow:visible" bind:open={editRowMenusOpen[col.col]}   on:toggle={e => editDetailsClicked(e, col)}>
                                            <summary class="btn m-0 -mb-1 w-full {bg}" style="{editminwStyle} {editmaxwStyle}">{editRowText[col.col] ?? ""}</summary>
                                            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                            <ul class="menu dropdown-content max-h-1/3 overflow-auto bg-base-200 rounded-box -z-1 p-2 mt-2 shadow" style="{dropdownwidth}">
                                                {#if col.nullable == true}
                                                    <!-- svelte-ignore a11y-missing-attribute -->
                                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                                                    <li><a on:click={() => editRowUpdate(col, null)}>Unset</a></li>
                                                {/if}
                                                <!-- svelte-ignore a11y-missing-attribute -->
                                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                                <!-- svelte-ignore a11y-no-static-element-interactions -->
                                                <li><a on:click={() => editRowUpdate(col, false)}>No</a></li>
                                                <!-- svelte-ignore a11y-missing-attribute -->
                                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                                <!-- svelte-ignore a11y-no-static-element-interactions -->
                                                <li><a on:click={() => editRowUpdate(col, true)}>Yes</a></li>
                                            </ul>
                                        </details>  
                                    {:else if (col.type == "select:string" || col.type == "select:integer") && col.names != undefined}    
                                        <details class="dropdown overflow:visible" bind:open={editRowMenusOpen[col.col]} on:toggle={e => editDetailsClicked(e, col)}>
                                            <summary class="btn m-0 -mb-1 w-full {bg}" style="{editminwStyle} {editmaxwStyle}">{editRowText[col.col] ?? ""}</summary>
                                            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                            <ul class="menu dropdown-content max-h-1/3 overflow-auto bg-base-200 rounded-box -z-1 p-2 mt-2 shadow" style="{dropdownwidthStyle}">
                                                {#if col.nullable == true}
                                                    <!-- svelte-ignore a11y-missing-attribute -->
                                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                                                    <li><a on:click={() => editRowUpdate(col, null)}>Unset</a></li>
                                                {/if}
                                                {#each col.names as name, i}
                                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                                                    <!-- svelte-ignore a11y-missing-attribute -->
                                                    <li><a on:click={() => editRowUpdate(col, col.values ? col.values[i]+"" : name)}>{name}</a></li>
                                                {/each}
                                            </ul>
                                        </details>
                                        {:else if col.autoCompleteLink}    
                                            <div class="acdropdown overflow:visible">
                                                <input role="button" class="input m-0 -mb-1 w-full {bg} cursor-text" style="{editminwStyle} {editmaxwStyle}"
                                                    on:keyup={(evt) => autoCompleteKeyPress(evt, col, editRowText[col.col])}
                                                    on:focusout={(event) => {handleACBlur(event, col)}}
                                                    bind:value={editRowText[col.col]}/>
                                                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                                 {#if autoCompleteOpen[col.col]}
                                                <ul bind:this={autoCompleteDivs[col.col]}  class="menu dropdown-content max-h-1/3 overflow-auto bg-base-200 rounded-box -z-1 p-2 mt-2 shadow" style="{dropdownwidthStyle}"  tabindex="0">
                                                    {#each autoCompleteData as name}
                                                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                                                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                                                        <!-- svelte-ignore a11y-missing-attribute -->
                                                        <li><a on:click={() => autoCompleteUpdate(col, name)}>{name}</a></li>
                                                    {/each}
                                                </ul>
                                                {/if}
                                            </div>
                                    {:else}
                                        <input type="text" class="input {bg} w-full" style="{editminwStyle} {editmaxwStyle}" 
                                            bind:value={editRowText[col.col]} 
                                            on:keyup={(evt) => editInputUpdate(evt, col)}
                                            />
                                    {/if}
                                {/if}

                            </td>
                        {/if}
                    {/each}
                    {#if editRow == undefined}
                        <!-- displaying row - only show delete icon if delete allowed -->
                        {#if editUrl || deleteUrl !== undefined}
                            <td class="w-4 last:sticky last:right-0 z-10 bg-base-100">
                                {#if editUrl}
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <span 
                                        class="text-primary -ml-6 flex cursor-pointer" on:click={() => edit(rowidx)}>{@html editIcon}</span>
                                {/if}
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <!-- svelte-ignore a11y-no-static-element-interactions -->
                                {#if unlinkUrl !== undefined}
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <span 
                                    class="text-error {exitWidthClass} flex {exitHeightClass} cursor-pointer" on:click={() => unlinkRow(rowidx)}>{@html exitIcon}</span>
                                {/if}
                                <!-- svelte-ignore a11y_no_static_element_interactions -->
                                {#if deleteUrl !== undefined}
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                                    <span 
                                    class="text-error {trashWidthClass} flex {trashHeightClass} cursor-pointer" on:click={() => deleteRow(rowidx)}>{@html trashIcon}</span>
                                {/if}
                            </td>
                        {/if}
                    {:else if editRow == rowidx}
                        <td class="w-4 last:sticky last:right-0 z-10 bg-base-100">
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            {#if dirty}
                                <!-- svelte-ignore missing-declaration -->
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <!-- svelte-ignore a11y-no-static-element-interactions -->
                                <span 
                                class="text-success flex pt-6 -ml-[20px] cursor-pointer" on:click={() => saveEdit()}>{@html checkIcon}</span>
                            {:else}
                                <span 
                                class="text-neutral-500 flex pt-6 -ml-[20px]">{@html checkIcon}</span>
                            {/if}
                                <!-- svelte-ignore missing-declaration -->
                                <!-- svelte-ignore a11y-no-static-element-interactions -->
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <span 
                                class="text-error -mt-[22px] ml-[6px] flex cursor-pointer" on:click={() => cancelEdit()}>{@html crossIcon}</span>
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
            <button class="btn btn-primary" on:click={() => previous()}>Previous</button>
        {:else}
            <button class="btn btn-disabled">Previous</button>
        {/if}
        {#if haveNext}
            <button class="btn btn-primary ml-3" on:click={() => next()}>Next</button>
        {:else}
            <button class="btn btn-disabled ml-3">Next</button>
        {/if}

        {#if haveOps}
            {@const disabled = rowsAreChecked? "" : "btn-disabled"}
            {#each ops as op}
                <button class="btn btn-secondary {disabled} ml-3" on:click={() => execOp(op) }>{op.label}</button>
            {/each}
            <button class="btn btn-neutral {disabled} ml-3" on:click={() => clearSelection() }>Clear Selection</button>
        {/if}

        {#if haveNavExtra}
            {@const disabled = rowsAreChecked? "" : "btn-disabled"}
            {#each navExtra as op}
                <button class="btn btn-secondary ml-3" on:click={() => callExtra(op) }>{op.label}</button>
            {/each}
        {/if}
        {/if}
</div>
{/if}

<!-- Modal to confirm discarding edit -->
<CombiTableDiscardChanges id="confirmEditDiscard" okFn={confirmCancelEdit}/>

<!-- Modal to confirm discarding edit when clicking previous -->
<CombiTableDiscardChanges id="confirmPreviousDiscard" okFn={confirmPrevious}/>

<!-- Modal to confirm discarding edit when clicking previous -->
<CombiTableDiscardChanges id="confirmNextDiscard" okFn={confirmNext}/>

<!-- Modal to confirm discarding edit when clicking previous -->
<CombiTableDiscardChanges id="confirmUnlink" title="Unlink god from Olympus?" okFn={confirmUnlinkRow}/>

<!-- Modal to display validation errors -->
<CombiTableValidateDialog id="validateDialog" errors={validationErrors}/>

<!-- Modal to display information after executing a function -->
<CombiTableInfoDialog id="infoDialog" info={opInfo}/>

<!-- Modal to display info message then reload -->
<CombiTableInfoDialog id="reloadDialog" info={opInfo} okFn={reload}/>

<!-- Modal to display validation errors -->
<CombiTableConfirmDeleteDialog id="confirmDelete" okFn={confirmDeleteRow}/>

<!-- To instantiate tailwind classes that are in variables therefore not seen by the preprocessor -->
<div class="hidden -mt-[21px] ml-1 ml-6 -ml-6 table-fixed table-auto -mt-[21px] -mt-[42px] ml-1 ml-6 ml-12 w-[80px] w-[60px] w-[48px] -mt-[20px] -mt-[18px] ml-6 -ml-6 -ml-1 text-base-content align-middle sticky top-0 bg-required bg-base-200 -mt-[18px] -mt-[20px] -mt-[21px]"></div>

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

</style>