import { json, type RequestEvent } from '@sveltejs/kit';
import { GodsOps } from '$lib/server/gods';
export const POST = async (event : RequestEvent) => GodsOps.editPost(event);

