/**
 * =============================================================================
 * cURL Generator Utility
 * =============================================================================
 * Converts Axios request config to a cURL command string for debugging.
 * =============================================================================
 */

import { AxiosRequestConfig } from 'axios';

export const generateCurlCommand = (config: AxiosRequestConfig): string => {
    const method = (config.method || 'GET').toUpperCase();
    const url = config.baseURL
        ? (config.baseURL.endsWith('/') && config.url?.startsWith('/')
            ? config.baseURL + config.url?.substring(1)
            : (config.baseURL.endsWith('/') || config.url?.startsWith('/')
                ? config.baseURL + (config.url || '')
                : config.baseURL + '/' + (config.url || '')))
        : config.url;

    let curl = `curl -X ${method} '${url}'`;

    // Headers
    if (config.headers) {
        Object.entries(config.headers).forEach(([key, value]) => {
            // Skip common headers that might be undefined or handled automatically if not explicit
            if (value !== undefined && key.toLowerCase() !== 'content-length') {
                curl += ` \\\n  -H '${key}: ${value}'`;
            }
        });
    }

    // Body
    if (config.data) {
        // If it's FormData, we can't easily stringify it for cURL without getting complex
        // But we can approximate or show a placeholder
        // For JSON and Strings:
        if (typeof config.data === 'string') {
            curl += ` \\\n  -d '${config.data}'`;
        } else if (config.data instanceof URLSearchParams) {
            curl += ` \\\n  -d '${config.data.toString()}'`;
        } else if (
            // specific check for FormData (node or browser)
            (typeof FormData !== 'undefined' && config.data instanceof FormData) ||
            (config.data.constructor && config.data.constructor.name === 'FormData')
        ) {
            curl += ` \\\n  --data-binary '[FormData]'`; // Placeholder as exact FormData representation is hard
        } else {
            try {
                curl += ` \\\n  -d '${JSON.stringify(config.data)}'`;
            } catch (e) {
                curl += ` \\\n  -d '[Complex Data]'`;
            }
        }
    }

    return curl;
};
