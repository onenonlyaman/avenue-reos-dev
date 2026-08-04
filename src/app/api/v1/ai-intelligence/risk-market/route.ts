import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    await prisma.$executeRaw`
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
    `;

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM ai_risk_market WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      commodityName: r.commodity_name,
      currentMarketIndexPrice: Number(r.current_market_index_price || 0),
      priceTrendRecommendation: r.price_trend_recommendation,
      fraudAnomalyScore: Number(r.fraud_anomaly_score || 0),
      customerSentimentScore: Number(r.customer_sentiment_score || 75),
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
        message: err instanceof Error ? err.message : "Risk market insights could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}



