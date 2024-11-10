// Copyright (c) 2024 Matthew Baker.  All rights reserved.  Licenced under the Apache Licence 2.0.  See LICENSE file

import { json, type RequestEvent } from '@sveltejs/kit';
import { GodsOps } from '$lib/server/gods';
export const POST = async (event : RequestEvent) => GodsOps.killGodsPost(event);

