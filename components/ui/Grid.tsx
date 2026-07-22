import type { ComponentPropsWithoutRef } from "react";

type GridProps = ComponentPropsWithoutRef<"div">;

export function Grid({ className, ...props }: GridProps) {
  const gridClassName = ["grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", className]
    .filter(Boolean)
    .join(" ");

  return <div {...props} className={gridClassName} />;
}
