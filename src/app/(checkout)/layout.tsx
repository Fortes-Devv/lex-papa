import { AosProvider } from "@/components/providers/aos-provider";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AosProvider />
      {children}
    </div>
  );
}
