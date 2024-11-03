<script lang="ts">
    // Copyright (c) 2024 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file
    export let okFn : () => void;
    export let id : string;
</script>
    
    
<dialog id={id} class="modal">
    <div class="modal-box">
        <div class="p-2 bg-warning text-warning-content rounded"><b>Warning</b></div>
            <p>Really delete row?</p>
            <div class="modal-action">
            <form method="dialog">
                <!-- if there is a button in form, it will close the modal -->
                <button class="btn btn-primary" on:click={() => okFn()}>OK</button>&nbsp;
                <button class="btn btn-neutral pl-4">Cancel</button>
            </form>
        </div>
    </div>
</dialog>
