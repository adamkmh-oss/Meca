import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { Container } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/dal";
import { isStaff } from "@/lib/auth/permissions";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = { title: { default: "Administration", template: "%s · Administration · STRUCTURA" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireUser("/admin");
  if (!isStaff(s.permissions)) forbidden();
  return (
    <Container>
      <AdminNav permissions={s.permissions} />
      {children}
    </Container>
  );
}
