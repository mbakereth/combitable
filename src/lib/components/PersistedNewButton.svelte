<!-- 
    @component for making in-edit new item buttons

    Your user may be editing an item and want to create something it has
    a relation to.  When finished creating said relation, your user wants
    to go back to the previous edit, with their unsaved changes restored.$$render
    
    This component is a button to do that.
-->
<script lang="ts">
    type Props = {

        /**
         * Funtion to return the URL to go to when clicked
         */
        url: () => URL;
    }
    import { goto, invalidateAll } from '$app/navigation';
    import DetailsFieldSet from './DetailsFieldSet.svelte';
    import { getContext } from 'svelte';

    const { newItemWithPersistanceLink } = getContext<DetailsFieldSet>('detailsfieldset');

    export let url : () => URL;

</script>

<button class="btn btn-default" on:click={async () => {await newItemWithPersistanceLink(url())}}>
    <slot/>
</button>
