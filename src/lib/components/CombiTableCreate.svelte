<!--
    @component Dialog to confirm diascard changes
    
    You shouldn't need this directly.
-->
<script lang="ts">
    // Copyright (c) 2024 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file
    export let okFn : () => void;
    export let id : string;
    export let title = "Do you want to discard changes?"
</script>


<dialog id={id} class="modal">
    <div class="modal-box">
        <p class="py-4">{title}</p>
        <div class="modal-action">
            <form method="dialog">
                <!-- if there is a button in form, it will close the modal -->
                <button class="btn btn-primary" on:click={() => okFn()}>OK</button>&nbsp;
                <button class="btn btn-neutral pl-4">Cancel</button>
            </form>
        </div>
    </div>
</dialog>
