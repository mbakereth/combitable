<script lang="ts">
    import { goto, invalidateAll } from '$app/navigation';
    import type { CombiTableColumn } from '$lib/combitabletypes';
    import CombiTableValidateDialog from '$lib/components/CombiTableErrorDialog.svelte';
    import CombiTableDiscardChanges from '$lib/components/CombiTableDiscardChanges.svelte';
    import { validateField } from '$lib/utils';
    import CombiTableInfoDialog from '$lib/components/CombiTableInfoDialog.svelte';
    import CombiTableConfirmDeleteDialog from '$lib/components/CombiTableConfirmDeleteDialog.svelte';
    import { page } from '$app/stores';

    export let rec : {[key:string]:any};
    export let data : any[]
    export let cols : CombiTableColumn[]
    export let pk : string|undefined = undefined;
    export let editUrl : string|undefined = undefined;
    export let addUrl : string|undefined = undefined;
    export let newUrl : string|undefined = undefined;
    export let deleteUrl : string|undefined = undefined;
    export let deleteNextPage : string|undefined = undefined;
    export let isAdd = false;    
    export let dateFormat = "yyyy-mm-dd";

    function getRecField(col : string) {
        let obj = rec;
        const parts = col.split(".");
        for (let i=0; i<parts.length-1; ++i) {
            if (!obj || !(parts[i] in obj)) {
                return undefined;
            }
            if (Array.isArray(obj[parts[i]])) {
                obj = obj[parts[i]][0];
            } else {
                obj = obj[parts[i]];
            }
        }
        if (!obj || !(parts[parts.length-1] in obj)) return undefined;
        return obj[parts[parts.length-1]];
    }

    $: dirty = false;
    $: {
        dirty = false;
        if (data && cols && cols.length == data.length) {
            for (let i=0; i<data.length; ++i) {
                const recField = getRecField(cols[i].col);
                if (!(!data[i] && !recField)) {
                    if (Array.isArray(data[i]) && recField) {
                        if (data[i].length != recField.length) {
                            dirty = true;
                            break;
                        } else {
                            for (let j=0; j<data[i].length; ++j) {
                                if (data[i][j] != recField[j]) {
                                    dirty = true;
                                    break;
                                }
                            }
                        }
                    } else {
                        if (data[i] != recField) {
                            dirty = true;
                            break;
                        }
                    }
                }
            }

        }
    }


    // show dialogs
    $: validationErrors = undefined as string[]|string|undefined;
    $: opInfo = "";

    export function showError(errors: string[]|string) {
        validationErrors = errors;
        (document.querySelector('#validateDialog') as HTMLDialogElement)?.showModal(); 
    }
    export function showInfo(info : string) {
        opInfo = info;
        (document.querySelector('#infoDialog') as HTMLDialogElement)?.showModal(); 
    }

    function cancelEdit() {
        if (isAdd) {
            (document.querySelector('#confirmEditDiscard') as HTMLDialogElement)?.showModal(); 
        } else if (!dirty) {
            confirmCancelEdit();
        } else {
            (document.querySelector('#confirmEditDiscard') as HTMLDialogElement)?.showModal(); 
        }
    }

    async function confirmCancelEdit() {
        if (isAdd) {
            let prev = $page.url.searchParams.get("prev");
            if (prev) {
                await invalidateAll();
                goto(prev);
            }
        } else {
            for (let i=0; i<data.length; ++i) {
                data[i] = getRecField(cols[i].col);
                if (Array.isArray(data[i])) data[i] = [...data[i]];
            }
            //data = [...data];
        }

    }

    function validate() {
        let errors : string[] = [];
        let error : string|undefined = undefined;
        for (let i=0; i<data.length; ++i) {
            error = validateField(cols[i], data[i], dateFormat); 
            if (error) errors.push(error);
        }
        return errors;
    }

    async function saveEdit() {
        validationErrors = validate();
        if (validationErrors.length > 0) {
            (document.querySelector('#validateDialog') as HTMLDialogElement)?.showModal(); 
        } else {
            if (isAdd && !addUrl) {
                console.log("No edit url defined");
                return;
            }
            if (!isAdd && !editUrl) {
                console.log("No edit url defined");
                return;
            }
            const url = (isAdd ? addUrl : editUrl) ?? "";
            if (!pk) {
                console.log("No pk defined");
                return;
            }
            try {
                let body : {[key:string]:any} = {};
                body._pk = rec[pk] ?? undefined;
                for (let i=0; i<data.length; ++i) {
                    body[cols[i].col] = data[i];
                };
                const resp = await fetch(url, {
                    method: "POST",
                    headers: {"content-type": "application/json"},
                    body: JSON.stringify(body),
                });
                if (!resp.ok) {
                    showError("Error saving data");
                } else {
                    const body = await resp.json();
                    if (body.errors) {
                        showError(body.errors);
                    } else {
                        //rec = body.row;
                        /*for (let i=0; i<data.length; ++i) {
                            //body[cols[i].col] = data[i];
                            //data[i] = getRecField(cols[i].col)
                        };*/
                        dirty = false;
                        let infoText = "Record saved";
                        if (body.info) {
                            let info : string[] = Array.isArray(body.info) ? body.info : [body.info];
                            infoText += '<ul class="list-disc">\n';
                            for (let l of body.info) {
                                infoText += "<li>" + l + "</li>\n";
                            }
                            infoText += "</ul>\n";
                        }
                        showInfo(infoText);
                        await invalidateAll();
                        if (body.url) {
                            goto(body.url);
                        } else {
                            goto($page.url);
                        }
                    }
                }
            } catch (e) {
                console.log(e);
                showError("Couldn't call save function");
            }
        }
    }

    function deleteRow() {
        (document.querySelector('#confirmDelete') as HTMLDialogElement)?.showModal(); 
    }
    async function confirmDeleteRow() {
        if (!pk) {
            console.log("Pk not set");
            return;
        }
        if (!deleteUrl) {
            console.log("deleteUrl not set");
            return;
        }
        const resp = await fetch(deleteUrl, {
                method: "POST",
                headers: {"content-type": "application/json"},
                body: JSON.stringify({_pk: rec[pk]}),
            });
            if (!resp.ok) {
                showError("Error deleting row");
            } else {
                const body = await resp.json();
                if (body.error) {
                    showError("Error deleting row");
                } else {
                    goto(deleteNextPage ?? "/");
                }
            }
    }

    async function newEntry(url : string) {
        await invalidateAll(); 
        let joiner = url.includes("?") ? "&" : "?";
        goto(url + joiner + "prev=" + encodeURIComponent($page.url.toString()))
    }
