<script lang="ts">
    // Copyright (c) 2025 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file
    import { goto, invalidate } from '$app/navigation'
    export let data;
    import CombiTable from '$lib/components/CombiTable.svelte';
    import type { CombiTableColumn } from '$lib/combitabletypes';
    import { SearchUrl } from '$lib/searchurl';
    import { page } from '$app/stores';

    // this is passed to CombiTable and defines the columns in the table, their
    // order, appearance, how to format/parse their value whether to make them clickable
    let columns : CombiTableColumn[] = [
        {name: "Name", col: "name", type: "string", link: (row) => {return detailsLink("/god/" + row.id)}},
        {name: "Gender", col: "gender", type: "select:string", values: ["m", "f"], names: ["m", "f"], minWidth: "[4rem]"},
        {name: "Died", col: "died", type: "boolean"},
        {name: "Type", col: "type", type: "select:integer", values: [0,1,2], names: ["God", "Titan", "Personification"]},
        {name: "Father", col: "father.name", type: "string", nullable: true, maxWidth: "16", editMaxWidth: "16", autoCompleteLink:"/autocomplete/god/name"},
        {name: "Mother", col: "mother.name", type: "string", nullable: true, autoCompleteLink:"/autocomplete/god/name"},
        {name: "Birth Date", col: "birth_date", type: "partialdate", nullable: true},
    ]

    $: rows = data.gods;

    // back link using SearchUrl
    $: searchUrl = new SearchUrl($page.url);

    // New button saves this page as its back link
    $: newButtonSearchUrl = new SearchUrl(new URL("/god/new", $page.url), undefined, undefined, searchUrl);

    function detailsLink(url : string) {
        const backUrl = new SearchUrl($page.url);
        const newUrl = new SearchUrl(new URL(url, $page.url));
        newUrl.setBack(backUrl);
        if (!newUrl.url) return "";
        return newUrl.url.pathname + newUrl.url.search;
    }

    // This is to demonstrate operations, where you can create a button
    // to act on one or more selected rows.  This is optional
    async function killGods(pks : (string|number)[]) : Promise<{error? : string, info? : string}> {
        try {
            let ret = await fetch("/killgods", {
                method: "POST",
                body: JSON.stringify({pks})
            });
            if (!ret.ok) throw new Error("/killgods returned " + ret.status + " " + ret.statusText);
            const resp = await ret.json();
            if (!resp.error) return {info: resp.info};
            return {error: resp.error};
        } catch (e) {
            console.log(e);
            return {error: typeof(e) == "object" && e && "message" in e ? e.message as string : "Unknown error"}
        }
    }
</script>

<svelte:head>
    <title>Greek Gods</title>
</svelte:head>

<h2 class="ml-4">Greek Gods</h2>

<!--
    Creates a table.  See the documentation for CombiTable for details
-->
<CombiTable 
    rows={rows} 
    columns={columns} 
    primaryKey="id"
    dateFormat="dd-mm-yyyy"
    defaultSort="name" 
    enableSort={true}
    enableFilter={true}
    editUrl={"edit"}
    addUrl={"add"}
    deleteUrl={"delete" }
    paginate={5}
    havePrevious={data.havePrevious}
    haveNext={data.haveNext}    
    widthType={"auto"}
    ops={[{label: "Kill", fn: killGods}]}
    urlSuffix=""
    navExtra={[{label: "New", fn: async () => {if (newButtonSearchUrl.url) goto(newButtonSearchUrl.url.href)}}]}
/>


<!-- this link is to demonstate pre-filters and select functionality -->
<p class="mt-4">
    <a href="/olympicgods" class="ml-4">Olympic Gods</a>
</p>

