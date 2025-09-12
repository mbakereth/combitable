<!-- 
This page demonstrate pre-filtering and linking/unlinking

Linking sets a foreign key without creating the related object.  Unlinking
clears it
-->
<script lang="ts">
    // Copyright (c) 2024 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file
    import { goto, invalidate } from '$app/navigation'
    export let data;
    import CombiTable from '$lib/components/CombiTable.svelte';
    import type { CombiTableColumn } from '$lib/combitabletypes';

    let columns : CombiTableColumn[] = [
        {name: "Name", col: "name", type: "string"},
        {name: "Gender", col: "gender", type: "select:string", values: ["m", "f"], names: ["m", "f"], minWidth: "[4rem]"},
        {name: "Died", col: "died", type: "boolean"},
        {name: "Type", col: "type", type: "select:integer", values: [0,1,2], names: ["God", "Titan", "Personification"]},
        {name: "Father", col: "father.name", type: "string", nullable: true, maxWidth: "16", editMaxWidth: "16"},
        {name: "Mother", col: "mother.name", type: "string", nullable: true},
    ]

    $: rows = data.gods;

</script>

<svelte:head>
    <title>Olympic Gods</title>
</svelte:head>

<h2 class="ml-4">Olympic Gods</h2>

<!-- See CombiTable documentation for details -->
<CombiTable 
    rows={rows} 
    columns={columns} 
    primaryKey="name"
    defaultSort="name" 
    enableSort={true}
    enableFilter={true}
    editUrl={"edit"}
    addUrl={"add"}
    linkUrl={"olympicgods/link"}
    unlinkUrl={"olympicgods/unlink"}
    deleteUrl={"delete" }
    paginate={5}
    havePrevious={data.havePrevious}
    haveNext={data.haveNext}
    widthType={"fixed"}
/>

<p class="mt-4 ml-4">
    <a href="/">All Gods</a>
</p>
