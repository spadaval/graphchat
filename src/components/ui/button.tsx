import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "~/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[11px] font-bold uppercase tracking-widest transition-all disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-emerald-500/30 focus-visible:ring-2 aria-invalid:ring-rose-500/20 aria-invalid:border-rose-500",
  {
    variants: {
      variant: {
        default:
          "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 shadow-[0_0_15px_-5px_rgba(16,185,129,0.2)]",
        destructive:
          "bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/30 shadow-[0_0_15px_-5px_rgba(244,63,94,0.2)]",
        outline:
          "border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-400 dark:bg-zinc-900/50 dark:border-zinc-800",
        secondary:
          "bg-zinc-800/80 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100",
        ghost: "text-zinc-500 hover:bg-emerald-500/5 hover:text-emerald-400",
        link: "text-emerald-500 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-5 py-2",
        sm: "h-8 rounded-md gap-1.5 px-3",
        lg: "h-11 rounded-md px-8",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
