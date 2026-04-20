import { motion } from "framer-motion";
import {
  GraduationCap,
  Users,
  BookOpen,
  Brain,
  ClipboardCheck,
  Code2,
  FolderKanban,
  BarChart3,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Bell,
  UserCheck,
  FileBarChart,
  Send,
  Target,
} from "lucide-react";

const studentFeatures = [
  { icon: BookOpen, title: "Learning Modules", description: "10+ structured AI modules with videos, topics & section-level content" },
  { icon: Brain, title: "AI Coach & Playground", description: "Personalized AI coach plus prompt engineering lab and tools sandbox" },
  { icon: ClipboardCheck, title: "Assessments & Quizzes", description: "Module quizzes, custom assessments and AI-generated diagnostic tests" },
  { icon: Code2, title: "Coding Challenges", description: "200+ challenges across 40+ languages with live execution & leaderboard" },
  { icon: FolderKanban, title: "Academic Projects", description: "10-step guided project lifecycle for Tech and Non-Tech streams" },
  { icon: Target, title: "AI Learning Paths", description: "Personalized learning paths generated from your diagnostic results" },
  { icon: BarChart3, title: "Progress Analytics", description: "Track assessment, project and proctoring analytics in one dashboard" },
  { icon: Bell, title: "Notifications & Profile", description: "Stay updated with trainer messages and manage your profile securely" },
];

const trainerFeatures = [
  { icon: UserCheck, title: "Student Management", description: "View assigned students, monitor progress and drill into individual reports" },
  { icon: ClipboardCheck, title: "Create Assessments", description: "Build custom assessments with MCQ, descriptive, video and coding mixes" },
  { icon: FileBarChart, title: "Assessment Analytics", description: "Real-time scores, attempt reviews and exportable PDF reports" },
  { icon: BarChart3, title: "Module & Coding Analytics", description: "Track module completion and coding challenge performance per student" },
  { icon: FolderKanban, title: "Project Reviews", description: "Review submitted project documents with multi-turn threaded feedback" },
  { icon: Send, title: "Bulk Messaging", description: "Send targeted in-app notifications and emails to student cohorts" },
  { icon: ShieldCheck, title: "Proctoring Insights", description: "Review proctoring events, snapshots and integrity scores per attempt" },
  { icon: Sparkles, title: "AI-Assisted Tools", description: "Generate question banks and assessment items with AI in seconds" },
];

interface RoleBlockProps {
  icon: typeof GraduationCap;
  badge: string;
  title: string;
  highlight: string;
  description: string;
  features: typeof studentFeatures;
  accent: "primary" | "accent";
}

const RoleBlock = ({ icon: RoleIcon, badge, title, highlight, description, features, accent }: RoleBlockProps) => {
  const gradientClass = accent === "primary" ? "bg-gradient-primary" : "bg-gradient-accent";
  const iconTextClass = accent === "primary" ? "text-primary-foreground" : "text-accent-foreground";
  const highlightClass = accent === "primary" ? "text-gradient-primary" : "text-gradient-accent";
  const borderClass = accent === "primary" ? "border-primary/20" : "border-accent/20";

  return (
    <div className="mb-20 last:mb-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-10"
      >
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${gradientClass} mb-4`}>
          <RoleIcon className={`h-4 w-4 ${iconTextClass}`} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${iconTextClass}`}>{badge}</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-display font-bold mb-3">
          {title} <span className={highlightClass}>{highlight}</span>
        </h3>
        <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">{description}</p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {features.map((feat, i) => {
          const Icon = feat.icon;
          return (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className={`bg-card rounded-lg p-5 shadow-card border ${borderClass} hover:shadow-elevated transition-all hover:-translate-y-1`}
            >
              <div className={`w-10 h-10 rounded-lg ${gradientClass} flex items-center justify-center mb-3`}>
                <Icon className={`h-5 w-5 ${iconTextClass}`} />
              </div>
              <h4 className="font-display font-semibold text-base mb-1.5 text-card-foreground">{feat.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{feat.description}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

const RoleFeaturesSection = () => {
  return (
    <section id="role-features" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
            Built for <span className="text-gradient-primary">Students</span> &amp;{" "}
            <span className="text-gradient-accent">Trainers</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tailored experiences for every role — from immersive learning for students to powerful management tools for trainers
          </p>
        </motion.div>

        <RoleBlock
          icon={GraduationCap}
          badge="For Students"
          title="Learn, practice and"
          highlight="grow with AI"
          description="Everything an all age group student needs to master AI — structured modules, hands-on labs, assessments, projects and personalized coaching."
          features={studentFeatures}
          accent="primary"
        />

        <RoleBlock
          icon={Users}
          badge="For Trainers"
          title="Manage cohorts and"
          highlight="track outcomes"
          description="Create assessments, review projects, monitor progress and send targeted communications — all from a single trainer dashboard."
          features={trainerFeatures}
          accent="accent"
        />
      </div>
    </section>
  );
};

export default RoleFeaturesSection;
