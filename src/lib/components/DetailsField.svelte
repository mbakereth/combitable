<!-- svelte-ignore unknown_code -->
<!--
    @component For use with {@link DetailsFieldSet}.  A single field for
    editing a row field, configured the same was as {@link CombiTable}    
 -->
<script lang="ts">
    type Props = {

        /** Table definition for this field.  See {@link CombiTableColumn} */
        col : CombiTableColumn,

        /** Bind a variable to hold the value to this */
        value : any,

        /** For date fields.  `yyyy-mm-dd`, `dd-mm-yyyy`, `mm-dd-yyyy`*/
        dateFormat? : string,

        editMenuOpen? : boolean,

        extraValue? : string,

        lang? : string,
    }

    import type { CombiTableColumn } from '$lib/combitabletypes';
    import { tick } from 'svelte';
    import { getContext } from 'svelte';
    import DetailsFieldSet from './DetailsFieldSet.svelte';
    import calendarIcon from "$lib/assets/bitcoin-icons--calendar-outline.svg?raw"
    import { PartialDateYear_Month, 
        PartialDateYear_Day, 
        PartialDateMonth_Day, getToday, 
        splitPartialDate, 
        joinPartialDate } from '$lib/utils';

    import DateSelector from './DateSelector.svelte';

    let {
        col,
        value = $bindable(),
        extraValue = "",
        dateFormat = "yyyy-mm-dd",
        lang = "en",
        editMenuOpen = $bindable(false),
    } : Props = $props();
    let origValue = (Array.isArray(value)) ? [...value] : value;

    let No = $derived(lang == "de" ? "Nein" : (lang == "el" ? "Όχι" : "No"));
    let Yes = $derived(lang == "de" ? "Ja" : (lang == "el" ? "Ναι" : "Yes"));
    let Unset = $derived(lang == "de" ? "Ungefasst" : (lang == "el" ? "Άδιο" : "Unset"));

    /*if (col.type == "select:string" || col.type == "select:integer") {
        if (col.names && col.values) {
            let matches = col.names.filter((val, idx) => (col.values??[])[idx] == value)
            if (matches && matches.length > 0) value = matches[0]
        } else if (col.names) {
            let matches = col.names.filter((val, idx) => (col.names??[])[idx] == value)
            if (matches && matches.length > 0) value = matches[0]
        } else if (col.values) {
            let matches = col.values.filter((val, idx) => (col.values??[])[idx] == value)
            if (matches && matches.length > 0) value = matches[0]
        }
    }*/

    getContext<DetailsFieldSet>("detailsfieldset").registerGetAndSetValue(getValue, setValue, setOriginalValue);
    getContext<DetailsFieldSet>("detailsfieldset").registerResetValue(resetValue);
    getContext<DetailsFieldSet>("detailsfieldset").registerGetFieldError(getFieldError);
    getContext<DetailsFieldSet>("detailsfieldset").registerIsDirty(isDirty);
    getContext<DetailsFieldSet>("detailsfieldset").registerPersist(persist);
    getContext<DetailsFieldSet>("detailsfieldset").registerSetUpdateDisabled(setUpdateDisabled);

    const detailsfieldset = getContext<DetailsFieldSet>("detailsfieldset");

    function isEmpty(field : any) {
        if ((col.type == "integer" || col.type == "select:integer" || col.type == "boolean")) {
            if (field === undefined || field === "" || field === null) return true;
        } else if (col.type.startsWith("array")) {
            if (field === undefined || field === null || field === "" || (Array.isArray(field) && field.length == 0)) return true;
        } else if (!field) return true;
        return false;
    }

    
    function getValue() : {value: any, col: CombiTableColumn} {
        if (col.type == "array:string") {
            if (extraValue) {
                return {value: [...(value as string[]), extraValue], col}
            }
            return {value: value as string[], col};
        } 
        return {value, col};
    }

    function setValue(val: any) {
        value = val;
        if (col.type == "array:string") {
            extraValue = "";
        }
    }

    function setOriginalValue(val: any) {
        origValue = val;
        value = val;
        if (col.type == "array:string") {
            extraValue = "";
        }
    }

    function persist() {
        if (col.type == "array:string") {
            if (extraValue) {
                value.push(extraValue);
                origValue = [...value];
                extraValue = "";
                displayValue = value;
            }
        } 
        
    }

    function resetValue() {
        if (Array.isArray(origValue)) {
            value = [...origValue]
        } else if (col.type.startsWith("select:")) {
            value = origValue;

        } else {
            value = origValue;
        }
    }

    function stringIsDate(val : string) {
        if (dateFormat == "yyyy-mm-dd") return /^( *[0-9][0-9][0-9][0-9][/\.-][0-9][0-9]?[/\.-][0-9][0-9]? *?)$/.test(val);
        return /^( *[0-9][0-9]?[/\.-][0-9][0-9]?[/\.-][0-9][0-9][0-9][0-9] *?)$/.test(val) ;
    }

    function stringIsDateMonth(val : string) {
        return /^( *[0-9][0-9]?[/\.-][0-9][0-9][0-9][0-9] *?)$/.test(val) ;
    }

    function stringIsDateYear(val : string) {
        return /^( *[0-9][0-9][0-9][0-9] *?)$/.test(val);
    }

    function stringIsPartialDate(val: string) {
        return stringIsDate(val) || stringIsDateMonth(val) || stringIsDateYear(val);
    }

    function getFieldError() : string|undefined {
        let errors : string[] = [];
            if (!col.nullable && !col.readOnly && isEmpty(value)) {
                return "Must enter a value for " + col.name;
            } else if (value) {
                if (col.type == "integer") {
                    if (!/^ *([+-]?[0-9]+) *$/.test(value)) {
                        return col.name + " must be an integer";
                    }
                } else if (col.type == "float") {
                    if (!/^ *[-+]?([0-9]*[.])?[0-9]+([eE][-+]?\d+)? *$/.test(value)) {
                        return col.name + " must be a number";
                    }
                } else if (col.type == "date") {
                    if (!stringIsDate(value)) {
                        return col.name + " must be in the form " + dateFormat;
                    }

                } else if (col.type == "partialdate") {
                    if (!stringIsPartialDate(value)) {
                        return col.name + " must be in the form " + dateFormat;
                    }

                }
            } else if (col.type == "datetime") {
                if (!/^( *[0-9][0-9][0-9][0-9]-[0-9][0-9]?-[0-9][0-9](T[0-9][0-9]?:[0-9][0-9]?:[0-9][0-9]?(\.[0-9]*)?[A-Za-z]?)? *?)$/.test(value)) {
                    return col.name + " must be in the form yyyy-mm-ddThh:99:ss.sssZ";
                }
            }

        return undefined;
    }

    let valueMap : {[key:string|number]:string|number} = {};
    let displayValue = $state(value);
    $effect(() => {

        if (col.type == "select:string" || col.type == "select:integer") {
            if (col.names && col.values) {
                for (let i=0; i<col.names.length; ++i) {
                    if (valueMap[col.values[i]] != col.names[i]) valueMap[col.values[i]] = col.names[i]
                }
            }
        }

        extraValue = "";
        if (value === undefined || value === null ||  value === "") { 
            displayValue = "";
        } else if (col.type == "select:string" || col.type == "select:integer") {
            if (col.names && col.values) {
                if (value in valueMap) {
                    displayValue = valueMap[value];
                } else {
                    displayValue = "";
                }
            } else if (col.names) {
                let matches = col.names.filter((val, i) => col.names && col.names[i] == val);
                displayValue = matches && matches.length > 0 ? matches[0] : "";
            } else if (col.values) {
                let matches = col.values.filter((val, i) => col.values && col.values[i] == val);
                displayValue = matches && matches.length > 0 ? matches[0] : "";
            }
        } else if (col.type == "date" && typeof(value) != "string") {
            displayValue = printDate(value, "")
        } else if (col.type == "boolean") {
            displayValue = value ? Yes : No
        } else if (col.type == "array:string") {
            displayValue = value ? [...value] : [];
        } else {
            displayValue = defaultValue(value);
        }
    });

    let dirty = $state(false);
    $effect(() => {
        let newDirty = false;
        const recField = origValue;
        if (col.type == "array:string" && extraValue) newDirty = true;
        else if (!isEmpty(value) && isEmpty(recField)) newDirty = true;
        else if (isEmpty(value) && !isEmpty(recField)) newDirty = true;
        else if (isEmpty(value) && isEmpty(recField)) newDirty = false;
        else {
            if (Array.isArray(value) && recField) {
                if (value.length != recField.length) {
                    newDirty = true;
                } else {
                    for (let j=0; j<value.length; ++j) {
                        if (value[j] != recField[j]) {
                            newDirty =  true;
                        }
                    }
                }
            } else if (col.type.startsWith("select:")) {               
                 if (col.names && col.values) {
                    let matches = col.values.filter((val, idx) => (col.values??[])[idx] == origValue)
                    if (matches && matches.length > 0 && matches[0] != value) newDirty = true;
                } else if (col.names) {
                    let matches = col.names.filter((val, idx) => (col.names??[])[idx] == origValue)
                    if (matches && matches.length > 0 && matches[0] != value) newDirty = true;
                } else if (col.values) {
                    let matches = col.values.filter((val, idx) => (col.values??[])[idx] == origValue)
                    if (matches && matches.length > 0 && matches[0] != value) newDirty = true;
                }
            } else {
                if (value != recField) {
                    newDirty = true;
                }
            }
        }
        if (newDirty != dirty) {
            dirty = newDirty;
            detailsfieldset.updateDirty();
        }

    });

    function isDirty() {
        return dirty;
    }

    let updateDisabled = $state(false);
    function setUpdateDisabled(val : boolean) {
        updateDisabled = val;
    }

    //export let dirty = false;

    export function printDate(date : Date|undefined|null|string, defaultValue="") : string {
        if (!date) return defaultValue;
        if (typeof(date) == "string") return date;
        if (dateFormat == "yyyy-mm-dd") {
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

    export function parseDate(val : string) : Date {
        val = val.trim();
        if (val.indexOf("T") > 0) {
            val = val.split("T")[0];
            return parseISODate(val);
        }
        const parts = val.trim().split("-");
        if (parts.length != 3) throw Error("Date " + val + " should be dd-mm-yyyy");
        let dateStr = parts[2] + "-" + parts[1] + "-" + parts[2];
        if (dateFormat == "yyyy-mm-dd") {
            dateStr = parts[0] + "-" + parts[1] + "-" + parts[0];
        } else if (dateFormat == "mm-dd-yyyy") {
            dateStr = parts[2] + "-" + parts[0] + "-" + parts[1];

        } else {
            dateStr = parts[2] + "-" + parts[1] + "-" + parts[0];
        }
        return parseISODate(dateStr);
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
    let maxWidthStyle = $derived(colMaxWidthStyle(col));

    /*$: {
        dirty = !(!value && !origValue) && value != origValue;
    }*/

    function editRowUpdate(newValue : string) {

        let saveValue : string|number|null|boolean = newValue;
        if (col.nullable && newValue == "") saveValue = null;

        let changed = true;

        if (col.type == "boolean") {
            if (newValue === undefined || newValue === null || newValue === "") {
                saveValue = col.nullable ? null : false;
            } else {
                const l = newValue.toLowerCase();
                if (["yes", Yes.toLocaleLowerCase(), "true", "t", "y", "1"].includes(l)) {
                    saveValue = true;
                } else {
                    saveValue = false;
                }
            }
        } else if (col.type == "select:string" || col.type == "select:integer") {
            if (newValue == undefined || newValue == null || newValue == "") {
                saveValue = null;
            } else {
                let found = false;
                if (col.names && col.values) {
                    for (let i =0; i<col.names.length ; ++i) {
                        if (newValue == col.names[i]) {
                            saveValue = col.values[i];
                            displayValue = col.names[i];
                            found = true;
                        }
                    }
                } else if (col.names) {
                    for (let i =0; i<col.names.length ; ++i) {
                        if (newValue == col.names[i]) {
                            saveValue = col.names[i];
                            displayValue = col.names[i];
                            found = true;
                        }
                    }
                } else if (col.values) {
                    for (let i =0; i<col.values.length ; ++i) {
                        if (newValue == col.values[i]) {
                            saveValue = col.values[i];
                            displayValue = col.values[i];
                            found = true;
                        }
                    }
                }
                if (!found) {
                    value = null;
                    displayValue = "";
                }
            }
            
        } else {
            saveValue = newValue;
            displayValue = defaultValue(value);

        }


        changed = value !== saveValue;
        value = saveValue;

        if (dirty != changed) {
            dirty = changed;
            detailsfieldset.updateDirty();
        }
        editMenuOpen = false;
    }

    function editDetailsClicked(e : Event) {
        if (editMenuOpen) {
            let target = e.currentTarget;
            if (target instanceof Element) {
                //if (target.getBoundingClientRect().bottom > table.getBoundingClientRect().bottom) {
                    //setTimeout(() => {target.scrollIntoView({behavior: "smooth", block: "nearest"})}, 100);  // XXX disabled
                //}
            }
        }
    }

    function defaultValue(val : any|undefined) {
        if (!val && col.default) return col.default
        return val;
    }

    function fieldKeyPress(evt: KeyboardEvent) {
        let newDirty = dirty;
        if (col.type == "string" || (typeof(value) == "string")) {
            newDirty = displayValue !== value;
            if (newDirty) value = displayValue;
        } else if (col.type == "integer") {
            try {
                newDirty = parseInt(displayValue) !== value;
                if (newDirty) value = displayValue;
            } catch (e) {}
        } else if (col.type == "float") {
            try {
                newDirty = parseFloat(displayValue) !== value;
                if (newDirty) value = displayValue;
            } catch (e) {}
        } else if (col.type == "date") {
            try {
                newDirty = printDate(value, dateFormat) == displayValue;
                if (newDirty) value = displayValue;
            } catch (e) {}
        }
        if (newDirty != dirty) {
            dirty = newDirty;
            detailsfieldset.updateDirty();
        }
    }

    //////
    // Auto complete

    // svelte-ignore non_reactive_update
    let autoCompleteList : Element;
    let autoCompleteData = $state([] as string[]);
    let autoCompleteOpen : boolean = $state(false);

    function autoCompleteUpdate(col : CombiTableColumn, newValue : string|undefined|null) {
        if (newValue === null) {
            editMenuOpen = false;
            autoCompleteOpen = false;
            autoCompleteData = [];
            return;
        }

        let newDirty = newValue != value;
        if (newValue == undefined || newValue == null || newValue == "") {
            if (col.nullable) value = null;

        } else {
            if (col.type == "array:string") {
                extraValue = defaultValue(value)
            } else {
                value = newValue;
                displayValue = defaultValue(value)
            }

        }


        if (col.type == "array:string") {
            extraValue = defaultValue(newValue)
        } else {
            value = newValue;
            displayValue = defaultValue(newValue)
        }
        editMenuOpen = false;
        autoCompleteOpen = false;
        autoCompleteData = [];

        if (dirty != newDirty) {
            dirty = newDirty
            detailsfieldset.updateDirty();
        }

    }

    async function autoCompleteKeyPress(evt: KeyboardEvent) {
        if (!col.autoCompleteLink) return;
        let newValue = col.type == "array:string" ? extraValue : displayValue;
        await tick();
        //newValue = (evt.currentTarget as HTMLInputElement).value;
        if (newValue && newValue.length > 0) {
            autoCompleteOpen = true;

            // call link
            const url = col.autoCompleteLink + "?t="+encodeURIComponent(newValue);
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
                let target = autoCompleteList;
                if (target instanceof Element) {
                    //if (target.getBoundingClientRect().bottom > table.getBoundingClientRect().bottom) {
                    setTimeout(() => {target.scrollIntoView({behavior: "smooth", block: "nearest"})}, 100); // XXX disabled
                    //}
                }
            } else {
                autoCompleteOpen = false;
            }

        } else {
            autoCompleteOpen = false;
            autoCompleteData = []
        }
        
        if (!dirty) {
            dirty = true;
            detailsfieldset.updateDirty();
        }
        if (col.type != "array:string") {
            value = displayValue;
        }
    }

    async function handleACBlur(event : any) {
        // if the blur was because of outside focus
        // currentTarget is the parent element, relatedTarget is the clicked element
        //autoCompleteUpdate(col, null);
        if (event.relatedTarget == null || !(event.relatedTarget && event.currentTarget.parentNode.contains(event.relatedTarget))) {
            autoCompleteUpdate(col, null);
        }
    }

    async function handleEditBlur(event : any) {
        // if the blur was because of outside focus
        // currentTarget is the parent element, relatedTarget is the clicked element
        //autoCompleteUpdate(col, null);
        if (event.relatedTarget == null || !(event.relatedTarget && event.currentTarget.parentNode.contains(event.relatedTarget))) {
            editMenuOpen = false;
        }
    }

    function removeElement(i : number) {
        value.splice(i, 1);
        value = [...value];
    }
    function addElement() {
        value = [...value, extraValue];
        extraValue = "";
    }

    function closeEdit(evt : FocusEvent) {
        let id = (evt.relatedTarget as any)?.id as string;
        if (!id || (!(id.startsWith("edit_select_"+col.col+"-")) && !(id.startsWith("xedit_select_summary_"+col.col+"-"))) ) {
            //for (let col of columns) {
                editMenuOpen = false;
            //}
        }
    }

    // dateFiler

    let dateSelectorYear : number|undefined = $state();
    let dateSelectorMonth: number|undefined|null = $state();
    let dateSelectorDay : number|undefined|null = $state();
    
    function toggleDateDialog(col: string) {
        const dateStr = displayValue;
        if (!dateStr) {
            dateSelectorYear = getToday().getUTCFullYear();
            dateSelectorMonth = getToday().getUTCMonth();
            dateSelectorDay = getToday().getUTCDate();
        } else {
            try {
                let {year, month, day} = splitPartialDate(dateStr, dateFormat);
                dateSelectorYear = year;
                dateSelectorMonth = month;
                dateSelectorDay = day;
            } catch (e) {
                console.log(e);
                displayValue = "";
                dateSelectorYear = getToday().getUTCFullYear();
                dateSelectorMonth = getToday().getUTCMonth();
                dateSelectorDay = getToday().getUTCDate();
            }
        }
        if (editMenuOpen) {
            editMenuOpen = false;
        } else {
            editMenuOpen = true;
        }
        
    }

    function dateSelectorOk(col: CombiTableColumn, year: number, month: number|null, day: number|null) {
        const newValue = joinPartialDate(year, month, day, dateFormat);
        let newDirty = displayValue != newValue;
        displayValue = newValue;
        if (newDirty != dirty) {
            dirty = newDirty
            detailsfieldset.updateDirty();
        }
        editMenuOpen = false;
    }

    function dateSelectorCancel(col: CombiTableColumn) {
        editMenuOpen = false;
    }

</script>


{#if true}
    {@const editminwStyle = col.editMinWidth ? "min-width:" + col.editMinWidth + ";" : ""}
    {@const boolEditminwStyle = col.editMinWidth ? "min-width:" + col.editMinWidth + ";" : "min-width: 4rem;"}
    {@const editmaxwStyle = col.editMaxWidth ? "max-width:" + col.editMaxWidth + ";" : ""}
    {@const editHeightStyle = col.editHeight ? "height:" + col.editHeight + ";" : ""}
    {@const dropdownwidthStyle = col.dropdownWidth ? "width:" + col.dropdownWidth + ";" : ""}
    {@const cmaxwStyle = maxWidthStyle}
    {@const bg = col.nullable != true ? "bg-required" : "bg-base-200"}
    {#if col.type == "date" || col.type == "partialdate"}

        <div class="join">
            <input type="text join-item" class="input bg-base-200 {bg}" disabled={updateDisabled} style="{editminwStyle} {editmaxwStyle}" 
                bind:value={displayValue} 
                onkeyup={(evt) => {if (evt.key == "Escape") {editMenuOpen=false} else {fieldKeyPress(evt)}}}
            />
            <button class="btn join-item btn-outline btn-square border-gray-600" 
                onclick={() => toggleDateDialog(col.col)} 
                onkeyup={(e) => {if (e.key == "Escape") editMenuOpen = false;}}
                >{@html calendarIcon}</button>
            <details class="dropdown dropdown-end " bind:open={editMenuOpen} 
                id={"edit_date_"+col.col} 
            >
                <summary class="hidden" ></summary>
                    <DateSelector 
                        id={"edit_dateselector_"+col.col}
                        dateFormat={dateFormat as "yyyy-mm-dd"|"mm-dd-yyyy"|"dd-mm-yyyy"}
                        classes="dropdown-content border rounded border-gray-600 max-h-0.3 bg-base-200 rounded-box z-1 p-2 shadow mt-12 ml-4"
                        year={dateSelectorYear} 
                        month={dateSelectorMonth} 
                        day={dateSelectorDay} 
                        allowPartial={true}
                        onOk={(year, month, day) => dateSelectorOk(col, year, month, day)}
                        onCancel={() => dateSelectorCancel(col)}
                    ></DateSelector>
            </details>

        </div>

    {:else if col.autoCompleteLink && col.type != "array:string"}    
        <div class="acdropdown overflow:visible">
            <input role="button" class="input m-0 -mb-1 w-full cursor-text {bg}" disabled={updateDisabled} style="{editminwStyle} {editmaxwStyle}"  tabindex="0"
                onkeyup={(evt) => {if (evt.key == "Escape") {autoCompleteOpen = false} else {autoCompleteKeyPress(evt)}}}
                onblur={(evt) => handleACBlur(evt)}
                bind:value={displayValue}/>
            {#if autoCompleteOpen}
                <ul bind:this={autoCompleteList} class="menu dropdown-content border border-gray-600 rounded max-h-0.3 overflow-auto bg-base-200 rounded-box z-10 p-2 mt-4 shadow" style="{dropdownwidthStyle}">
                    {#each autoCompleteData as name}
                        <!-- svelte-ignore a11y_missing_attribute -->
                        <li><a tabindex="0" onclick={() => autoCompleteUpdate(col, name)} role="button" onkeyup={(evt) => {if (evt.key == "Enter") autoCompleteUpdate(col, name)}}>{name}</a></li>
                    {/each}
                </ul>
            {/if}
        </div>
    {:else if col.type != "select:string" && col.type != "select:integer" && col.type != "boolean" && col.type != "array:string"}
        {#if col.editHeight}
            {#if col.default}
                <textarea class="textarea bg-base-200 align-top {bg}" disabled={updateDisabled} style="{editminwStyle} {editmaxwStyle} {editHeightStyle}" onkeyup={(evt) => fieldKeyPress(evt)} bind:value={displayValue}  tabindex="0"></textarea>
            {:else}
                <textarea class="textarea bg-base-200 align-top {bg}" style="{editminwStyle} {editmaxwStyle} {editHeightStyle}" disabled={updateDisabled} onkeyup={(evt) => fieldKeyPress(evt)} bind:value={displayValue}  tabindex="0"></textarea>
            {/if}
        {:else}
            {#if col.default}
                <input type="text" class="input bg-base-200 {bg}" style="{editminwStyle} {editmaxwStyle}" disabled={updateDisabled} onkeyup={(evt) => fieldKeyPress(evt)} bind:value={displayValue}  tabindex="0"/>
            {:else}
                <input type="text" class="input bg-base-200 {bg}" style="{editminwStyle} {editmaxwStyle}" disabled={updateDisabled} onkeyup={(evt) => fieldKeyPress(evt)} bind:value={displayValue}  tabindex="0"/>
            {/if}
        {/if}
    {:else if col.type == "array:string"}
        <div>
                {#each displayValue as val, i}
                    <div class="mb-2">
                        {#if !col.readOnly}
                            <button class="btn btn-neutral btn-small h-8 text-lg w-8 mr-2" disabled={updateDisabled} onclick={() => removeElement(i)}>-</button>
                        {/if}
                        {val}
                    </div>
                {/each}
                <div>
                    {#if !col.readOnly}
                        <button class="btn btn-neutral btn-small h-8 text-lg w-8 mr-2" disabled={extraValue==""} onclick={() => addElement()}>+</button>
                            {#if col.autoCompleteLink}
                                <div class="acdropdown overflow:visible">
                                    <input role="button" class="input m-0 -mb-1 w-full cursor-text {bg}" disabled={updateDisabled} style="{editminwStyle} {editmaxwStyle}"  tabindex="0"
                                        onkeyup={(evt) => {if (evt.key == "Escape") {autoCompleteOpen = false} else {autoCompleteKeyPress(evt)}}}
                                         onblur={(evt) => handleACBlur(evt)}
                                       bind:value={extraValue}/>
                                    {#if autoCompleteOpen} 
                                        <ul bind:this={autoCompleteList} class="menu dropdown-content bg-base-100 rounded   p-1 mt-4 border border-gray-600" style="{dropdownwidthStyle}">
                                            {#each autoCompleteData as name}
                                                <!-- svelte-ignore a11y_missing_attribute -->
                                                <li><a tabindex="0" onclick={() => autoCompleteUpdate(col, name)} role="button" onkeyup={(evt) => {if (evt.key == "Enter") autoCompleteUpdate(col, name)}}>{name}</a></li>
                                            {/each}
                                        </ul>
                                    {/if}
                                </div>
                            {:else}
                                <input type="text" class="input bg-base-200" disabled={updateDisabled} style="{editminwStyle} {editmaxwStyle}" onkeyup={(evt) => fieldKeyPress(evt)} bind:value={extraValue}  tabindex="0"/>
                            {/if}
                    {/if}
                </div>

        </div>
    {:else if col.type == "boolean"}
        {@const disabled = updateDisabled ? "disabled" : ""}
        <div tabindex="-1" class="join bg-base-200">
            <input readonly tabindex="-1" bind:value={displayValue} class="input join-item bg-base-200 {bg}" style="{boolEditminwStyle} {editmaxwStyle}"/>

            <details class="dropdown dropdown-end" bind:open={editMenuOpen}>
            <summary class="btn btn-outline btn-square border-gray-600 {bg} join-item" 
            onkeyup={(e) => {if (e.key == "Escape") {editMenuOpen = false}}}
            onblur={(evt) => closeEdit(evt)}>&#x25bc</summary>
            <ul id={"edit_select_"+col.col} class="menu dropdown-content bg-base-100 rounded   p-1 mt-2 border border-gray-600" style="{dropdownwidthStyle}">
                {#if col.nullable}
                    <!-- svelte-ignore a11y_missing_attribute -->
                    <li><a tabindex="0" id={"edit_select_"+col.col+"-"} onclick={() => editRowUpdate("")} role="button" onkeyup={(evt) => {if (evt.key == "Enter") editRowUpdate("")}}>{Unset}</a></li>
                {/if}
                <!-- svelte-ignore a11y_missing_attribute -->
                <li><a tabindex="0" id={"edit_select_"+col.col+"-f"} onclick={() => editRowUpdate(No)} role="button" onkeyup={(evt) => {if (evt.key == "Enter") editRowUpdate("No")}}>{No}</a></li>
                <!-- svelte-ignore a11y_missing_attribute -->
                <li><a tabindex="0" id={"edit_select_"+col.col+"-t"} onclick={() => editRowUpdate(Yes)} role="button" onkeyup={(evt) => {if (evt.key == "Enter") editRowUpdate("Yes")}}>{Yes}</a></li>
            </ul>
            </details>
        </div>
    {:else if col.names}
        {@const disabled = updateDisabled ? "disabled" : ""}

        <div tabindex="-1" class="join bg-base-200">
            <input readonly tabindex="-1" bind:value={displayValue} class="input join-item bg-base-200 {bg}" style="{boolEditminwStyle} {editmaxwStyle}"/>

            <details class="dropdown dropdown-end" bind:open={editMenuOpen}>
            <summary class="btn btn-outline btn-square border-gray-600 {bg} join-item" 
            onkeyup={(e) => {if (e.key == "Escape") {editMenuOpen = false}}}
            onblur={(evt) => closeEdit(evt)}>&#x25bc</summary>
            <ul id={"edit_select_"+col.col} class="menu dropdown-content bg-base-100 rounded z-1 p-2 border mt-2 border-gray-600" style="{dropdownwidthStyle}">
                {#if col.nullable == true}
                    <!-- svelte-ignore a11y_missing_attribute -->
                    <li><a tabindex="0" id={"edit_select_"+col.col+"-"} onclick={() => editRowUpdate("")} role="button" onkeyup={(evt) => {if (evt.key == "Enter") editRowUpdate("")}}>{Unset}</a></li>
                {/if}
                {#each col.names as val, i}
                <!-- svelte-ignore a11y_missing_attribute -->
                <li><a tabindex="0" id={"edit_select_"+col.col+"-f"} onclick={() => editRowUpdate(val+"")} role="button" onkeyup={(evt) => {if (evt.key == "Enter") editRowUpdate(val+"")}}>{val}</a></li>
                {/each}
            </ul>
            </details>
        </div>

    {:else if col.values}
        {@const disabled = updateDisabled ? "disabled" : ""}
 
        <details class="dropdown dropdown-end" bind:open={editMenuOpen}>
            <summary class="btn btn-outline btn-square border-gray-600 {bg} join-item" 
            onkeyup={(e) => {if (e.key == "Escape") {editMenuOpen = false}}}
            onblur={(evt) => closeEdit(evt)}>&#x25bc</summary>
            <ul id={"edit_select_"+col.col} class="menu dropdown-content bg-base-100 rounded z-1 p-2 border mt-2 border-gray-600" style="{dropdownwidthStyle}">
                {#if col.nullable == true}
                    <!-- svelte-ignore a11y_missing_attribute -->
                    <li><a tabindex="0" id={"edit_select_"+col.col+"-"} onclick={() => editRowUpdate("")} role="button" onkeyup={(evt) => {if (evt.key == "Enter") editRowUpdate("")}}>{Unset}</a></li>
                {/if}
                {#each col.values as val, i}
                <!-- svelte-ignore a11y_missing_attribute -->
                <li><a tabindex="0" id={"edit_select_"+col.col+"-f"} onclick={() => editRowUpdate(val+"")} role="button" onkeyup={(evt) => {if (evt.key == "Enter") editRowUpdate(val+"")}}>{val}</a></li>
                {/each}
            </ul>
            </details>
    {/if}
{/if}
<div class="hidden bg-base-200"></div>
<div class="hidden bg-required"></div>

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

.acdropdown .dropdown-content {
  position: absolute;
}

/* prevents click events and text selection */
/*
details[disabled] summary,
details.disabled summary {
pointer-events: none; 
user-select: none; 
}
*/
</style>
