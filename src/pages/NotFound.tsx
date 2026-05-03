import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import TopNav from "@/components/TopNav";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav />
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center" style={{ maxWidth: 480, padding: 'var(--space-xl)' }}>
          <p className="font-heading text-[6rem] font-extrabold leading-none text-primary">404</p>
          <div className="mx-auto my-4 h-1 w-16 bg-accent" />
          <h1 className="font-heading text-2xl font-bold text-foreground">Page Not Found</h1>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            The page you are looking for does not exist or has been moved.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button onClick={() => navigate('/')}>
              Back to Dashboard
            </Button>
            <Button variant="outline" onClick={() => navigate('/search')}>
              Go to Search
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
