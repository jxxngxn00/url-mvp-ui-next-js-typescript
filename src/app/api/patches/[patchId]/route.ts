import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  mapPatchNoteToPatchAnalysis,
  patchAnalysisInclude,
} from "@/features/patch-analysis/mapper";
import { patchAnalysisResponseSchema } from "@/features/patch-analysis/api";

type RouteContext = {
  params: Promise<{
    patchId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { patchId } = await context.params;

  const patchNote = await prisma.patchNote.findUnique({
    where: { patchId },
    include: patchAnalysisInclude,
  });

  if (!patchNote) {
    return NextResponse.json(
      {
        error: {
          code: "PATCH_NOT_FOUND",
          message: "Patch analysis was not found.",
        },
      },
      { status: 404 },
    );
  }

  const response = patchAnalysisResponseSchema.parse({
    data: mapPatchNoteToPatchAnalysis(patchNote),
  });

  return NextResponse.json(response);
}
