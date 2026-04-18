import { lazy, Suspense, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Video } from "lucide-react";

const AIModuleCreator = lazy(() => import("@/components/admin/AIModuleCreator"));
const ContentManager = lazy(() => import("@/components/admin/ContentManager"));

const Fallback = () => <div className="h-64 bg-muted rounded-lg animate-pulse" />;

const ModulesAndVideos = () => {
  const [tab, setTab] = useState("modules");
  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList className="bg-muted p-1">
        <TabsTrigger value="modules" className="gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
          <BookOpen className="h-4 w-4" /> Modules
        </TabsTrigger>
        <TabsTrigger value="videos" className="gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
          <Video className="h-4 w-4" /> Video Content
        </TabsTrigger>
      </TabsList>
      <TabsContent value="modules">
        <Suspense fallback={<Fallback />}><AIModuleCreator /></Suspense>
      </TabsContent>
      <TabsContent value="videos">
        <Suspense fallback={<Fallback />}>
          <ContentManager initialSection="videos" sectionsOverride={["videos"]} />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
};

export default ModulesAndVideos;
