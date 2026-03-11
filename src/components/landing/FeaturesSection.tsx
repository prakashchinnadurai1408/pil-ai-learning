import { motion } from "framer-motion";
import { MessageSquare, Video, FlaskConical, ClipboardCheck, BarChart3, Users } from "lucide-react";

const features = [
  {
    icon: Video,
    title: "Video-Based Learning",
    description: "Watch structured AI lessons with chapter segmentation and embedded quizzes",
  },
  {
    icon: MessageSquare,
    title: "AI Chat Playground",
    description: "Practice prompt engineering in a real AI chat environment",
  },
  {
    icon: FlaskConical,
    title: "AI Tools Sandbox",
    description: "Experiment with image generation, code generation, text summarization & more",
  },
  {
    icon: ClipboardCheck,
    title: "Assessments & MCQ",
    description: "Video-based MCQs, prompt design tasks, AI problem solving evaluations",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description: "Track your learning journey across modules, assignments and assessments",
  },
  {
    icon: Users,
    title: "Trainer Dashboard",
    description: "Trainers monitor progress, assign modules, create assessments & review work",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-muted/50">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
            Everything You Need to <span className="text-gradient-accent">Master AI</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Interactive tools and assessments designed for hands-on AI learning
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-card rounded-lg p-8 shadow-card border border-border hover:shadow-elevated transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-accent flex items-center justify-center mb-5">
                  <Icon className="h-6 w-6 text-accent-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2 text-card-foreground">{feat.title}</h3>
                <p className="text-sm text-muted-foreground">{feat.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
