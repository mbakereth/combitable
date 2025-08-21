<script lang="ts">
    import type { CombiTableColumn } from '$lib/combitabletypes';
    import { tick } from 'svelte';
    import { readonly } from 'svelte/store';

    export let col : CombiTableColumn;
    export let value : any;
    let origValue = value;
    export let dateFormat = "yyyy-mm-dd"; // or "yyyy-mm-dd" or "mm-dd-yyyy"

    let valueMap : {[key:string|number]:string|number} = {};
    if (col.type == "select:string" || col.type == "select:integer") {
        if (col.names && col.values) {
            for (let i=0; i<col.names.length; ++i) {
                valueMap[col.values[i]] = col.names[i]
            }
        }
    }
    $: displayValue = value;
    $: extraValue = "";
    $: {
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
            displayValue = value ? "Yes" : "No"
        } else if (col.type == "array:string") {
            displayValue = value ? [...value] : [];
        } else {
            displayValue = defaultValue(value);
        }
    } 

    export let dirty = false;
    export let editMenuOpen = false;

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
    let maxWidthStyle : string = ""
    maxWidthStyle = colMaxWidthStyle(col);

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
                if (["yes", "true", "t", "y", "1"].includes(l)) {
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

        dirty = changed;
        editMenuOpen = false;
    }

    function editDetailsClicked(e : Event) {
        if (editMenuOpen) {
            let target = e.currentTarget;
            if (target instanceof Element) {
                //if (target.getBoundingClientRect().bottom > table.getBoundingClientRect().bottom) {
                    setTimeout(() => {target.scrollIntoView({behavior: "smooth", block: "nearest"})}, 100); 
                //}
            }
        }
    }

    function defaultValue(val : any|undefined) {
        if (!val && col.default) return col.default
        return val;
    }

    function fieldKeyPress(evt: KeyboardEvent) {
        if (col.type == "string" || (typeof(value) == "string")) {
            dirty = displayValue !== value;
            if (dirty) value = displayValue;
        } else if (col.type == "integer") {
            try {
                dirty = parseInt(displayValue) !== value;
                if (dirty) value = displayValue;
            } catch (e) {}
        } else if (col.type == "float") {
            try {
                dirty = parseFloat(displayValue) !== value;
                if (dirty) value = displayValue;
            } catch (e) {}
        } else if (col.type == "date") {
            try {
                dirty = printDate(value, dateFormat) == displayValue;
                if (dirty) value = displayValue;
            } catch (e) {}
        }
    }

    //////
    // Auto complete

    let autoCompleteDiv : Element;
    let autoCompleteList : Element;
    let autoCompleteData : string[];
    $: autoCompleteData = [];
    let autoCompleteOpen : boolean = false;

    function autoCompleteUpdate(col : CombiTableColumn, newValue : string|undefined|null) {
        if (newValue === null) {
            editMenuOpen = false;
            autoCompleteOpen = false;
            autoCompleteData = [];
            return;
        }

        dirty = newValue != value;
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
    }

    async function autoCompleteKeyPress(evt: KeyboardEvent, newValue : string|undefined) {
        if (!col.autoCompleteLink) return;
        await tick();
        newValue = (evt.currentTarget as HTMLInputElement).value;
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
                    setInterval(() => {target.scrollIntoView({behavior: "smooth", block: "nearest"})});
                    //}
                }
            } else {
                autoCompleteOpen = false;
            }

        } else {
            autoCompleteOpen = false;
            autoCompleteData = []
        }
        
        dirty = true;
        if (col.type != "array:string")
            value = displayValue;
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

</script>

