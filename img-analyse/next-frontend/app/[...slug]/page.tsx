import { redirect, notFound } from 'next/navigation';

export default async function CatchAllRedirect({ params }: { params: Promise<{ slug: string[] }> }) {
    const { slug } = await params;

    // We are looking for a pattern like: /[photographerSlug]/[eventSlug]/...
    // Minimally 2 segments: photographer and event.
    // If the user visits /bhagat_singh_1p6bz/dfhfg, slug is ['bhagat_singh_1p6bz', 'dfhfg']

    if (slug.length >= 2) {
        const photographerSlug = slug[0];
        const eventSlug = slug[1];
        const rest = slug.slice(2);

        // Construct the new path
        const newPath = `/p/${photographerSlug}/e/${eventSlug}${rest.length > 0 ? '/' + rest.join('/') : ''}`;

        // Redirect cleanly
        redirect(newPath);
    }

    // If it's a single segment or doesn't look like an event path, we verify if it's a valid persistent route or 404.
    // Since this catch-all captures everything not defined in `app/`, single segments (like `favicon.ico` or random pages) will end up here.
    // We should just 404 them if they are not matching the event pattern.
    // NOTE: This might hide other 404s, but that is the nature of catch-all.

    notFound();
}
