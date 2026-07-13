"use client";

import * as Sentry from "@sentry/nextjs";
import { Button } from "@mui/joy";
import { useEffect } from "react";
import { StateCard } from "@/features/patch-analysis/components";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <StateCard
      action={
        <Button onClick={reset} size="sm" variant="soft">
          다시 시도
        </Button>
      }
      description="예상하지 못한 문제가 발생했습니다. 같은 문제가 반복되면 잠시 후 다시 확인해 주세요."
      title="화면을 불러오지 못했습니다."
    />
  );
}
