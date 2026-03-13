import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import { LoadingFallback } from "@/components/LoadingFallback";

const Index = lazy(() => import("./pages/Index.tsx"));
const StudentLogin = lazy(() => import("./pages/StudentLogin.tsx"));
const TrainerLogin = lazy(() => import("./pages/TrainerLogin.tsx"));
const AdminLogin = lazy(() => import("./pages/AdminLogin.tsx"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard.tsx"));
const TrainerDashboard = lazy(() => import("./pages/TrainerDashboard.tsx"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ErrorBoundary>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/student-login" element={<StudentLogin />} />
              <Route path="/trainer-login" element={<TrainerLogin />} />
              <Route path="/student-dashboard" element={<StudentDashboard />} />
              <Route path="/trainer-dashboard" element={<TrainerDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