</script>

<div>
    {#if (addUrl && newUrl
    ) || editUrl || deleteUrl}
        <div class="m-4 mt-8 mb-0">
            {#if addUrl || editUrl }
                <button class="btn btn-success mt-0 mb-0" disabled={!dirty} on:click={() => saveEdit()}>Save</button>
                <button class="btn btn-neutral mt-0 mb-0" disabled={!dirty && !isAdd} on:click={() => cancelEdit()}>Cancel</button>
            {/if}                 
            {#if addUrl && newUrl }
            <button class="btn btn-primary mt-0 mb-0" disabled={dirty || isAdd} on:click={async () => {await newEntry(newUrl);}}>New</button>
            {/if}                 
            {#if deleteUrl }
            <button class="btn btn-error mt-0 mb-0" disabled={dirty} on:click={() => deleteRow()}>Delete</button>
            {/if}                 
        </div>    
    {/if}                 
</div>

<!-- Modal to display validation errors -->
<CombiTableValidateDialog id="validateDialog" errors={validationErrors}/>

<!-- Modal to confirm discarding edit -->
<CombiTableDiscardChanges id="confirmEditDiscard" okFn={confirmCancelEdit}/>

<!-- Modal to display information after executing a function -->
<CombiTableInfoDialog id="infoDialog" info={opInfo}/>

<!-- Modal to display delete confirmation -->
<CombiTableConfirmDeleteDialog id="confirmDelete" okFn={confirmDeleteRow}/>