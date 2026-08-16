import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await runtimeDdl("table:ai_risk_market", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS ai_risk_market (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        commodity_name VARCHAR(100) NOT NULL,
        current_market_index_price NUMERIC(15,2) NOT NULL,
        price_trend_recommendation VARCHAR(50) NOT NULL DEFAULT 'MONITOR',
        fraud_anomaly_score INT NOT NULL DEFAULT 0,
        customer_sentiment_score INT NOT NULL DEFAULT 75,
        signal_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        requires_hitl BOOLEAN NOT NULL DEFAULT false,
        summary TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM ai_risk_market
      WHERE tenant_id = ${auth.user.tenantId}::uuid
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      commodityName: r.commodity_name,
      currentMarketIndexPrice: Number(r.current_market_index_price || 0),
      priceTrendRecommendation: r.price_trend_recommendation,
      fraudAnomalyScore: Number(r.fraud_anomaly_score || 0),
      customerSentimentScore:
        r.customer_sentiment_score !== null && r.customer_sentiment_score !== undefined
          ? Number(r.customer_sentiment_score)
          : 75,
      signalAmount: Number(r.signal_amount || 0),
      requiresHitl: Boolean(r.requires_hitl),
      summary: r.summary,
    }));

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: mapped,
      error: null,
      meta: { total_records: mapped.length },
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: [],
      error: {
        code: "RISK_MARKET_FETCH_ERROR",
        message: safeErrorMessage(err, "Risk market insights could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const tenantId = auth.user.tenantId;
    const body = await request.json();

    const {
      commodityName,
      currentMarketIndexPrice = 0,
      priceTrendRecommendation = "MONITOR",
      fraudAnomalyScore = 0,
      customerSentimentScore = 75,
      signalAmount = 0,
      requiresHitl = false,
      summary,
    } = body;

    if (!commodityName || !summary) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "VALIDATION_ERROR", message: "Commodity/market asset name and strategic summary are required." },
        meta: null,
      }, { status: 400 });
    }

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO ai_risk_market (
        tenant_id, commodity_name, current_market_index_price, price_trend_recommendation,
        fraud_anomaly_score, customer_sentiment_score, signal_amount, requires_hitl, summary
      ) VALUES (
        ${tenantId}::uuid,
        ${commodityName.trim()},
        ${Number(currentMarketIndexPrice) || 0},
        ${priceTrendRecommendation.trim().toUpperCase()},
        ${Number(fraudAnomalyScore) || 0},
        ${Number(customerSentimentScore) || 75},
        ${Number(signalAmount) || 0},
        ${Boolean(requiresHitl)},
        ${summary.trim()}
      )
      RETURNING *
    `;

    const r = inserted[0];
    const mapped = {
      id: r.id,
      commodityName: r.commodity_name,
      currentMarketIndexPrice: Number(r.current_market_index_price || 0),
      priceTrendRecommendation: r.price_trend_recommendation,
      fraudAnomalyScore: Number(r.fraud_anomaly_score || 0),
      customerSentimentScore: Number(r.customer_sentiment_score || 75),
      signalAmount: Number(r.signal_amount || 0),
      requiresHitl: Boolean(r.requires_hitl),
      summary: r.summary,
    };

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: mapped,
      error: null,
      meta: null,
    }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "RISK_MARKET_CREATE_ERROR",
        message: safeErrorMessage(err, "Market intelligence signal could not be recorded"),
      },
      meta: null,
    }, { status: 500 });
  }
}
