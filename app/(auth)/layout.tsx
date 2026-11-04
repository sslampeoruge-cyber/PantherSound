import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#ede9fe,_#f6f6f9_55%)] p-4 sm:p-6">
      {children}
    </div>
  );
}
