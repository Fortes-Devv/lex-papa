import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CheckoutClient } from "@/components/checkout/checkout-client";

export default async function CheckoutPage({ searchParams }: { searchParams: { productId?: string } }) {
  const session = await auth();
  const { productId } = searchParams;

  if (!productId) {
    redirect("/course");
  }

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/checkout?productId=${productId}`)}`);
  }

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product || product.status !== "published") {
    redirect("/course");
  }

  const existingEnrollment = await db.enrollment.findUnique({
    where: { userId_productId: { userId: session.user.id, productId: product.id } },
  });

  if (existingEnrollment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-lg font-semibold text-foreground">Você já tem acesso a este curso!</p>
          <Link href="/student/library" className="text-primary font-medium hover:underline">Ir para minha biblioteca</Link>
        </div>
      </div>
    );
  }

  return (
    <CheckoutClient
      product={{
        id: product.id,
        title: product.title,
        thumbnail: product.thumbnail,
        price: Number(product.price),
        rating: product.rating,
        reviewCount: product.reviewCount,
        enrolledCount: product.enrolledCount,
      }}
      payerEmail={session.user.email ?? ""}
      payerName={session.user.name ?? ""}
      mpPublicKey={process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? ""}
    />
  );
}
