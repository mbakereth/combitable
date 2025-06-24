<script lang="ts">
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    export let data;
    import DetailsField from '$lib/components/DetailsField.svelte';
    import { SearchUrl } from '$lib/searchurl';
    import type { CombiTableColumn } from '$lib/combitabletypes';
    import CombiTableValidateDialog from '$lib/components/CombiTableErrorDialog.svelte';
    import CombiTableDiscardChanges from '$lib/components/CombiTableDiscardChanges.svelte';
    import { autocomplete, stringIsDate, validateField, asBoolean, asBooleanOrUndefined, asNumber, asNumberOrUndefined, asString, printDate } from '$lib/utils';
    import CombiTableInfoDialog from '$lib/components/CombiTableInfoDialog.svelte';
    import CombiTableConfirmDeleteDialog from '$lib/components/CombiTableConfirmDeleteDialog.svelte';

    let columns : CombiTableColumn[] = [
        {name: "Name", col: "name", type: "string"},
        {name: "Gender", col: "gender", type: "select:string", values: ["m", "f"], names: ["m", "f"], minWidth: "[4rem]"},
        {name: "Died", col: "died", type: "boolean"},
        {name: "Type", col: "type", type: "select:integer", values: [0,1,2], names: ["God", "Titan", "Personification"]},
        {name: "Father", col: "father.name", type: "string", nullable: true, maxWidth: "16", editMaxWidth: "16", autoCompleteLink:"/autocomplete/god/name"},
        {name: "Mother", col: "mother.name", type: "string", nullable: true, autoCompleteLink:"/autocomplete/god/name"},
    ]

    let dirty = false;
    const restOfScreenHeight = 230;
    const buttonHeight = 78;
    let innerWidth = 0
    let innerHeight = 0
    $: maxTableHeight = restOfScreenHeight ? innerHeight - restOfScreenHeight - buttonHeight : undefined;
    $: maxTabHeight = restOfScreenHeight ? innerHeight - restOfScreenHeight : undefined;
    $: tabHeightStyle = maxTabHeight && innerWidth > 0 ? "display: block; height:" + maxTabHeight + "px" : "";
    $: tableHeightStyle = maxTableHeight && innerWidth > 0 ? "display: block; height:" + maxTableHeight + "px" : "";
    function resize() {
        maxTabHeight = restOfScreenHeight ? innerHeight - restOfScreenHeight : undefined;
        tabHeightStyle = maxTabHeight ? "display: block; height:" + maxTabHeight + "px;" : "";
        maxTableHeight = restOfScreenHeight ? innerHeight - restOfScreenHeight - buttonHeight  : undefined;
        tableHeightStyle = maxTableHeight ? "display: block; height:" + maxTableHeight + "px;" : "";
    }
    onMount(() => {
        resize();
		window.addEventListener('resize', resize);
		
		return () => {
			window.removeEventListener('resize', resize);
		}
    });


    let table : Element;
    $: name = data.rec?.name;
    $: gender = data.rec?.gender;
    $: died = data.rec?.died;
    $: type = data.rec?.type;
    $: father = data.rec?.father?.name;
    $: mother = data.rec?.mother?.name;
    $: dirty = false;
    $: {
        dirty = name != data.rec?.name ||
            gender != data.rec?.gender ||
            died != data.rec?.died ||
            type != data.rec?.type ||
            father != data.rec?.father?.name ||
            mother != data.rec?.mother?.name;   
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
        if (!dirty) {
            confirmCancelEdit();
        } else {
            (document.querySelector('#confirmEditDiscard') as HTMLDialogElement)?.showModal(); 
        }
    }
    

    function confirmCancelEdit() {
        name = data.rec?.name;
        gender = data.rec?.gender;
        died = data.rec?.died;
        type = data.rec?.type;
        father = data.rec?.father?.name;
        mother = data.rec?.mother?.name;

    }

    function validate() {
        let errors : string[] = [];
        let error : string|undefined = undefined;
        error = validateField(columns[0], name); if (error) errors.push(error);
        error = validateField(columns[1], gender); if (error) errors.push(error);
        error = validateField(columns[2], died); if (error) errors.push(error);
        error = validateField(columns[3], type); if (error) errors.push(error);
        error = validateField(columns[4], mother); if (error) errors.push(error);
        error = validateField(columns[5], father); if (error) errors.push(error);
        return errors;
    }

    async function saveEdit() {
        
        validationErrors = validate();
        if (validationErrors.length > 0) {
            (document.querySelector('#validateDialog') as HTMLDialogElement)?.showModal(); 
        } else {
            let url = "/edit";
            try {
                const resp = await fetch(url, {
                    method: "POST",
                    headers: {"content-type": "application/json"},
                    body: JSON.stringify({
                        _pk: data.rec?.name,
                        name,
                        gender,
                        type,
                        died,
                        "mother.name": mother,
                        "father.name": father,
                    }),
                });
                if (!resp.ok) {
                    showError("Error saving data");
                } else {
                    const body = await resp.json();
                    if (body.errors) {
                        showError(body.errors);
                    } else {
                        data.rec = body.row;
                        name = data.rec?.name;
                        gender = data.rec?.gender;
                        died = data.rec?.died;
                        type = data.rec?.type;
                        father = data.rec?.father?.name;
                        mother = data.rec?.mother?.name;
                        //cancelEdit();
                        dirty = false;
                        showInfo("Record saved");
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
        const deleteUrl = "/delete";
            const resp = await fetch(deleteUrl, {
                    method: "POST",
                    headers: {"content-type": "application/json"},
                    body: JSON.stringify({_pk: data.rec?.name}),
                });
                if (!resp.ok) {
                    showError("Error deleting row");
                } else {
                    const body = await resp.json();
                    if (body.error) {
                        showError("Error deleting row");
                    } else {
                        goto("/");
                    }
                }
        deleteIdx = -1;
    }

</script>

<svelte:window bind:innerWidth bind:innerHeight />

<svelte:head>
    <title>{data.rec?.name ?? "Unknown god"}</title>
</svelte:head>

<h2 class="ml-4">{data.rec?.name ?? "Unknown god"}</h2>

{#if data.error || !data.rec}
    <p>An error occurred: {data.error ?? "Unknown error"}</p>
{:else}


    <div class="m-4 overflow-y-auto">
        <table bind:this={table}  class="table overflow-y-visible table-sm">
            <tbody>
                <tr class="border-none">
                    <td class="w-32">Name</td>
                    <td>
                        <DetailsField
                            col={columns[0]}
                            rec={data.rec}
                            table={table}
                            bind:value={name}
                        />
                    </td>
                </tr>

                <tr class="border-none">
                    <td class="w-32">Gender</td>
                    <td>
                        <DetailsField
                            col={columns[1]}
                            rec={data.rec}
                            table={table}
                            bind:value={gender}
                        />
                    </td>
                </tr>

                <tr class="border-none">
                    <td class="w-32">Died</td>
                    <td>
                        <DetailsField
                            col={columns[2]}
                            rec={data.rec}
                            table={table}
                            bind:value={died}
                        />
                    </td>
                </tr>

                <tr class="border-none">
                    <td class="w-32">Type</td>
                    <td>
                        <DetailsField
                            col={columns[3]}
                            rec={data.rec}
                            table={table}
                            bind:value={type}
                        />
                    </td>
                </tr>

                <tr class="border-none">
                    <td class="w-32">Father</td>
                    <td>
                        <DetailsField
                            col={columns[4]}
                            rec={data.rec}
                            table={table}
                            bind:value={father}
                        />
                    </td>
                </tr>

                <tr class="border-none">
                    <td class="w-32">Mother</td>
                    <td>
                        <DetailsField
                            col={columns[5]}
                            rec={data.rec}
                            table={table}
                            bind:value={mother}
                        />
                    </td>
                </tr>
            </tbody>
        </table>       
    </div>

    <div class="m-4 mt-8 mb-0">
        <button class="btn btn-success mt-0 mb-0" disabled={!dirty} on:click={() => saveEdit()}>Save</button>
        <button class="btn btn-neutral mt-0 mb-0" disabled={!dirty} on:click={() => cancelEdit()}>Cancel</button>
        <button class="btn btn-error mt-0 mb-0" disabled={dirty} on:click={() => deleteRow()}>Delete</button>
        
    </div>                     

{/if}

<!-- Modal to display validation errors -->
<CombiTableValidateDialog id="validateDialog" errors={validationErrors}/>

<!-- Modal to confirm discarding edit -->
<CombiTableDiscardChanges id="confirmEditDiscard" okFn={confirmCancelEdit}/>

<!-- Modal to display information after executing a function -->
<CombiTableInfoDialog id="infoDialog" info={opInfo}/>

<!-- Modal to display delete confirmation -->
<CombiTableConfirmDeleteDialog id="confirmDelete" okFn={confirmDeleteRow}/>

<p class="m-4"><a href="/">Home</a></p>