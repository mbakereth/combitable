<script lang="ts">
    // Copyright (c) 2024 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file
    export let id : string;
    export let errors : string[]|string|undefined;
</script>
    
    
<dialog id={id} class="modal">
    <div class="modal-box">
        <div class="p-2 bg-error text-error-content rounded"><b>Error</b></div>
        {#if !errors}
            <p>An unknown error occurrerd</p>
        {:else if Array.isArray(errors)}
            <p class="py-4"><b>Please correct the following:</b></p>
            <ul>
              {#each errors as e}
                  <li class="list-disc ml-4">{e}</li>
              {/each}
            </ul>
        {:else}
            <p>{errors}</p>
        {/if}
        <div class="modal-action">
            <form method="dialog">
                <!-- if there is a button in form, it will close the modal -->
                <button class="btn btn-neutral">OK</button>&nbsp;
            </form>
        </div>
    </div>
</dialog>
    