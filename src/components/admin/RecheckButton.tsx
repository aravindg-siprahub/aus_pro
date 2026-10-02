"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";

export function RecheckButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button variant="secondary" size="sm" loading={pending} onClick={() => start(() => router.refresh())}>
      Check again
    </Button>
  );
}
