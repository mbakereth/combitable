<script lang="ts">
    type Props = {

    }

    let {
    } : Props = $props();

    import { getContext } from 'svelte';
    import DetailsFieldSet from './DetailsFieldSet.svelte';
    import { updated } from '$app/state';

    let df = getContext<{
        addUrl : string|undefined,
        newUrl : string|undefined,
        editUrl : string|undefined,
        deleteUrl : string|undefined,
        updateDisabled : boolean|undefined,
        isAdd : boolean,
        internalDirty: boolean,
        cancelAwaysActive: boolean,
        saveEdit : (confirm: {col: string, title: string, value: string, type: string}[]) => Promise<void>,
        cancelEdit: () => Promise<void>,
        newEntry : (url : string) => Promise<void>,
        deleteRow : () => Promise<void>,
        extraButton : (button: {label: string, action: () => undefined}) => Promise<void>,
        extraButtons : {label: string, action: () => undefined}[],
        Save: string,
        Delete : string,
        Cancel: string,
        New: string,
        register: () => void,
    }>("detailsfieldset_buttons");
    df.register();

</script>

{#if (df.addUrl && df.newUrl) || df.editUrl || df.deleteUrl}
    <div class="m-4 mt-8 mb-0">
        {#if df.addUrl || df.editUrl }
            <button class="btn btn-success mt-0 mb-0" disabled={df.updateDisabled || !df.internalDirty} onclick={() => df.saveEdit([])}>{df.Save}</button>

            <button class="btn btn-default mt-0 mb-0 ml-2" disabled={!df.cancelAwaysActive && (df.updateDisabled || (!df.internalDirty && !df.isAdd))} onclick={() => df.cancelEdit()}>{df.Cancel}</button>
        {/if}               

        {#if df.addUrl && df.newUrl }
        <button class="btn btn-primary mt-0 mb-0 ml-2" disabled={df.updateDisabled || df.internalDirty || df.isAdd} onclick={async () => {if (df.newUrl) await df.newEntry(df.newUrl);}}>{df.New}</button>
        {/if}   

        {#if df.deleteUrl }
        <button class="btn btn-error mt-0 mb-0 ml-2" disabled={df.updateDisabled || df.internalDirty} onclick={() => df.deleteRow()}>{df.Delete}</button>
        {/if}    

        {#each df.extraButtons as button}
        <button class="btn mt-0 mb-0 ml-2" onclick={(ev) => df.extraButton(button)}>{button.label}</button>
        {/each}          

    </div>    
{/if}                 
