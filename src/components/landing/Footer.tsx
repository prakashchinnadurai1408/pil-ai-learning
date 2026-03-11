import pluginliveLogo from "@/assets/pluginlive-logo.png";

const Footer = () => {
  return (
    <footer id="about" className="bg-foreground py-16">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-12">
          <div className="max-w-sm">
            <div className="flex items-center gap-2 mb-4">
              <img src={pluginliveLogo} alt="PluginLive" className="h-8" />
              <span className="font-display text-xl font-bold" style={{ color: "hsl(196, 80%, 50%)" }}>
                AI LearnHub
              </span>
            </div>
            <p className="text-sm" style={{ color: "hsl(220, 15%, 60%)" }}>
              Empowering UG/PG students with AI literacy, hands-on tools, and
              real-world project experience for AI-driven careers.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12">
            <div>
              <h4 className="font-display font-semibold mb-3" style={{ color: "hsl(0, 0%, 90%)" }}>
                Platform
              </h4>
              <ul className="space-y-2 text-sm" style={{ color: "hsl(220, 15%, 55%)" }}>
                <li>Learning Modules</li>
                <li>AI Playground</li>
                <li>Assessments</li>
                <li>Projects</li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-semibold mb-3" style={{ color: "hsl(0, 0%, 90%)" }}>
                Support
              </h4>
              <ul className="space-y-2 text-sm" style={{ color: "hsl(220, 15%, 55%)" }}>
                <li>Documentation</li>
                <li>Contact Us</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t pt-6" style={{ borderColor: "hsl(220, 20%, 20%)", color: "hsl(220, 15%, 45%)" }}>
          <p className="text-sm text-center">
            © {new Date().getFullYear()} AI LearnHub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
