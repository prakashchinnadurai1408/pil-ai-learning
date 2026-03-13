import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import pluginliveLogo from "@/assets/pluginlive-logo.png";
import { GraduationCap, Users, Menu, X, Shield } from "lucide-react";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMenu = () => setMobileOpen(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" onClick={closeMenu}>
          <img src={pluginliveLogo} alt="PluginLive" className="h-8" />
          <span className="font-display text-lg font-bold text-gradient-primary">
            AI LearnHub
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#modules" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm">
            Modules
          </a>
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm">
            Features
          </a>
          <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm">
            About
          </a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/admin-login">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
          </Link>
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

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-lg text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-md">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
            <a href="#modules" onClick={closeMenu} className="text-sm font-medium text-muted-foreground hover:text-foreground py-2 px-3 rounded-lg hover:bg-muted transition-colors">
              Modules
            </a>
            <a href="#features" onClick={closeMenu} className="text-sm font-medium text-muted-foreground hover:text-foreground py-2 px-3 rounded-lg hover:bg-muted transition-colors">
              Features
            </a>
            <a href="#about" onClick={closeMenu} className="text-sm font-medium text-muted-foreground hover:text-foreground py-2 px-3 rounded-lg hover:bg-muted transition-colors">
              About
            </a>
            <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
              <Link to="/admin-login" onClick={closeMenu}>
                <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground">
                  <Shield className="h-4 w-4" /> Admin Login
                </Button>
              </Link>
              <Link to="/trainer-login" onClick={closeMenu}>
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Users className="h-4 w-4" /> Trainer Login
                </Button>
              </Link>
              <Link to="/student-login" onClick={closeMenu}>
                <Button size="sm" className="w-full gap-2 bg-gradient-primary border-0 text-primary-foreground hover:opacity-90">
                  <GraduationCap className="h-4 w-4" /> Student Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
