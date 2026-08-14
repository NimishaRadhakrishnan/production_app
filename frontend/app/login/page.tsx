"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { ApiError } from "@/lib/api/client";
import { fetchCurrentUser } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth-context";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  field_officer: "Field Officer",
  sales_officer: "Sales Officer",
  manager: "Regional Manager",
};

export default function LoginPage() {
  const router = useRouter();
  const { login, logout } = useAuth();
  const [username, setUsername] = useState(""); // Email or Employee ID
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("field_officer");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const trimmedUsername = username.trim();
      const isEmail = trimmedUsername.includes("@");
      const loginPayload = isEmail 
        ? { email: trimmedUsername, password } 
        : { employee_id: trimmedUsername, password };
      
      // Perform authentication
      await login(loginPayload);
      
      // Fetch current profile to verify selected role
      const currentUser = await fetchCurrentUser();
      if (currentUser.role !== selectedRole) {
        await logout();
        const correctRoleLabel = ROLE_LABELS[currentUser.role] || currentUser.role;
        setError(`This account is registered as a ${correctRoleLabel}.`);
        return;
      }
      
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.name === "ApiError" ? err.message : "Invalid email/employee ID or password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 bg-gradient-to-br from-green-50 to-slate-100">
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex justify-center mb-2">
            <img src="/logo.png" alt="Vishakan Biotech Logo" className="h-28 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Vishakan Biotech</h1>
          <p className="text-sm font-medium text-slate-500">Field Force Operations Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Select Your Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white text-sm"
            >
              <option value="admin">Admin</option>
              <option value="field_officer">Field Officer</option>
              <option value="sales_officer">Sales Officer</option>
              <option value="manager">Regional Manager</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Employee ID or Email
            </label>
            <input
              type="text"
              required
              autoComplete="off"
              placeholder="e.g. VB-1002 or email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="off"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-16 border border-slate-200 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-green-700 hover:text-green-800"
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>
          </div>

          {error && <p className="text-sm font-semibold text-red-600 text-center">{error}</p>}

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-green-700 hover:bg-green-800 disabled:bg-green-600 text-white font-semibold py-2.5 rounded-lg transition shadow-md border-0 text-sm tracking-wide"
          >
            {isSubmitting ? "Signing in..." : "Log In"}
          </button>
        </form>

        <div className="text-center pt-2">
          <Link href="/forgot-password" className="text-xs font-bold text-green-700 hover:underline">
            Forgot password?
          </Link>
        </div>
      </div>
    </main>
  );
}
