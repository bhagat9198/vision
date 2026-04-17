"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

// Use the custom useTheme from our provider if possible, but standard next-themes usage
// usually involves importing from "next-themes".
// However, looking at the existing codebase, there is a custom theme provider at:
// components/ui/theme-provider.tsx which exports `useTheme`.
// I should use THAT one to be consistent.

import { useTheme } from "@/components/ui/theme-provider";

export function Header() {
    const { theme, setTheme } = useTheme();

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6 shadow-sm">
            <div className="flex-1">
                {/* Placeholder for future breadcrumbs or title */}
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="h-9 w-9"
                >
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </div>
        </header>
    );
}
