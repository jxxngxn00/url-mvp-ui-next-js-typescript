import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { patchListResponseSchema } from "@/features/patch-analysis/api";
import {
  mapPatchNoteToPatchSummary,
  patchSummaryInclude,
} from "@/features/patch-analysis/mapper";

export async function GET() {
  const patchNotes = await prisma.patchNote.findMany({
    include: patchSummaryInclude,
    orderBy: {
      patchDate: "desc",
    },
  });

  const response = patchListResponseSchema.parse({
    data: patchNotes.map(mapPatchNoteToPatchSummary),
  });

  return NextResponse.json(response);
}
