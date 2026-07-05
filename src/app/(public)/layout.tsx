import { AosProvider } from "@/components/providers/aos-provider";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AosProvider />
      {children}
    </div>
  );
}
