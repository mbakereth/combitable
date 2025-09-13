<script lang="ts">
    export let data;
    import DetailsField from '$lib/components/DetailsField.svelte';
    import type { CombiTableColumn } from '$lib/combitabletypes';
    import DetailsFieldSet from '$lib/components/DetailsFieldSet.svelte';
    import PersistedNewButton from '$lib/components/PersistedNewButton.svelte';
    import { SearchUrl } from '$lib';
    import { page } from '$app/stores';

    let columns : CombiTableColumn[] = [
        {name: "Name", col: "name", type: "string"},
        {name: "Gender", col: "gender", type: "select:string", values: ["m", "f"], names: ["m", "f"], minWidth: "[4rem]"},
        {name: "Died", col: "died", type: "boolean"},
        {name: "Type", col: "type", type: "select:integer", values: [0,1,2], names: ["God", "Titan", "Personification"]},
        {name: "Father", col: "father.name", type: "string", nullable: true, maxWidth: "16", editMaxWidth: "16", autoCompleteLink:"/autocomplete/god/name"},
        {name: "Mother", col: "mother.name", type: "string", nullable: true, maxWidth: "16", editMaxWidth: "16", autoCompleteLink:"/autocomplete/god/name"},
        {name: "Children", col: "children", type: "array:string", nullable: true, maxWidth: "16", editMaxWidth: "16", autoCompleteLink:"/autocomplete/god/name"},
    ]
   //let columns = data.columns;

    $: rec = data.rec;
    $: isAdd = data.isAdd ?? false;

    // Elements in array fields must be primative values, not objects
    $: children = data.rec?.children ?? []
    $: fieldData = [rec?.name, rec?.gender, rec?.died, rec?.type, rec?.father?.name, rec?.mother?.name, rec?.children];

    // back link using SearchUrl
    $: searchUrl = new SearchUrl($page.url);
    $: backUrl = searchUrl.popBack();
    $: backHref = backUrl ? backUrl?.url?.pathname :  null;
    if (backHref && backUrl?.url?.search) backHref += "?" + backUrl?.url?.search;

    function chainedNewGodUrl() {
        const backUrl = new SearchUrl($page.url);
        const newUrl = new SearchUrl(new URL("/god/new", $page.url));
        newUrl.setBack(backUrl);
        if (!newUrl.url) return $page.url;
        return newUrl.url;
    }

    function urlAftetSave(rec : {[key:string]:any}) : string {
        return "/god/" + rec.id;
    }

</script>

<svelte:head><title>{isAdd? "New God" : data.rec?.name}</title>
</svelte:head>

{#if isAdd}
    <h2 class="ml-4">New god</h2>
{:else}
    <h2 class="ml-4">{data.rec?.name}</h2>
{/if}

{#if data.error}
    <p>An error occurred: {data.error ?? "Unknown error"}</p>
{:else}

    <DetailsFieldSet
        bind:isAdd={isAdd}
        pk={data.rec?.id}
        addUrl="/add"
        newUrl="/god/new"
        editUrl="/edit"
        deleteUrl="/delete"
        deleteNextPage="/"
        saveNextPage={urlAftetSave}
        persistance={true} 
    >

    <!-- persistance is only needed if persisting usaved data (see above) -->

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
                            <!-- <button class="btn btn-default" on:click={async () => {goto(await newGodLink())}}>New...</button>-->
                            <PersistedNewButton url={chainedNewGodUrl}>New...</PersistedNewButton>
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

                    <tr class="border-none">
                        <td class="w-32">Children</td>
                        <td>
                            <DetailsField
                                col={columns[6]}
                                bind:value={children}
                            />
                        </td>
                    </tr>
                </tbody>
            </table>       
        </div>

    </DetailsFieldSet>

{/if}

<p class="m-4">
    <a href="/">Home</a>
    {#if backHref }
    <a href="{backHref}">Back</a>
    {/if}
</p>