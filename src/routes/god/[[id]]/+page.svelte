<script lang="ts">
    import { onMount } from 'svelte';
    export let data;
    import DetailsField from '$lib/components/DetailsField.svelte';
    import type { CombiTableColumn } from '$lib/combitabletypes';
    import DetailsFieldSet from '$lib/components/DetailsFieldSet.svelte';

    let columns : CombiTableColumn[] = [
        {name: "Name", col: "name", type: "string"},
        {name: "Gender", col: "gender", type: "select:string", values: ["m", "f"], names: ["m", "f"], minWidth: "[4rem]"},
        {name: "Died", col: "died", type: "boolean"},
        {name: "Type", col: "type", type: "select:integer", values: [0,1,2], names: ["God", "Titan", "Personification"]},
        {name: "Father", col: "father.name", type: "string", nullable: true, maxWidth: "16", editMaxWidth: "16", autoCompleteLink:"/autocomplete/god/name"},
        {name: "Mother", col: "mother.name", type: "string", nullable: true, autoCompleteLink:"/autocomplete/god/name"},
    ]

    let rec : {[key:string]:any} = data.rec ?? {}
    $: isAdd = data.rec === undefined

    $: fieldData = [rec?.name, rec?.gender, rec?.died, rec?.type, rec?.father?.name, rec?.mother?.name];

</script>

<svelte:head>
    <title>{fieldData[0] ?? "New god"}</title>
</svelte:head>

{#if data.rec}
    <h2 class="ml-4">{data.rec?.name ?? '<span class="italic">New god</span>'}</h2>
{:else}
    <h2 class="ml-4"><span class="italic">New god</span></h2>
{/if}

{#if data.error}
    <p>An error occurred: {data.error ?? "Unknown error"}</p>
{:else}


    <div class="m-4 overflow-y-auto">
        <table class="table overflow-y-visible table-sm">
            <tbody>
                <tr class="border-none">
                    <td class="w-32">Name</td>
                    <td>
                        <DetailsField
                            col={columns[0]}
                            bind:value={fieldData[0]}
                        />
                    </td>
                </tr>

                <tr class="border-none">
                    <td class="w-32">Gender</td>
                    <td>
                        <DetailsField
                            col={columns[1]}
                            bind:value={fieldData[1]}
                        />
                    </td>
                </tr>

                <tr class="border-none">
                    <td class="w-32">Died</td>
                    <td>
                        <DetailsField
                            col={columns[2]}
                            bind:value={fieldData[2]}
                        />
                    </td>
                </tr>

                <tr class="border-none">
                    <td class="w-32">Type</td>
                    <td>
                        <DetailsField
                            col={columns[3]}
                            bind:value={fieldData[3]}
                        />
                    </td>
                </tr>

                <tr class="border-none">
                    <td class="w-32">Father</td>
                    <td>
                        <DetailsField
                            col={columns[4]}
                            bind:value={fieldData[4]}
                        />
                    </td>
                </tr>

                <tr class="border-none">
                    <td class="w-32">Mother</td>
                    <td>
                        <DetailsField
                            col={columns[5]}
                            bind:value={fieldData[5]}
                        />
                    </td>
                </tr>
            </tbody>
        </table>       
    </div>

    <DetailsFieldSet
        bind:rec={rec}
        bind:isAdd={isAdd}
        pk="name"
        addUrl="/add"
        editUrl="/edit"
        deleteUrl="/delete"
        deleteNextPage="/"
        bind:data={fieldData}
        bind:cols={columns}
    />

{/if}

<p class="m-4"><a href="/">Home</a></p>