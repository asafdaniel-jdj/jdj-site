import { purgeCache } from '@netlify/functions';

const RECOMMENDED_TAGS = ['recommended'];

export default async (request) => {
  let nextRun = null;
  try {
    const body = await request.json().catch(() => ({}));
    nextRun = body?.next_run || null;

    await purgeCache({ tags: RECOMMENDED_TAGS });

    console.info('JDJ scheduled recommended cache purge completed', {
      tags: RECOMMENDED_TAGS,
      purgedAt: new Date().toISOString(),
      nextRun
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('JDJ scheduled recommended cache purge failed', {
      message: error instanceof Error ? error.message : String(error),
      nextRun
    });
    return new Response(null, { status: 500 });
  }
};

// Supabase rotates recommendations at 00:00 UTC. Purge one minute later to
// avoid a race between the DB update and Netlify cache invalidation.
export const config = {
  schedule: '1 0 * * *'
};
