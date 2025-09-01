<script lang="ts">
    // Copyright (c) 2024 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file
    import { goto, invalidate } from '$app/navigation'
    export let data;
    import CombiTable from '$lib/components/CombiTable.svelte';
    import type { CombiTableColumn } from '$lib/combitabletypes';

    let columns : CombiTableColumn[] = [
        {name: "Name", col: "name", type: "string", link: (row) => {return "/god/" + row.id}},
        {name: "Gender", col: "gender", type: "select:string", values: ["m", "f"], names: ["m", "f"], minWidth: "[4rem]"},
        {name: "Died", col: "died", type: "boolean"},
        {name: "Type", col: "type", type: "select:integer", values: [0,1,2], names: ["God", "Titan", "Personification"]},
        {name: "Father", col: "father.name", type: "string", nullable: true, maxWidth: "16", editMaxWidth: "16", autoCompleteLink:"/autocomplete/god/name"},
        {name: "Mother", col: "mother.name", type: "string", nullable: true, autoCompleteLink:"/autocomplete/god/name"},
    ]

    $: rows = data.gods;

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

    $: primaryKeysChecked = [];
    let table : CombiTable;

</script>

<svelte:head>
    <title>Greek Gods</title>
</svelte:head>

<h2 class="ml-4">Greek Gods</h2>

<CombiTable 
    rows={rows} 
    columns={columns} 
    primaryKey="name"
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
    navExtra={[{label: "New", fn: async () => {goto("/god/")}}]}
    bind:primaryKeysChecked={primaryKeysChecked}
    link={(row) => {return "/god/" + row.id}}
/>

<p class="mt-4"><a href="/olympicgods" class="ml-4">Olympic Gods</a></p>

<div class="hidden min-w-16 max-w-16"></div>
<div class="hidden min-w-[4rem]"></div>
