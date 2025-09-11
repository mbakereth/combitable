<script lang="ts">
    import { goto } from '$app/navigation';
    import DetailsFieldSet from './DetailsFieldSet.svelte';
    import { getContext } from 'svelte';

    const { newItemWithPersistanceLink } = getContext<DetailsFieldSet>('detailsfieldset');

    export let url : () => URL;

</script>

<button class="btn btn-default" on:click={async () => {goto(await newItemWithPersistanceLink(url()))}}>
    <slot/>
</button>
