/**
 * Sanitizes a string into a URL-friendly slug.
 * Used for consistent naming of Qdrant collections.
 * 
 * @param text - The text to sanitize
 * @returns The sanitized slug
 */
export function sanitizeSlug(text: string | null | undefined): string {
    if (!text) return '';

    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '_');        // Replace multiple - with single -
}
