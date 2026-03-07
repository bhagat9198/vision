'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const ElegantQRCodeClient = dynamic(
    () => import('./elegant-qr-code-client'),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center p-8 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
        )
    }
);

interface ElegantQRCodeProps {
    data: string;
    size?: number;
    logo?: string;
}

export default function ElegantQRCode(props: ElegantQRCodeProps) {
    return <ElegantQRCodeClient {...props} />;
}
