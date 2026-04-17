"use client";

import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, Mail, Shield, User, Key, LogOut } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";

export default function ProfilePage() {
    const { user, logout } = useAuth();

    if (!user) return null;

    return (
        <AppLayout>
            <div className="space-y-8 max-w-5xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Profile Settings</h1>
                        <p className="text-muted-foreground mt-1">Manage your personal account and preferences</p>
                    </div>
                    <Button variant="destructive" onClick={logout} className="md:w-auto w-full">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                    </Button>
                </div>

                {/* Main Content Grid */}
                <div className="grid gap-8 md:grid-cols-12">
                    {/* User Card - Left Column */}
                    <div className="md:col-span-4 space-y-6">
                        <Card className="overflow-hidden border-muted/50 shadow-sm">
                            <div className="h-32 bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-pink-500/20" />
                            <CardContent className="relative pt-0 px-6 pb-6">
                                <Avatar className="absolute -top-12 h-24 w-24 border-4 border-background shadow-lg">
                                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                                        {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="mt-14 space-y-1">
                                    <h3 className="font-bold text-xl">{user.name || "Admin User"}</h3>
                                    <p className="text-sm text-muted-foreground break-all">{user.email}</p>
                                </div>
                                <div className="mt-6 flex flex-wrap gap-2">
                                    <Badge variant="secondary" className="px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 border-0">
                                        <Shield className="mr-1 h-3 w-3" />
                                        {user.role.toUpperCase()}
                                    </Badge>
                                    <Badge variant="outline" className="px-3 py-1">
                                        <User className="mr-1 h-3 w-3" />
                                        Verified
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Details - Right Column */}
                    <div className="md:col-span-8 space-y-6">
                        <Card className="shadow-sm border-muted/50">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <User className="h-5 w-5 text-primary" />
                                    Account Details
                                </CardTitle>
                                <CardDescription>
                                    Your system identity information
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                                        <div className="p-3 bg-muted/50 rounded-lg border border-border/50 text-sm font-medium">
                                            {user.name || "Not set"}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                                        <div className="p-3 bg-muted/50 rounded-lg border border-border/50 text-sm font-medium flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                            {user.email}
                                        </div>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-medium text-muted-foreground">User ID</label>
                                        <div className="p-3 bg-muted/50 rounded-lg border border-border/50 text-xs font-mono text-muted-foreground flex items-center gap-2">
                                            <Key className="h-4 w-4" />
                                            {user.id}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/20 border-t border-border/50 px-6 py-4">
                                <p className="text-xs text-muted-foreground">
                                    Account created on {new Date().toLocaleDateString()}
                                </p>
                            </CardFooter>
                        </Card>

                        {/* Organization Placeholder */}
                        <Card className="shadow-sm border-muted/50 opacity-75">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <Building className="h-5 w-5 text-primary" />
                                    Organization
                                </CardTitle>
                                <CardDescription>
                                    Organization settings are managed globally
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">Default Organization</p>
                                        <p className="text-xs text-muted-foreground">You are viewing the default system organization</p>
                                    </div>
                                    <Button variant="outline" size="sm" disabled>Manage</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
