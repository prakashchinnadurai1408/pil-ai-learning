import { motion } from "framer-motion";
import { modules } from "@/data/modules";
import { Clock, Video, BookOpen, Sparkles } from "lucide-react";
import { useAdminModules } from "@/hooks/useAdminModules";

const ModulesSection = () => {
  const { adminModules } = useAdminModules();
  const publishedAdminModules = adminModules.filter(m => m.status === "published");

  return (
    <section id="modules" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
            {10 + publishedAdminModules.length} Structured <span className="text-gradient-primary">AI Learning</span> Modules
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From AI fundamentals to SaaS development — a complete learning path designed for all age group students
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {modules.map((mod, i) => {
            const Icon = mod.icon;
            return (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group relative bg-card rounded-lg border border-border p-6 shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br ${mod.color} mb-4`}>
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </div>

                <h3 className="font-display font-semibold text-lg mb-2 text-card-foreground">
                  {mod.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {mod.description}
                </p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Video className="h-3 w-3" /> {mod.videoCount} videos
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {mod.duration}
                  </span>
                </div>

                <div className="absolute top-4 right-4 text-xs font-bold text-muted-foreground/50 font-display">
                  {String(mod.id).padStart(2, "0")}
                </div>
              </motion.div>
            );
          })}

          {/* Admin-created published modules */}
          {publishedAdminModules.map((mod, i) => (
            <motion.div
              key={`admin-${mod.id}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (modules.length + i) * 0.05 }}
              className="group relative bg-card rounded-lg border border-accent/20 p-6 shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-accent mb-4">
                <BookOpen className="h-6 w-6 text-accent-foreground" />
              </div>

              <div className="absolute top-4 right-4">
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                  <Sparkles className="h-3 w-3" /> New
                </span>
              </div>

              <h3 className="font-display font-semibold text-lg mb-2 text-card-foreground">
                {mod.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {mod.description}
              </p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" /> {mod.topics.length} topics
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {mod.duration}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ModulesSection;
