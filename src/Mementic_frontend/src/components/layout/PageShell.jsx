import Navigation from "../Navigation";

const joinClasses = (...values) =>
  values
    .flatMap((value) => {
      if (Array.isArray(value)) return value;
      if (typeof value === "string") return value.split(" ");
      if (typeof value === "object" && value) {
        return Object.entries(value)
          .filter(([, enabled]) => Boolean(enabled))
          .map(([key]) => key);
      }
      return value ? [String(value)] : [];
    })
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

const PageShell = ({
  children,
  className,
  mainClassName,
  withBackground = true,
  showNavigation = true,
}) => {
  return (
    <div
      className={joinClasses(
        "page-shell",
        withBackground ? "page-shell--with-bg" : "bg-background",
        className
      )}
    >
      {withBackground && (
        <div className="page-shell__background" aria-hidden>
          <div className="hero-aurora" />
          <div className="hero-grid" />
          <div className="hero-sparkles" />
        </div>
      )}

      {showNavigation && <Navigation />}

      <main className={joinClasses("page-shell__main", mainClassName)}>
        {children}
      </main>
    </div>
  );
};

export default PageShell;
