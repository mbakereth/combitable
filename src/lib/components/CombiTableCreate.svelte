<!--
    @component Dialog to confirm diascard changes
    
    You shouldn't need this directly.
-->
<script lang="ts">
    // Copyright (c) 2024 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file
    export let okFn : (confirm: {col: string, title: string, value: string, type: string}[]) => void;
    export let id : string;
    export let createTitle = "Create the following records?"
    export let duplicateTitle = "The following already exist.  Create?"
    export let confirm : {col: string, title: string, value: string, type: string}[]
</script>


<dialog id={id} class="modal">
    <div class="modal-box">

        {#if confirm.filter((el) => el.type == "create").length > 0}
        <p class="py-4">{@html createTitle}</p>
        <ul>
            {#each confirm.filter((el) => el.type == "create") as c}
                <li class="list-disc ml-8">{c.title}: {c.value}</li>
            {/each}
        </ul>
        {/if}

        {#if confirm.filter((el) => el.type == "duplicate").length > 0}
        <p class="py-4">{@html duplicateTitle}</p>
        <ul>
            {#each confirm.filter((el) => el.type == "duplicate") as c}
                <li class="list-disc ml-8">{c.title}: {c.value}</li>
            {/each}
        </ul>
        {/if}

        <div class="modal-action">
            <form method="dialog">
                <!-- if there is a button in form, it will close the modal -->
                <button class="btn btn-primary" on:click={() => okFn(confirm)}>OK</button>&nbsp;
                <button class="btn btn-neutral pl-4">Cancel</button>
            </form>
        </div>
    </div>
</dialog>
