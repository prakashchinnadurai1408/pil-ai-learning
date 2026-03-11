import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logoIcon from "@/assets/logo-icon.png";
import { GraduationCap, Users } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoIcon} alt="AI Learn" className="h-8 w-8" />
          <span className="font-display text-xl font-bold text-gradient-primary">
            AI LearnHub
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#modules" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Modules
          </a>
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            About
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/trainer-login">
            <Button variant="outline" size="sm" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Trainer</span>
            </Button>
          </Link>
          <Link to="/student-login">
            <Button size="sm" className="gap-2 bg-gradient-primary border-0 text-primary-foreground hover:opacity-90">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Student Login</span>
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
