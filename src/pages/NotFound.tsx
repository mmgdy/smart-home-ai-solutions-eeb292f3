import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center azka-glass rounded-3xl p-8 sm:p-10 max-w-md w-full">
        <h1 className="mb-3 font-display text-5xl font-bold azka-gradient-text">404</h1>
        <p className="mb-6 text-lg text-muted-foreground">Oops! Page not found</p>
        <a
          href="/"
          className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
