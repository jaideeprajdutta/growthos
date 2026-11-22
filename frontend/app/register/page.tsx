import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Create account — GrowthOS" };

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
