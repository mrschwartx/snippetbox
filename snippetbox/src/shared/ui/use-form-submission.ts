"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { UnauthenticatedError, ValidationError } from "@/shared/kernel/errors";

const UNEXPECTED_ERROR_MESSAGE = "Something went wrong. Please try again.";

export function useFormSubmission() {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [nonFieldErrors, setNonFieldErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(
    async (action: () => Promise<void>) => {
      setSubmitting(true);
      setFieldErrors({});
      setNonFieldErrors([]);

      try {
        await action();
      } catch (error) {
        if (error instanceof ValidationError) {
          setFieldErrors(error.fieldErrors);
          setNonFieldErrors(error.nonFieldErrors);
        } else if (error instanceof UnauthenticatedError) {
          router.replace("/user/login");
        } else {
          setNonFieldErrors([UNEXPECTED_ERROR_MESSAGE]);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [router],
  );

  return { fieldErrors, nonFieldErrors, submitting, submit };
}
