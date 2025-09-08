import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "~/lib/utils";

export function Navigation() {
  const { location } = useRouterState();

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex border-b border-zinc-800 bg-zinc-900">
      <Link
        to="/"
        className={cn(
          "px-4 py-3 text-sm font-medium transition-colors",
          isActive("/")
            ? "text-zinc-100 border-b-2 border-zinc-400"
            : "text-zinc-500 hover:text-zinc-300",
        )}
      >
        Chat
      </Link>
      <Link
        to="/documents"
        className={cn(
          "px-4 py-3 text-sm font-medium transition-colors",
          isActive("/documents")
            ? "text-zinc-100 border-b-2 border-zinc-400"
            : "text-zinc-500 hover:text-zinc-300",
        )}
      >
        Documents
      </Link>
    </div>
  );
}
