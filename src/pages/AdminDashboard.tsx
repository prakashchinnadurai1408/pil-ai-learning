import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, BookOpen, CreditCard, LogOut, Shield, Layers } from "lucide-react";
import pluginliveLogo from "@/assets/pluginlive-logo.png";

const UserManagement = lazy(() => import("@/components/admin/UserManagement"));
const AIModuleCreator = lazy(() => import("@/components/admin/AIModuleCreator"));
const SubscriptionManagement = lazy(() => import("@/components/admin/SubscriptionManagement"));
const ContentManager = lazy(() => import("@/components/admin/ContentManager"));

const TabSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}
    </div>
    <div className="h-64 bg-muted rounded-lg" />
  </div>
);

const AdminDashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={pluginliveLogo} alt="PluginLive" className="h-7" />
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-primary" />
              <span className="font-display font-bold text-gradient-primary">Admin Panel</span>
            </div>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage users, modules, and subscriptions</p>
        </div>

        <Tabs defaultValue="users">
          <TabsList className="mb-8 bg-muted p-1">
            <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Users className="h-4 w-4" /> User Management
            </TabsTrigger>
            <TabsTrigger value="modules" className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <BookOpen className="h-4 w-4" /> Modules
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <CreditCard className="h-4 w-4" /> Subscriptions
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Layers className="h-4 w-4" /> Content
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Suspense fallback={<TabSkeleton />}>
              <UserManagement />
            </Suspense>
          </TabsContent>

          <TabsContent value="modules">
            <Suspense fallback={<TabSkeleton />}>
              <AIModuleCreator />
            </Suspense>
          </TabsContent>

          <TabsContent value="subscriptions">
            <Suspense fallback={<TabSkeleton />}>
              <SubscriptionManagement />
            </Suspense>
          </TabsContent>

          <TabsContent value="content">
            <Suspense fallback={<TabSkeleton />}>
              <ContentManager />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
