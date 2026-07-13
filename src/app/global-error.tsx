"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <main style={{ padding: 24 }}>
          <h1>앱을 불러오지 못했습니다.</h1>
          <p>잠시 후 새로고침해 주세요.</p>
        </main>
      </body>
    </html>
  );
}
