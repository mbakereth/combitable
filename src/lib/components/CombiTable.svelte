<script lang="ts">
    // Copyright (c) 2024 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file
    import { page } from '$app/stores';
    import { goto, invalidateAll } from '$app/navigation'
    import type { CombiTableColumn } from '$lib/combitabletypes';
    import { SearchUrl } from '$lib/searchurl';
    import upIcon from "$lib/assets/prime--sort-up-fill.svg?raw"
    import downIcon from "$lib/assets/prime--sort-down-fill.svg?raw"
    import checkIcon from "$lib/assets/bitcoin-icons--check-filled.svg?raw"
    import crossIcon from "$lib/assets/bitcoin-icons--cross-filled.svg?raw"
    import trashIcon from "$lib/assets/bitcoin-icons--trash-outline.svg?raw"
    import editIcon from "$lib/assets/bitcoin-icons--edit-outline.svg?raw"
    import CombiTableDiscardChanges from '$lib/components/CombiTableDiscardChanges.svelte';
    import CombiTableValidateDialog from '$lib/components/CombiTableErrorDialog.svelte';
    import CombiTableInfoDialog from '$lib/components/CombiTableInfoDialog.svelte';
    import CombiTableConfirmDeleteDialog from '$lib/components/CombiTableConfirmDeleteDialog.svelte';

    export let rows : {[key:string]:any|undefined}[];
    $: rrows = rows;
    export let columns : CombiTableColumn[];
    export let enableSort = false;
    export let enableFilter = false;
    export let defaultSort : string;
    export let paginate = 0;
    export let havePrevious = false;
    export let haveNext = false;
    export let addUrl : string|undefined = undefined;
    export let editUrl : string|undefined = undefined;
    export let deleteUrl : string|undefined = undefined;
    export let presets : {[key:string]:any}|undefined = undefined;
    export let widthType : "auto"|"fixed" = "auto";
    export let primaryKey : string = "";

    // SVG wants to display with a new line.  Depending on what icons
    // we are displaying in the actions column set how far to offset
    // the delete icon
    let trashHeightClass = editUrl ? "-mt-[21px]" : "";
    let trashWidthClass = editUrl ? "ml-1" : "-ml-6";

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
        if (val instanceof Date && type=="date") return val.toISOString().split("T")[0];
        if (val instanceof Date) return val.toISOString();
        if (typeof(val) == "object" && "name" in val) return val["name"];
        return ""+val;
    }
    function asStringOrUndefined(val : string|number|boolean|undefined, type : string|undefined=undefined) : string|undefined {
        if (typeof(val) == "string" && val == "") return undefined;
        return val == undefined ? undefined : asString(val, type);
    }

    function asDate(val : string|Date) : Date {
        if (val == undefined) return new Date();
        if (typeof(val) == "string") return new Date(val.trim());
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
                return val.toISOString().split("T")[0];
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
        searchParams = `?${url.url.searchParams.toString()}`;
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
        let skip = url.getSkip();
        let take = url.getTake();
        skip += take;
        if (skip < 0) skip = 0;
        url.skip(skip);
            
        await invalidateAll();
        searchParams = `?${url.url.searchParams.toString()}`;
        goto(searchParams);
    
    }

    /////
    // sorting and filtering

    async function sort(col : string, dir? : "ascending"|"descending") {
        const url = new SearchUrl($page.url, paginate);
        url.setDefaultSortCol(defaultSort);
        let { sortCol, sortDirection } = url.getSort();
        url.sort(col, dir);
        if (col == sortCol) url.skip(0);    
        await invalidateAll()
        searchParams = `?${url.url.searchParams.toString()}`;
        goto(searchParams);
    
    }

    function filterKeyPress(evt: KeyboardEvent, col : CombiTableColumn, value : string|boolean|undefined) {
        if (evt.keyCode == 13) {
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
        url.setFilters(filters);
        await invalidateAll()
        searchParams = `?${url.url.searchParams.toString()}`;
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
        url.setFilters(filters);
        await invalidateAll()
        searchParams = `?${url.url.searchParams.toString()}`;
        goto(searchParams);

    }

    $: sortCol = defaultSort;
    $: sortDirection = "ascending";
    $: searchParams = "";
    $: filters = {} as {[key:string]:string};
    $: haveFilters = false;
    $: dirty = false;
    $: {
        const url = new SearchUrl($page.url, paginate);
        url.setDefaultSortCol(defaultSort);
        const resp = url.getSort();
        sortCol = resp.sortCol;
        sortDirection = resp.sortDirection;
        searchParams = `?${url.url.searchParams.toString()}`;
        filters = url.getFilters();
        haveFilters = Object.keys(filters).length > 0
    }
    let filterText : {[key:string]:string} = {}
    let filterValues : {[key:string]:string} = {}
    let filterMenusOpen : {[key:string]:boolean} = {}
    columns.forEach((val: CombiTableColumn, i: number) => {filterMenusOpen[val.col] = false})
    const url = new SearchUrl($page.url, paginate);
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

    /////
    // Editing

    $: editRow = undefined as number|undefined;
    $: editRowSelectValue = {} as {[key:string]:string|number|boolean|undefined};
    let editRowText : {[key:string]:string} = {}
    columns.forEach((val: CombiTableColumn, i: number) => {editRowText[val.col] = ""})
    let editRowMenusOpen : {[key:string]:boolean} = {}
    columns.forEach((val: CombiTableColumn, i: number) => {editRowMenusOpen[val.col] = false})

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

        } else if (editRow == -1) {
            
            // set columns to contents of presets or blank if preset not present for a column
            for (let col of columns) {
                let colName = col.col;
                if (col.type == "boolean") {
                    editRowText[colName] = (presets && presets[colName]) ? asString(rrows[rowidx][colName], col.type) : "";
                } else if (col.type == "select:string" || col.type == "select:integer") {
                    if (col.col in editRowSelectValue) editRowSelectValue[col.col] = undefined;
                    if (col.names && col.values) {
                        const val = presets && col.col in presets ? presets[col.col] : undefined;
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
                        const val = presets && col.col in presets ? presets[col.col] : undefined;
                        for (let i=0; i<col.names.length; ++i) {
                            if (val == col.names[i]) {
                                editRowText[colName] = col.names[i];
                                editRowSelectValue[colName] = col.names[i];
                            }

                        }  
                    }

                } else {
                    let val = presets && col.col in presets ? presets[col.col] : undefined;
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
        if (editRow == -1) {
            if (editRowText[col.col] != "") dirty = true;
        } else if (editRow !== undefined) {
            if (editRowText[col.col] != rrows[editRow][col.col]) dirty = true;
        }
    }

    $: validationErrors = undefined as string[]|string|undefined;
    $: opInfo = "";

    async function saveEdit() {
        validationErrors = validate();
        if (validationErrors.length > 0) {
            (document.querySelector('#validateDialog') as HTMLDialogElement)?.showModal(); 
        } else {
            let url = editRow == -1 ? addUrl : editUrl;
            if (url == undefined) {
                console.log("saveEdit called but edit/add url is not set");
                return;
            }
            try {
                let data : {[key:string]:any} = {};
                for (let col of columns) {
                    if (col.type == "select:string") {
                        data[col.col] = editRowSelectValue[col.col];
                    } else if (col.type == "select:integer") {
                        data[col.col] = asNumberOrUndefined(editRowSelectValue[col.col]);
                    } else if (col.type == "boolean") {
                        console.log("asBooleanOrUndefined", col.col, editRowSelectValue[col.col], typeof(editRowSelectValue[col.col]))
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
                                if (body.row[column.col].indexOf("T") > 0) {
                                    const parts = body.row[column.col].split("T");
                                    body.row[column.col] = new Date(parts[0]);
                                } else {
                                    body.row[column.col] = new Date(body.row[column.col]);
                                }
                            } else if (column.type == "datetime" && typeof(body.row[column.col]) == "string") {
                                body.row[column.col] = new Date(body.row[column.col]);
                            }
                        }
                        if (editRow == -1) {
                            rrows = [body.row, ...rrows]
                        } else if (editRow !== undefined) {
                            rrows[editRow] = body.row;
                            rrows = [...rrows];
                        }
                        clearEdit();
                        editRow = undefined;
                        dirty = false;
                        if (body.info) {
                            opInfo = body.info;
                            showInfo();
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
            if (!col.nullable && col.type != "string" && editRowText[col.col] == "") {
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
                    if (!/^( *[0-9][0-9][0-9][0-9]-[0-9][0-9]?-[0-9][0-9] *?)$/.test(editRowText[col.col])) {
                        errors.push(col.name + " must be in the form yyyy-mm-dd");
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
                    rrows = rrows.filter((_el, i) => i != deleteIdx);
                }
        }
        deleteIdx = -1;
    }

    // show dialogs
    function showInfo() {
        (document.querySelector('#infoDialog') as HTMLDialogElement)?.showModal(); 
    }

    function showError(errors: string[]|string) {
        validationErrors = errors;
        (document.querySelector('#validateDialog') as HTMLDialogElement)?.showModal(); 
    }

</script>

<div class="overflow-x-auto">
    <table class="table table-{widthType}">
        <thead>
            <!-- header row -->
            <tr>
                {#each columns as col}
                    {@const minw = col.minWidth ? "min-w-" + col.minWidth : ""}
                    {@const maxw = col.maxWidth ? "max-w-" + col.maxWidth : ""}
                    <th class="{minw} {maxw}">
                        {#if enableSort}
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
                {#if enableFilter || addUrl || editUrl || deleteUrl}
                    <td class="w-[60px]"></td>
                {/if}
            </tr>
        </thead>

        <!-- body -->
        <tbody>

            <!-- filter row -->
            {#if enableFilter}
                <tr class="0">
                    {#each columns as col, colidx}
                        {@const editminw = col.editMinWidth ? "min-w-" + col.editMinWidth : ""}
                        {@const editmaxw = col.editMaxWidth ? "max-w-" + col.editMaxWidth : ""}
                        {@const dropdownwidth = col.dropdownWidth ? "w-" + col.dropdownWidth : ""}
                        <td class="align-bottom">
                            {#if colidx == 0}
                                <p class="small m-0 p-0 pb-1 text-primary ml-1">Filter</p>
                            {/if}
                            {#if col.type == "boolean"}
                            <details class="dropdown" bind:open={filterMenusOpen[col.col]}>
                                <summary class="btn m-0 -mb-1 w-full {editminw} {editmaxw}">{filterText[col.col] ?? ""}</summary>
                                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                <ul class="menu dropdown-content bg-base-200 rounded-box z-[1] {dropdownwidth} p-2 mt-2 shadow">
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
                                <details class="dropdown" bind:open={filterMenusOpen[col.col]}>
                                    <summary class="btn m-0 -mb-1 w-full {editminw} {editmaxw}">{filterText[col.col] ?? ""}</summary>
                                    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                    <ul class="menu dropdown-content bg-base-200 rounded-box z-[1] {dropdownwidth} p-2 mt-2 shadow">
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
                                <input type="text" class="input bg-base-200 w-full {editminw} {editmaxw}" 
                                    bind:value={filterText[col.col]} 
                                    on:blur={() => filter(col, filterText[col.col])} 
                                    on:keypress={(evt) => filterKeyPress(evt, col, filterText[col.col])}/>
                            {/if}
                        </td>
                    {/each}
                    {#if enableFilter || addUrl || editUrl || deleteUrl}
                        <td>
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
            {#if addUrl}
                <tr class="0">
                    {#if editRow == -1}
                        {#each columns as col, colidx}
                            {@const editminw = col.editMinWidth ? "min-w-" + col.editMinWidth : ""}
                            {@const editmaxw = col.editMaxWidth ? "max-w-" + col.editMaxWidth : ""}
                            {@const dropdownwidth = col.dropdownWidth ? "w-" + col.dropdownWidth : ""}
                            <td class="align-bottom">
                                {#if colidx == 0}
                                <p class="small m-0 p-0 pb-1 text-primary ml-1">New</p>
                                {/if}
                                {#if !col.readOnly}
                                    {#if col.type == "boolean"}
                                        <details class="dropdown" bind:open={editRowMenusOpen[col.col]}>
                                            <summary class="btn m-0 -mb-1 w-full {editminw} {editmaxw}">{editRowText[col.col] ?? ""}</summary>
                                            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                            <ul class="menu dropdown-content bg-base-200 rounded-box z-[1] {dropdownwidth} p-2 mt-2 shadow">
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
                                        <details class="dropdown" bind:open={editRowMenusOpen[col.col]}>
                                            <summary class="btn m-0 -mb-1 w-full {editminw} {editmaxw}">{editRowText[col.col] ?? ""}</summary>
                                            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                            <ul class="menu dropdown-content bg-base-200 rounded-box z-[1] {dropdownwidth} p-2 mt-2 shadow">
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
                                    {:else}
                                        <input type="text" class="input bg-base-200 w-full {editminw} {editmaxw}" 
                                            bind:value={editRowText[col.col]} 
                                            on:keyup={(evt) => editInputUpdate(evt, col)}
                                        />
                                    {/if}
                                {/if}
                            </td>
                        {/each}
                        {#if enableFilter || addUrl || editUrl || deleteUrl}
                            <td class="w-4">
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
                        <td>
                            <button class="btn btn-sm" on:click={() => edit(-1)}>Add</button>
                        </td>
                    {/if}
                </tr>
            {/if}
            
            <!-- data rows -->
            {#each rrows as row, rowidx}
                <tr class="hover:bg-neutral">
                    {#each columns as col, colidx}
                        {@const minw = col.minWidth ? "min-w-" + col.minWidth : ""}
                        {@const editminw = col.editMinWidth ? "min-w-" + col.editMinWidth : ""}
                        {@const maxw = col.maxWidth ? "max-w-" + col.maxWidth : ""}
                        {@const editmaxw = col.editMaxWidth ? "max-w-" + col.editMaxWidth : ""}
                        {@const dropdownwidth = col.dropdownWidth ? "w-" + col.dropdownWidth : ""}
                        {#if editRow == undefined || editRow != rowidx}
                            {@const value = formatColumn(getColumn(row, col.col), col)}
                            <td>
                                {#if (col.type == "date" || col.type == "datetime" || col.nowrap)}
                                    {#if col.link}
                                        <span class="text-nowrap text-neutral-content"><a class="text-neutral-content" href={col.link(row)}>{value}</a></span>
                                    {:else}
                                        <span class="text-nowrap text-neutral-content">{value}</span>
                                    {/if}
                                {:else}
                                    {#if col.link}
                                        <a class="text-neutral-content" href={col.link(row)}>{value}</a>
                                    {:else}
                                        {value}
                                    {/if}
                                {/if}
                            </td>
                        {:else}
                            <td class="align-bottom">
                                {#if colidx == 0}
                                <p class="small m-0 p-0 pb-1 text-primary ml-1">Edit</p>
                                {/if}
                                {#if !col.readOnly}
                                {#if col.type == "boolean"}
                                    <details class="dropdown" bind:open={editRowMenusOpen[col.col]}>
                                        <summary class="btn m-0 -mb-1 w-full {editminw} {editmaxw}">{editRowText[col.col] ?? ""}</summary>
                                        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                        <ul class="menu dropdown-content bg-base-200 rounded-box z-[1] {dropdownwidth} p-2 mt-2 shadow">
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
                                    <details class="dropdown" bind:open={editRowMenusOpen[col.col]}>
                                        <summary class="btn m-0 -mb-1 w-full {editminw} {editmaxw}">{editRowText[col.col] ?? ""}</summary>
                                        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                        <ul class="menu dropdown-content bg-base-200 rounded-box z-[1] {dropdownwidth} p-2 mt-2 shadow">
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
                                {:else}
                                    <input type="text" class="input bg-base-200 w-full {editminw} {editmaxw}" 
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
                            <td class="w-4">
                                {#if editUrl}
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <span 
                                        class="text-primary -ml-6 flex cursor-pointer" on:click={() => edit(rowidx)}>{@html editIcon}</span>
                                {/if}
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <!-- svelte-ignore a11y-no-static-element-interactions -->
                                {#if deleteUrl !== undefined}
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <span 
                                    class="text-error {trashWidthClass} flex {trashHeightClass} cursor-pointer" on:click={() => deleteRow(rowidx)}>{@html trashIcon}</span>
                                {/if}
                            </td>
                        {/if}
                    {:else if editRow == rowidx}
                        <td class="w-4">
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

{#if paginate > 0}
<div class="ml-3 mt-2">
    {#if havePrevious}
        <button class="btn btn-primary" on:click={() => previous()}>Previous</button>
    {:else}
        <button class="btn btn-disabled">Previous</button>
    {/if}
    {#if haveNext}
        <button class="btn btn-primary ml-4" on:click={() => next()}>Next</button>
    {:else}
        <button class="btn btn-disabled ml-4">Next</button>
    {/if}
</div>
{/if}

<!-- Modal to confirm discarding edit -->
<CombiTableDiscardChanges id="confirmEditDiscard" okFn={confirmCancelEdit}/>

<!-- Modal to confirm discarding edit when clicking previous -->
<CombiTableDiscardChanges id="confirmPreviousDiscard" okFn={confirmPrevious}/>

<!-- Modal to confirm discarding edit when clicking previous -->
<CombiTableDiscardChanges id="confirmNextDiscard" okFn={confirmNext}/>

<!-- Modal to display validation errors -->
<CombiTableValidateDialog id="validateDialog" errors={validationErrors}/>

<!-- Modal to display validation errors -->
<CombiTableInfoDialog id="infoDialog" info={opInfo}/>

<!-- Modal to display validation errors -->
<CombiTableConfirmDeleteDialog id="confirmDelete" okFn={confirmDeleteRow}/>
<div class="hidden -mt-[21px] ml-1 -ml-6 table-fixed table-auto "></div>

<style>
.tail-icon {
  white-space: nowrap;
  /* Make sure last word and icon will break ultimately */
  display: inline-flex;
  flex-wrap: wrap; 
}
</style>