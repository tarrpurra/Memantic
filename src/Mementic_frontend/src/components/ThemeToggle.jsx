import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/Button";
import { useTheme } from "../contexts/ThemeContext";

const iconBaseClasses =
  "absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 transition-all duration-300 ease-in-out text-primary";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Toggle theme"
      className="relative h-10 w-10 overflow-hidden rounded-full border border-border/70 bg-card/80 backdrop-blur shadow-sm hover:bg-white dark:hover:bg-black transition-colors"
      onClick={toggleTheme}
    >
      <Sun
        className={`${iconBaseClasses} ${
          theme === "dark"
            ? "translate-y-4 opacity-0 rotate-90"
            : "-translate-y-1/2 opacity-100 rotate-0"
        }`}
      />
      <Moon
        className={`${iconBaseClasses} ${
          theme === "dark"
            ? "-translate-y-1/2 opacity-100 rotate-0"
            : "-translate-y-4 opacity-0 -rotate-90"
        }`}
      />
    </Button>
  );
};

export default ThemeToggle;
