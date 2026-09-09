import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { collectorPropertyToCardData } from "@/lib/property-card-data";
import {
  searchMongoProperties,
  type MongoPropertySourceResult,
} from "@/lib/services/mongo-property-source";
import {
  findPropertySearch,
  propertySearchProperties,
} from "@/lib/services/property-searches";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const parsedId = z.uuid().safeParse((await context.params).id);
    if (!parsedId.success) {
      return NextResponse.json(
        { ok: false, error: "Pesquisa inválida" },
        { status: 400 },
      );
    }
    const database = await db();
    const search = await findPropertySearch(database, parsedId.data);
    if (!search) {
      return NextResponse.json(
        { ok: false, error: "Pesquisa não encontrada" },
        { status: 404 },
      );
    }
    const isAuction = search.transaction === "AUCTION";
    const result = isAuction
      ? { properties: [], cached: false }
      : await propertySearchProperties(database, search);
    const mongoResult: MongoPropertySourceResult = isAuction
      ? await searchMongoProperties(search, 100)
      : { properties: [] };
    const properties = isAuction
      ? mongoResult.properties
      : result.properties.map(collectorPropertyToCardData);
    const effectiveMongoResult = mongoResult;
    const mongoSource =
      effectiveMongoResult.status || effectiveMongoResult.error || effectiveMongoResult.detail
        ? {
            status: effectiveMongoResult.status ?? "ERROR",
            message:
              effectiveMongoResult.error ??
              effectiveMongoResult.detail ??
              "Retorno do Mongo sem detalhes.",
          }
        : undefined;
    return NextResponse.json({
      ok: true,
      search,
      cachedResults: result.cached,
      count: properties.length,
      properties,
      sourceErrors: [
        ...(effectiveMongoResult.error ? [effectiveMongoResult.error] : []),
      ],
      mongoSource: isAuction ? mongoSource : undefined,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: "Erro ao acompanhar a pesquisa" },
      { status: 500 },
    );
  }
}
