import { NextResponse } from "next/server";
import { metaTimelineResponseSchema } from "@/features/patch-analysis/api";
import {
  mapPatchNoteToMetaTimelinePatch,
  metaTimelineInclude,
} from "@/features/patch-analysis/mapper";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const patchNotes = await prisma.patchNote.findMany({
    include: metaTimelineInclude,
    orderBy: {
      patchDate: "desc",
    },
  });

  const response = metaTimelineResponseSchema.parse({
    data: patchNotes.map(mapPatchNoteToMetaTimelinePatch),
  });

  return NextResponse.json(response);
}
