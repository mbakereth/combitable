<!-- 
    @component Groups a set of {@link DetailsField}s with add, delete, edit
        functionality
-->
<script lang="ts">
    type Props = {

        /** 
         * The primary key value for this row. Only needed for delete, edit, add 
         */
        pk? : string|number;

        /**
         * URL to call to save edits to existing row.
         * 
         * If not given, editing is not activated
         */
        editUrl? : string;

        /**
         * URL to call to save a new row.
         * 
         * If not given, adding rows is not activated
         */
        addUrl? : string;

        /**
         * URL to call to start adding a new row (without an existing row loaded).
         * {@link SearchUrl} is used to add a back link to this.
         * 
         * If not given, adding rows is not activated
         */
        newUrl? : string;

        /**
         * URL to call to delete a row.
         * 
         * If not given, deleting rows is not activated
         */
        deleteUrl? : string;

        /**
         * Page to go to after deleting this row.  Default `/`
         */
        deleteNextPage? : string;

        /**
         * Bind to a variable to tell this component if it is adding an new
         * row rather than editing an existing one
         */
        isAdd? : boolean;    

        /**
         * Page to go to after saving a page.  Default current page.
         */
        saveNextPage? : ((rec : {[key:string]:any}) => string);
        persistance? : boolean;
        data? : any[]|undefined;

    }

    import { goto, invalidateAll } from '$app/navigation';
    import type { CombiTableColumn, CombiTablePresets } from '$lib/combitabletypes';
    import CombiTableValidateDialog from '$lib/components/CombiTableErrorDialog.svelte';
    import CombiTableDiscardChanges from '$lib/components/CombiTableDiscardChanges.svelte';
    import { validateField } from '$lib/utils';
    import CombiTableInfoDialog from '$lib/components/CombiTableInfoDialog.svelte';
    import CombiTableConfirmDeleteDialog from '$lib/components/CombiTableConfirmDeleteDialog.svelte';
    import { page } from '$app/stores';
    import { setContext } from 'svelte';
    import { SvelteSet, SvelteMap } from 'svelte/reactivity';
    import { PersistedFields } from '$lib/persistedfields';
    import CombiTable from './CombiTable.svelte';
    import { browser } from '$app/environment';
    import { SearchUrl } from '$lib/searchurl';

    export let pk : string|number|undefined = undefined;
    export let editUrl : string|undefined = undefined;
    export let addUrl : string|undefined = undefined;
    export let newUrl : string|undefined = undefined;
    export let deleteUrl : string|undefined = undefined;
    export let deleteNextPage : string|undefined = undefined;
    export let isAdd = false;    
    export let saveNextPage : ((rec : {[key:string]:any}) => string)|undefined = undefined;
    export let persistance : boolean = false;
    export let data : any[]|undefined = undefined;

    let uuid = crypto.randomUUID();

    $: persist = browser ? new PersistedFields($page.url, columns) : undefined;

    setContext("detailsfieldset", { registerGetAndSetValue, registerGetFieldError, registerIsDirty, updateDirty, registerResetValue, registerPersist, newItemWithPersistanceLink });

    let getValueFns = new SvelteSet<() => {value: any, col: CombiTableColumn}>();
    let setValueFns = new SvelteMap<string,(value: any) => void>();
    let setOriginalValueFns = new SvelteMap<string,(value: any) => void>();
    let columns : CombiTableColumn[] = []
    function registerGetAndSetValue(getFn: () => {value: any, col: CombiTableColumn}, setFn: (value: any) => void, setOriginalFn: (value: any) => void) {
        getValueFns.add(getFn);
        let col = getFn().col;
        columns.push(col);
        setValueFns.set(col.col, setFn)
        setOriginalValueFns.set(col.col, setOriginalFn)
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
    export function updateDirty() {
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
        (document.querySelector('#validateDialog1_'+uuid) as HTMLDialogElement)?.showModal(); 
    }
    export function showInfo(info : string) {
        opInfo = info;
        (document.querySelector('#infoDialog1_'+uuid) as HTMLDialogElement)?.showModal(); 
    }
    export function showInfoThenLoad(info : string) {
        opInfo = info;
        (document.querySelector('#infoDialog2_'+uuid) as HTMLDialogElement)?.showModal(); 
    }

    async function cancelEdit() {
        if (isAdd) {
            (document.querySelector('#confirmEditDiscard1_'+uuid) as HTMLDialogElement)?.showModal(); 
        } else if (!dirty) {
            confirmCancelEdit();
        } else {
            (document.querySelector('#confirmEditDiscard1_'+uuid) as HTMLDialogElement)?.showModal(); 
        }
    }

    async function confirmCancelEdit() {
        if (isAdd) {
            let prev = $page.url.searchParams.get("prev") ?? cancelUrl();
            if (persistance && persist) {
                persist.delete();
            }
            if (prev) {
                await invalidateAll();
                goto(prev).then(() => {

                });
            }
        } else {
            if (persistance && persist) {
                persist.delete();
            }
            for (let fn of resetValueFns) {
                fn();
            }
        }

    }

    function nextPageUrl(rec : {[key:string]:any}) {
        let url = new SearchUrl($page.url);
        let backUrl = url.popBack();
        let current = $page.url.href;
        let currentUrl = $page.url;
        if ($page.url.searchParams.get("edt") == "1") 
            return backUrl?.url?.href ?? $page.url.href
        //if (isAdd) {
            if (saveNextPage) {
                let page = saveNextPage(rec) ?? current;
                let newUrl = new SearchUrl(new URL(page, currentUrl));
                if (!(newUrl.url?.searchParams.get("b")) && backUrl) {
                    newUrl.setBack(backUrl);
                }
                return newUrl.url?.href ?? current;
            } else {
                return current;
            }

        //}
        return $page.url.href;

    }

    function cancelUrl() {
        let url = new SearchUrl($page.url);
        let backUrl = url.popBack();
        if ($page.url.searchParams.get("edt") == "1") 
            return backUrl?.url?.href ?? $page.url.href
        return backUrl?.url?.href ?? $page.url.href;

    }

    async function pageOnSave() {
        //if (isAdd) 
        {
            let prev = urlToLoad;
            if (persistance && persist) {
                persist.delete();
            }
            if (prev) {
                await invalidateAll();
                goto(prev);
            }
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

    let urlToLoad = "";
    async function saveEdit() {
        validationErrors = validate();
        if (validationErrors.length > 0) {
            (document.querySelector('#validateDialog1_'+uuid) as HTMLDialogElement)?.showModal(); 
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
            if (!isAdd && !pk) {
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
                            urlToLoad = body.url;
                        } else {
                            //urlToLoad = saveNextPage ? saveNextPage(body.row) ?? $page.url.href : $page.url.href;
                            urlToLoad = nextPageUrl(body.row);
                        }
                        for (let fn of persistFns) {
                            fn();
                        }
                        showInfoThenLoad(infoText);
                    }
                }
            } catch (e) {
                console.log(e);
                showError("Couldn't call save function");
            }
        }
    }

    function deleteRow() {
        (document.querySelector('#confirmDelete1_'+uuid) as HTMLDialogElement)?.showModal(); 
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
                    await invalidateAll();
                    if (deleteNextPage) goto(deleteNextPage)
                    else {
                        let url = new SearchUrl($page.url);
                        let back = url.popBack();
                        goto(back?.url?.href ?? "/");
                    }
                }
            }
    }

    async function newEntry(url : string) {
        const backUrl = new SearchUrl($page.url);
        const newUrl = new SearchUrl(new URL(url, $page.url));
        newUrl.setBack(backUrl);
        goto(newUrl?.url?.href ?? $page.url);
        //await invalidateAll(); 
        //goto(url)
    }

    /////
    // Persistance

    async function newItemWithPersistanceLink(url : URL) {
        if (!data) {
            console.log("Cannot persist as data not passed to DetailsFieldSet");
            return;
        }
        let persist = new PersistedFields($page.url, columns);
        persist.save(data);
        await invalidateAll(); 
        url.searchParams.set("edt","1")
        return url.pathname + url.search;
    }

    page.subscribe((value) => {
        if (persistance) {
            let persist = new PersistedFields(value.url, columns);
            if ( persist.has()) {
                //persist.restore(fieldData);
                let fields = persist.getAsMap();
                if (fields) {
                    for (let col in fields) {
                        let val = fields[col]
                        let fn = setValueFns.get(col)
                        if (fn) {
                            fn(val);
                        }
                    }
                }
            } else if (isAdd) {
                getValueFns.forEach((fn) => {
                    let field = fn();
                    let setter = setOriginalValueFns.get(field.col.col)
                    if (setter) setter(field.value)
                })
            } else {                
                getValueFns.forEach((fn) => {
                    let field = fn();
                    let setter = setOriginalValueFns.get(field.col.col)
                    if (setter) setter(field.value)
                })
                updateDirty();
            }
        } else {
            if (isAdd) {
                getValueFns.forEach((fn) => {
                    let field = fn();
                    let setter = setOriginalValueFns.get(field.col.col)
                    if (setter) setter(field.value)
                })
            } else {                
                getValueFns.forEach((fn) => {
                    let field = fn();
                    let setter = setOriginalValueFns.get(field.col.col)
                    if (setter) setter(field.value)
                })
                updateDirty();
            }

        }
    });
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
<CombiTableDiscardChanges id={"confirmEditDiscard1_"+uuid} okFn={confirmCancelEdit}/> 

<!-- Modal to display validation errors -->
<CombiTableValidateDialog id={"validateDialog1_"+uuid} errors={validationErrors}/>


<!-- Modal to display information after executing a function -->
<CombiTableInfoDialog id={"infoDialog1_"+uuid} info={opInfo}/>
<CombiTableInfoDialog id={"infoDialog2_"+uuid} info={opInfo} okFn={pageOnSave}/>

<!-- Modal to display delete confirmation -->
<CombiTableConfirmDeleteDialog id={"confirmDelete1_"+uuid} okFn={confirmDeleteRow}/>