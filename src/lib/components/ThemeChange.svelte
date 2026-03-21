<script lang="ts">
    import { goto, invalidateAll } from "$app/navigation";
    import moonIcon from "$lib/assets/ph--moon-stars.svg?raw"
    import sunIcon from "$lib/assets/ph--sun-dim.svg?raw"
    let error = "";
    export let isLightMode : boolean = false;


    async function setTheme() {
        document.querySelector('html')?.setAttribute('data-theme', !isLightMode ? "light" : "dark");
    }

</script>

{@html moonIcon} <input type="checkbox"  class="toggle ml-1 mr-1" on:click={setTheme} bind:checked={isLightMode}/> {@html sunIcon}

