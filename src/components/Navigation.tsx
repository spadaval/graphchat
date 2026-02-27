import { Link, useRouterState } from "@tanstack/react-router";
import { FileText, MessageSquare } from "lucide-react";
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
    <div className="flex border-b border-zinc-800/50 px-4 bg-[#0a0a0a]/80 backdrop-blur-md">
      <Link
        to="/"
        className={cn(
          "wc-nav-item group relative h-12 gap-3 px-4",
          isActive("/")
            ? "text-emerald-400 font-bold"
            : "text-zinc-500 hover:text-zinc-300",
        )}
      >
        {isActive("/") && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500" />
        )}
        <MessageSquare
          size={16}
          className={
            isActive("/")
              ? "text-emerald-500"
              : "transition-colors group-hover:text-zinc-400"
          }
        />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
          Chat
        </span>
      </Link>
      <Link
        to="/documents"
        className={cn(
          "wc-nav-item group relative h-12 gap-3 px-4",
          isActive("/documents")
            ? "text-emerald-400 font-bold"
            : "text-zinc-500 hover:text-zinc-300",
        )}
      >
        {isActive("/documents") && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500" />
        )}
        <FileText
          size={16}
          className={
            isActive("/documents")
              ? "text-emerald-500"
              : "transition-colors group-hover:text-zinc-400"
          }
        />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
          Documents
        </span>
      </Link>
    </div>
  );
}
