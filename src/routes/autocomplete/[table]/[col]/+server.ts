import { type RequestEvent } from '@sveltejs/kit';
import { autocomplete } from '$lib/utils'

export const GET = async (event : RequestEvent) => autocomplete(event, {god: ["**"]});
