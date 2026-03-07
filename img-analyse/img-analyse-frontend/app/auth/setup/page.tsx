"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authService } from "@/lib/auth-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SetupPage() {
    const { register } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
    });

    useEffect(() => {
        // Check if setup is already completed
        authService.checkSetupStatus()
            .then((status) => {
                if (!status.setupRequired) {
                    toast.info("Setup already completed");
                    router.push("/auth/login");
                }
            })
            .catch((error) => {
                console.error("Failed to check setup status:", error);
            })
            .finally(() => {
                setChecking(false);
            });
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await register(formData);
        } catch {
            // Error handled by auth context
        } finally {
            setLoading(false);
        }
    };

    if (checking) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>System Setup</CardTitle>
                <CardDescription>
                    Create the master admin account to get started
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                            id="name"
                            placeholder="John Doe"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="admin@example.com"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            required
                            minLength={6}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" type="submit" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Create Admin Account
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
