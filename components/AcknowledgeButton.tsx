"use client";

import { useTransition } from "react";
import { acknowledgeAlertAction } from "@/lib/actions/alerts";

export default function AcknowledgeButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      className="text-xs underline text-neutral-500 shrink-0"
      onClick={() => startTransition(() => acknowledgeAlertAction(id))}
    >
      acknowledge
    </button>
  );
}
