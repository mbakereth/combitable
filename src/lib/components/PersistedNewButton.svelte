<script lang="ts">
    import { goto, invalidateAll } from '$app/navigation';
    import DetailsFieldSet from './DetailsFieldSet.svelte';
    import type { CombiTableColumn } from '$lib/combitabletypes';
    import CombiTableValidateDialog from '$lib/components/CombiTableErrorDialog.svelte';
    import CombiTableDiscardChanges from '$lib/components/CombiTableDiscardChanges.svelte';
    import { validateField } from '$lib/utils';
    import CombiTableInfoDialog from '$lib/components/CombiTableInfoDialog.svelte';
    import CombiTableConfirmDeleteDialog from '$lib/components/CombiTableConfirmDeleteDialog.svelte';
    import { page } from '$app/stores';
    import { getContext } from 'svelte';
    import { SvelteSet, SvelteMap } from 'svelte/reactivity';
    import { PersistedFields } from '$lib/persistedfields';
    import CombiTable from './CombiTable.svelte';
    import { browser } from '$app/environment';

    const { newItemWithPersistanceLink } = getContext<DetailsFieldSet>('detailsfieldset');

    export let url : () => URL;

</script>

<button class="btn btn-default" on:click={async () => {goto(await newItemWithPersistanceLink(url()))}}>
    <slot/>
</button>
