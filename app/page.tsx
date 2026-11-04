"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { LoadingScreen } from "@/components/ui";

export default function HomePage() {
  const { session, loading, configured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!configured || !session) {
      router.replace("/login/");
    } else {
      router.replace("/dashboard/");
    }
  }, [loading, configured, session, router]);

  return <LoadingScreen label="Cargando PantherSound…" />;
}
