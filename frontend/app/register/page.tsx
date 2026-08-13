"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page immediately as public registration is disabled
    router.replace("/login");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center text-slate-500 text-sm">
        Redirecting to Login...
      </div>
    </main>
  );
}
