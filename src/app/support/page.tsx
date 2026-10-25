import type { Metadata } from "next";
import { supportConfig } from "@/lib/support";
import { SupportHome } from "@/lib/support/home";

export const metadata: Metadata = {
  title: "Help center",
  description: supportConfig.homeDescription,
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <SupportHome config={supportConfig} searchPlaceholder="GitHub, editing, repository access…" />
    </main>
  );
}
