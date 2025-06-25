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
    $: fieldData = [rec?.name, rec?.gender, rec?.died, rec?.type, rec?.father?.name, rec?.mother?.name];

    let nameField : DetailsField;
    let genderField : DetailsField;
    let diedField : DetailsField;
    let typeField : DetailsField;
    let motherField : DetailsField;
    let fatherField : DetailsField;
</script>

<svelte:window bind:innerWidth bind:innerHeight />

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
        <table bind:this={table}  class="table overflow-y-visible table-sm">
            <tbody>
                <tr class="border-none">
                    <td class="w-32">Name</td>
                    <td>
                        <DetailsField
                            bind:this={nameField}
                            col={columns[0]}
                            bind:value={fieldData[0]}
                        />
                    </td>
                </tr>

                <tr class="border-none">
                    <td class="w-32">Gender</td>
                    <td>
                        <DetailsField
                            bind:this={genderField}
                            col={columns[1]}
                            bind:value={fieldData[1]}
                        />
                    </td>
                </tr>

                <tr class="border-none">
                    <td class="w-32">Died</td>
                    <td>
                        <DetailsField
                            bind:this={diedField}
                            col={columns[2]}
                            bind:value={fieldData[2]}
                        />
                    </td>
                </tr>

                <tr class="border-none">
                    <td class="w-32">Type</td>
                    <td>
                        <DetailsField
                            bind:this={typeField}
                            col={columns[3]}
                            bind:value={fieldData[3]}
                        />
                    </td>
                </tr>

                <tr class="border-none">
                    <td class="w-32">Father</td>
                    <td>
                        <DetailsField
                            bind:this={fatherField}
                            col={columns[4]}
                            bind:value={fieldData[4]}
                        />
                    </td>
                </tr>

                <tr class="border-none">
                    <td class="w-32">Mother</td>
                    <td>
                        <DetailsField
                            bind:this={motherField}
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