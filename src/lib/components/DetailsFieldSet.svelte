<script lang="ts">
    import { goto, invalidateAll } from '$app/navigation';
    import type { CombiTableColumn } from '$lib/combitabletypes';
    import CombiTableValidateDialog from '$lib/components/CombiTableErrorDialog.svelte';
    import CombiTableDiscardChanges from '$lib/components/CombiTableDiscardChanges.svelte';
    import { validateField } from '$lib/utils';
    import CombiTableInfoDialog from '$lib/components/CombiTableInfoDialog.svelte';
    import CombiTableConfirmDeleteDialog from '$lib/components/CombiTableConfirmDeleteDialog.svelte';
    import { page } from '$app/stores';
    import { setContext } from 'svelte';
    import { SvelteSet } from 'svelte/reactivity';

    export let pk : string|number|undefined = undefined;
    export let editUrl : string|undefined = undefined;
    export let addUrl : string|undefined = undefined;
    export let newUrl : string|undefined = undefined;
    export let deleteUrl : string|undefined = undefined;
    export let deleteNextPage : string|undefined = undefined;
    export let isAdd = false;    

    setContext("detailsfieldset", { registerGetValue, registerGetFieldError, registerIsDirty, updateDirty, registerResetValue, registerPersist });

    let getValueFns = new SvelteSet<() => {value: any, col: CombiTableColumn}>();
    function registerGetValue(fn: () => {value: any, col: CombiTableColumn}) {
        getValueFns.add(fn);
    }

    let getFieldErrorFns = new SvelteSet<() => string|undefined>();
    function registerGetFieldError(fn: () => string|undefined) {
        getFieldErrorFns.add(fn);
    }

    let isDirtyFns = new SvelteSet<() => boolean>();
    function registerIsDirty(fn: () => boolean) {
        isDirtyFns.add(fn);
    }

    let resetValueFns = new SvelteSet<() => void>();
    function registerResetValue(fn: () => void) {
        resetValueFns.add(fn);
    }

    let persistFns = new SvelteSet<() => void>();
    function registerPersist(fn: () => void) {
        persistFns.add(fn);
    }

    $: dirty = false;
    function updateDirty() {
        dirty = false;
        isDirtyFns.forEach((fn) => {
            if (fn()) {
                dirty = true;
            }
        })
    }

    // show dialogs
    $: validationErrors = undefined as string[]|string|undefined;
    $: opInfo = "";

    export function showError(errors: string[]|string) {
        validationErrors = errors;
        (document.querySelector('#validateDialog1') as HTMLDialogElement)?.showModal(); 
    }
    export function showInfo(info : string) {
        opInfo = info;
        (document.querySelector('#infoDialog1') as HTMLDialogElement)?.showModal(); 
    }

    async function cancelEdit() {
        if (isAdd) {
            (document.querySelector('#confirmEditDiscard1') as HTMLDialogElement)?.showModal(); 
        } else if (!dirty) {
            confirmCancelEdit();
        } else {
            (document.querySelector('#confirmEditDiscard1') as HTMLDialogElement)?.showModal(); 
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
            for (let fn of resetValueFns) {
                fn();
            }
            //data = [...data];
        }

    }

    function validate() {
        let errors : string[] = [];
        let error : string|undefined = undefined;
        for (let fn of getFieldErrorFns) {
            error = fn(); 
            if (error) errors.push(error);
        }
        return errors;
    }

    $: nextUrl = $page.url.pathname;
    async function saveEdit() {
        validationErrors = validate();
        if (validationErrors.length > 0) {
            (document.querySelector('#validateDialog1') as HTMLDialogElement)?.showModal(); 
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
            nextUrl = $page.url.pathname;
            if (!pk) {
                console.log("No pk defined");
                return;
            }
            try {
                let body : {[key:string]:any} = {};
                body._pk = pk ?? undefined;
                for (let fn of getValueFns) {
                    let field = fn();
                    body[field.col.col] = field.value;
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
                        if (body.url) {
                            nextUrl = body.url;
                        } else {
                            nextUrl = $page.url.pathname;
                        }
                        await invalidateAll();
                        for (let fn of persistFns) {
                            fn();
                        }
                        showInfo(infoText);
                    }
                }
            } catch (e) {
                console.log(e);
                showError("Couldn't call save function");
            }
        }
    }

    function deleteRow() {
        (document.querySelector('#confirmDelete1') as HTMLDialogElement)?.showModal(); 
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
                body: JSON.stringify({_pk: pk}),
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
    <slot />
    <div class="">
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

</div>

<!-- Modal to confirm discarding changes -->
<CombiTableDiscardChanges id="confirmEditDiscard1" okFn={confirmCancelEdit}/> 

<!-- Modal to display validation errors -->
<CombiTableValidateDialog id="validateDialog1" errors={validationErrors}/>


<!-- Modal to display information after executing a function -->
<CombiTableInfoDialog id="infoDialog1" info={opInfo}/>

<!-- Modal to display delete confirmation -->
<CombiTableConfirmDeleteDialog id="confirmDelete1" okFn={confirmDeleteRow}/>