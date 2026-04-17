import { Shield } from 'lucide-react';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
            <div className="mb-8 flex items-center gap-2">
                <Shield className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold">Image Analyse</span>
            </div>
            <div className="w-full max-w-sm space-y-4">
                {children}
            </div>
        </div>
    );
}
