"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function SuccessPoller({ orderId }: { orderId: string }) {
  const router = useRouter();
  const attempts = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      attempts.current += 1;
      if (attempts.current > 10) {
        clearInterval(interval);
        return;
      }
      router.refresh();
    }, 4000);
    return () => clearInterval(interval);
  }, [orderId, router]);

  return null;
}