{#if true}
    {@const editminwStyle = col.editMinWidth ? "min-width:" + col.editMinWidth + ";" : ""}
    {@const editmaxwStyle = col.editMaxWidth ? "max-width:" + col.editMaxWidth + ";" : ""}
    {@const editHeightStyle = col.editHeight ? "height:" + col.editHeight + ";" : ""}
    {@const dropdownwidthStyle = col.dropdownWidth ? "width:" + col.dropdownWidth + ";" : ""}
    {@const cmaxwStyle = maxWidthStyle}
    {@const bg = col.nullable != true ? "bg-required" : "bg-base-200"}
    {#if col.type == "date"}
        <input type="text" class="input bg-base-200 w-40 {bg}" on:keyup={(evt) => fieldKeyPress(evt)} bind:value={displayValue} style="{editminwStyle} {editmaxwStyle}"  tabindex="0"/>
    {:else if col.autoCompleteLink && col.type != "array:string"}    
        <div class="acdropdown overflow:visible" bind:this={autoCompleteDiv}>
            <input role="button" class="input m-0 -mb-1 w-full cursor-text {bg}" style="{editminwStyle} {editmaxwStyle}"  tabindex="0"
                on:keyup={(evt) => autoCompleteKeyPress(evt, value)}
                on:blur={(evt) => handleACBlur(evt)}
                bind:value={displayValue}/>
            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
            {#if autoCompleteOpen}
                <ul bind:this={autoCompleteList} class="menu dropdown-content max-h-1/3 overflow-auto bg-base-200 rounded-box z-10 p-2 mt-2 shadow border border-base-100" style="{dropdownwidthStyle}" tabindex="0">
                    {#each autoCompleteData as name}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <!-- svelte-ignore a11y-missing-attribute -->
                        <li><a on:click={() => autoCompleteUpdate(col, name)}>{name}</a></li>
                    {/each}
                </ul>
            {/if}
        </div>
    {:else if col.type != "select:string" && col.type != "select:integer" && col.type != "boolean" && col.type != "array:string"}
        {#if col.editHeight}
            {#if col.default}
                <textarea class="textarea bg-base-200 align-top {bg}" style="{editminwStyle} {editmaxwStyle} {editHeightStyle}" on:keyup={(evt) => fieldKeyPress(evt)} bind:value={displayValue}  tabindex="0"></textarea>
            {:else}
                <textarea class="textarea bg-base-200 align-top {bg}" style="{editminwStyle} {editmaxwStyle} {editHeightStyle}" on:keyup={(evt) => fieldKeyPress(evt)} bind:value={displayValue}  tabindex="0"></textarea>
            {/if}
        {:else}
            {#if col.default}
                <input type="text" class="input bg-base-200 {bg}" style="{editminwStyle} {editmaxwStyle}" on:keyup={(evt) => fieldKeyPress(evt)} bind:value={displayValue}  tabindex="0"/>
            {:else}
                <input type="text" class="input bg-base-200 {bg}" style="{editminwStyle} {editmaxwStyle}" on:keyup={(evt) => fieldKeyPress(evt)} bind:value={displayValue}  tabindex="0"/>
            {/if}
        {/if}
    {:else if col.type == "array:string"}
        <div>
        <table class="table table-sm border-none border-spacing-0 -ml-1 -p-4" style="border-bottom-width: 0px!important;">
            <tbody>
                {#each displayValue as val, i}
                    <tr style="border-bottom-width: 0px!important;">
                        {#if !col.readOnly}
                            <td class="w-16"><button class="btn btn-neutral btn-small h-8" on:click={() => removeElement(i)}>-</button></td>
                        {/if}
                        <td>{val}</td>
                    </tr>
                {/each}
                <tr style="border-bottom-width: 0px!important;">
                    {#if !col.readOnly}
                        <td class="w-16"><button class="btn btn-neutral btn-small h-8" disabled={extraValue==""} on:click={() => addElement()}>+</button></td>
                        <td>
                            {#if col.autoCompleteLink}
                                <div class="acdropdown overflow:visible" bind:this={autoCompleteDiv}>
                                    <input role="button" class="input m-0 -mb-1 w-full cursor-text {bg}" style="{editminwStyle} {editmaxwStyle}"  tabindex="0"
                                        on:keyup={(evt) => autoCompleteKeyPress(evt, value)}
                                        on:blur={(evt) => handleACBlur(evt)}
                                        bind:value={extraValue}/>
                                    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                    {#if autoCompleteOpen}
                                        <ul bind:this={autoCompleteList} class="menu dropdown-content max-h-1/3 overflow-auto bg-base-200 rounded-box z-10 p-2 mt-2 shadow border border-base-100" style="{dropdownwidthStyle}" tabindex="0">
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
                                <input type="text" class="input bg-base-200" style="{editminwStyle} {editmaxwStyle}" on:keyup={(evt) => fieldKeyPress(evt)} bind:value={extraValue}  tabindex="0"/>
                            {/if}
                        </td>
                    {/if}
                </tr>
            </tbody>
        </table>

        </div>
    {:else if col.type == "boolean"}
        <details class="dropdown overflow:visible" bind:open={editMenuOpen}  on:toggle={e => editDetailsClicked(e)}>
            <summary class="btn m-0 -mb-1 w-full {bg}" style="{editminwStyle} {editmaxwStyle}"  tabindex="0"
                on:blur={(evt) => handleEditBlur(evt)}
            >{displayValue}</summary>
            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
            <ul class="menu dropdown-content max-h-1/3 overflow-auto bg-base-200 rounded-box z-10  p-2 mt-2 shadow border border-base-100" style="{dropdownwidthStyle}" tabindex="0">
                {#if col.nullable}
                    <!-- svelte-ignore a11y-missing-attribute -->
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <li><a on:click={() => editRowUpdate("")}>Unset</a></li>
                {/if}
                <!-- svelte-ignore a11y-missing-attribute -->
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <li><a on:click={() => editRowUpdate("No")}>No</a></li>
                <!-- svelte-ignore a11y-missing-attribute -->
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <li><a on:click={() => editRowUpdate("Yes")}>Yes</a></li>
            </ul>
        </details>  
    {:else if col.values}
        <details class="dropdown overflow:visible" bind:open={editMenuOpen}  on:toggle={e => editDetailsClicked(e)}>
            <summary class="btn m-0 -mb-1 w-full {bg}" style="{editminwStyle} {editmaxwStyle}"  tabindex="0"
                on:blur={(evt) => handleEditBlur(evt)}
            >{displayValue}</summary>
            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
            <ul class="menu dropdown-content max-h-1/3 overflow-auto bg-base-200 rounded-box z-10  p-2 mt-2 shadow border border-base-100" style="{dropdownwidthStyle}" tabindex="0">
                {#if col.nullable}
                    <!-- svelte-ignore a11y-missing-attribute -->
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <li><a on:click={() => editRowUpdate("")}>Unset</a></li>
                {/if}
                {#if col.names}
                    {#each col.names as val, i}
                    <!-- svelte-ignore a11y-missing-attribute -->
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <li><a on:click={() => editRowUpdate(val+"")}>{val}</a></li>
                    {/each}
                {:else}
                    {#each col.values as val, i}
                    <!-- svelte-ignore a11y-missing-attribute -->
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <li><a on:click={() => editRowUpdate(val+"")}>{val}</a></li>
                    {/each}
                {/if}
            </ul>
        </details>  
    {/if}
{/if}
<div class="hidden bg-required bg-base-200"></div>

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

</style>
