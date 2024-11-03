<script lang="ts">
    // Copyright (c) 2024 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file
    export let id : string;
    export let info : string
</script>
    
    
<dialog id={id} class="modal">
    <div class="modal-box">
        <p class="py-4">{info}</p>
        <div class="modal-action">
            <form method="dialog">
                <!-- if there is a button in form, it will close the modal -->
                <button class="btn btn-neutral">OK</button>&nbsp;
            </form>
        </div>
    </div>
</dialog>
