<script lang="ts">
    import type { CombiTableColumn } from '@mbakereth/combitable';

    export let col : CombiTableColumn;
    export let rec : {[key:string]:any};
    export let value : any;
    export let dateFormat = "yyyy-mm-dd"; // or "yyyy-mm-dd" or "mm-dd-yyyy"

    export let dirty = false;
    export let editMenuOpen = false;
    export let table : Element;

    export function printDate(date : Date|undefined|null, defaultValue="") : string {
        if (!date) return defaultValue;
        if (dateFormat == "yyyy-mm-dd") {
            return String(date.getFullYear()) + "-" + String((date.getMonth())+1).padStart(2, '0') + "-" + String(date.getDate()).padStart(2, '0')
        }
        if (dateFormat == "mm-dd-yyyy") {
            return String(date.getMonth()).padStart(2, '0') + "-" + String((date.getDate())+1).padStart(2, '0') + "-" + String(date.getFullYear())
        }
        return String(date.getDate()).padStart(2, '0') + "-" + String((date.getMonth())+1).padStart(2, '0') + "-" + String(date.getFullYear())
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

    function editRowUpdate(newValue : string) {

        let valueToSave : boolean|string|number|Date|null = value;
        if (newValue == "") valueToSave = null;
        
        let changed = true;
        if (col.name in rec && newValue == rec[col.name]) changed = false;

        if (changed) {
            if (col.type == "boolean") {
                if (newValue == undefined || newValue == null || newValue == "") {
                    valueToSave = false;
                } else {
                    if (value.toLowerCase() in ["yes", "true", "t", "y", "1"]) {
                        valueToSave = true;
                    } else {
                        valueToSave = false;
                    }
                }
            } else if (col.type == "select:string" || col.type == "select:integer") {
                if (newValue == undefined || newValue == null || newValue == "") {
                    valueToSave = false;
                } else {
                    for (let i =0; i<(col.values ?? []).length ; ++i) {
                        if (col.values && value == col.values[i]) {
                            valueToSave = col.values[i];
                            break;
                        }
                    }
                }
                
            }

        }

        dirty = changed;
        editMenuOpen = false;
        value = newValue;
        console.log("Set value to " + value)
        rec = {...rec, [col.col]: valueToSave}
    }

    function editDetailsClicked(e : Event) {
        if (editMenuOpen) {
            let target = e.currentTarget;
            if (target instanceof Element) {
                if (target.getBoundingClientRect().bottom > table.getBoundingClientRect().bottom) {
                    target.scrollIntoView({behavior: "smooth", block: "start"}); 
                }
            }
        }
    }

function defaultValue(val : any|undefined) {
    if (!val && col.default) return col.default
    return val;
}
</script>

{#if true}
{@const editminwStyle = col.editMinWidth ? "min-width:" + col.editMinWidth + ";" : ""}
{@const editmaxwStyle = col.editMaxWidth ? "max-width:" + col.editMaxWidth + ";" : ""}
{@const dropdownwidthStyle = col.dropdownWidth ? "width:" + col.dropdownWidth + ";" : ""}
{@const cmaxwStyle = maxWidthStyle}
{@const bg = col.nullable != true ? "bg-required" : "bg-base-200"}
{#if col.type == "date"}
    <input type="text" class="input bg-base-200 w-40" value={printDate(value, "")} style="{editminwStyle} {editmaxwStyle}"/>
{:else if col.type != "select:string" && col.type != "select:integer"}
{#if col.default}
    <input type="text" class="input bg-base-200 w-40" value={defaultValue(value)} style="{editminwStyle} {editmaxwStyle}"/>
{:else}
    <input type="text" class="input bg-base-200 w-40" bind:value={value} style="{editminwStyle} {editmaxwStyle}"/>
{/if}
{:else if col.values}
    <details class="dropdown overflow:visible" bind:open={editMenuOpen}  on:toggle={e => editDetailsClicked(e)}>
        <summary class="btn m-0 -mb-1 w-full {bg}" style="{editminwStyle} {editmaxwStyle}">{value}</summary>
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <ul class="menu dropdown-content max-h-1/3 overflow-auto bg-base-200 rounded-box -z-1 p-2 mt-2 shadow" style="{dropdownwidthStyle}">
            {#if col.nullable}
                <!-- svelte-ignore a11y-missing-attribute -->
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <li><a on:click={() => editRowUpdate("")}>Unset</a></li>
            {/if}
            {#each col.values as val, i}
            <!-- svelte-ignore a11y-missing-attribute -->
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <li><a on:click={() => editRowUpdate(val+"")}>{val}</a></li>
            {/each}
        </ul>
    </details>  
{/if}
{/if}
<div class="hidden bg-required bg-base-200"></div>
