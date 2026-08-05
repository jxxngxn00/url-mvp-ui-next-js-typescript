import { NextResponse } from "next/server";
import {
  patchImportListResponseSchema,
} from "@/features/patch-update/api";
import { listPatchImportsForReview } from "@/features/patch-update/repository";

export async function GET() {
  const patchImports = await listPatchImportsForReview();
  const response = patchImportListResponseSchema.parse({
    data: patchImports,
    meta: {
      count: patchImports.length,
    },
  });

  return NextResponse.json(response);
}
