import Link from "next/link";

interface BrandProps {
  readonly brand: string;
}

export function Brand({ brand }: BrandProps) {
  return (
    <Link
      href="/"
      className="flex items-center px-6 py-5 text-sm font-semibold tracking-tight text-zinc-950 outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-inset dark:text-zinc-50 dark:focus-visible:ring-zinc-100"
    >
      {brand}
    </Link>
  );
}
