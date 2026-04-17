"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

export function useQueryTabs(defaultValue: string, queryParam: string = "tab") {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const activeTab = searchParams.get(queryParam) || defaultValue;

    const setActiveTab = useCallback(
        (value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value === defaultValue) {
                params.delete(queryParam);
            } else {
                params.set(queryParam, value);
            }

            router.push(`${pathname}?${params.toString()}`, { scroll: false });
        },
        [router, pathname, searchParams, queryParam, defaultValue]
    );

    return [activeTab, setActiveTab] as const;
}
