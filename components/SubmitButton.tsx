// components/SubmitButton.tsx
"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({
  children,
  pendingText = "Working...",
  className,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const buttonClassName = [className, "disabled:cursor-not-allowed disabled:opacity-70"]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={buttonClassName}>
      <span className="inline-flex items-center justify-center gap-2">
        {pending ? (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : null}
        <span>{pending ? pendingText : children}</span>
      </span>
    </button>
  );
}
