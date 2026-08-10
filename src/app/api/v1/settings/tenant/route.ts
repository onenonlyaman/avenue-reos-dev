import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const model = (prisma as any).tenantProfile;
    let record: any = null;

    if (model?.findFirst) {
      record = await model.findFirst();
      if (!record) {
        record = await model.create({
          data: {
            tenantId: ACTIVE_TENANT_ID,
            organizationLegalName: "REOS Pvt. Ltd.",
            gstinRegistration: "27AAAAA0000A1Z5",
            registeredAddress: "Gangapur Road, Nashik, Maharashtra 422013",
            operationalTimezone: "Asia/Kolkata (IST)",
            baseCurrency: "INR (₹)",
            fiscalYearCycle: "April - March (India)",
            activeUsersCount: 1,
            activeSiteAccountsCount: 1,
          },
        });
      }
    } else {
      try {
        await runtimeDdl("table:tenant_profiles", () => prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS tenant_profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            organization_legal_name VARCHAR(255) NOT NULL,
            gstin_registration VARCHAR(50) NOT NULL,
            registered_address TEXT NOT NULL,
            operational_timezone VARCHAR(100) NOT NULL,
            base_currency VARCHAR(50) NOT NULL,
            fiscal_year_cycle VARCHAR(100) NOT NULL,
            active_users_count INT NOT NULL DEFAULT 1,
            active_site_accounts_count INT NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        const raw = await prisma.$queryRaw<any[]>`
          SELECT * FROM tenant_profiles WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid LIMIT 1
        `;
        if (raw && raw.length > 0) {
          record = raw[0];
        } else {
          const inserted = await prisma.$queryRaw<any[]>`
            INSERT INTO tenant_profiles (
              tenant_id, organization_legal_name, gstin_registration,
              registered_address, operational_timezone, base_currency, fiscal_year_cycle
            ) VALUES (
              '00000000-0000-0000-0000-000000000001'::uuid, 'REOS Pvt. Ltd.', '27AAAAA0000A1Z5',
              'Gangapur Road, Nashik, Maharashtra 422013', 'Asia/Kolkata (IST)',
              'INR (₹)', 'April - March (India)'
            )
            RETURNING *
          `;
          record = inserted[0];
        }
      } catch {
        record = null;
      }
    }

    if (!record) {
      return NextResponse.json({
        success: true,
        status_code: 200,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: null,
        meta: null,
      });
    }

    const mapped = {
      id: record.id,
      organizationLegalName: record.organizationLegalName || record.organization_legal_name || "",
      gstinRegistration: record.gstinRegistration || record.gstin_registration || "",
      registeredAddress: record.registeredAddress || record.registered_address || "",
      operationalTimezone: record.operationalTimezone || record.operational_timezone || "Asia/Kolkata (IST)",
      baseCurrency: record.baseCurrency || record.base_currency || "INR (₹)",
      fiscalYearCycle: record.fiscalYearCycle || record.fiscal_year_cycle || "April - March (India)",
      activeUsersCount: Number(record.activeUsersCount ?? record.active_users_count ?? 1),
      activeSiteAccountsCount: Number(record.activeSiteAccountsCount ?? record.active_site_accounts_count ?? 1),
    };

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: mapped,
      error: null,
      meta: null,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "TENANT_FETCH_ERROR",
        message: safeErrorMessage(err, "Tenant profile could not be loaded"),
      },
      meta: null,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { organizationLegalName, gstinRegistration, registeredAddress, operationalTimezone, baseCurrency, fiscalYearCycle } = body;
    const tenantId = ACTIVE_TENANT_ID;

    const model = (prisma as any).tenantProfile;
    let upserted: any = null;

    if (model?.upsert) {
      const existing = await model.findFirst();
      if (existing) {
        upserted = await model.update({
          where: { id: existing.id },
          data: {
            organizationLegalName,
            gstinRegistration,
            registeredAddress,
            operationalTimezone,
            baseCurrency,
            fiscalYearCycle,
          },
        });
      } else {
        upserted = await model.create({
          data: {
            tenantId,
            organizationLegalName: organizationLegalName || "REOS Pvt. Ltd.",
            gstinRegistration: gstinRegistration || "27AAAAA0000A1Z5",
            registeredAddress: registeredAddress || "Gangapur Road, Nashik, Maharashtra 422013",
            operationalTimezone: operationalTimezone || "Asia/Kolkata (IST)",
            baseCurrency: baseCurrency || "INR (₹)",
            fiscalYearCycle: fiscalYearCycle || "April - March (India)",
            activeUsersCount: 1,
            activeSiteAccountsCount: 1,
          },
        });
      }
    } else {
      try {
        await runtimeDdl("table:tenant_profiles", () => prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS tenant_profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            organization_legal_name VARCHAR(255) NOT NULL,
            gstin_registration VARCHAR(50) NOT NULL,
            registered_address TEXT NOT NULL,
            operational_timezone VARCHAR(100) NOT NULL,
            base_currency VARCHAR(50) NOT NULL,
            fiscal_year_cycle VARCHAR(100) NOT NULL,
            active_users_count INT NOT NULL DEFAULT 1,
            active_site_accounts_count INT NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        const raw = await prisma.$queryRaw<any[]>`SELECT * FROM tenant_profiles WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid LIMIT 1`;
        if (raw && raw.length > 0) {
          const updated = await prisma.$queryRaw<any[]>`
            UPDATE tenant_profiles
            SET organization_legal_name = ${organizationLegalName},
                gstin_registration = ${gstinRegistration},
                registered_address = ${registeredAddress},
                operational_timezone = ${operationalTimezone},
                base_currency = ${baseCurrency},
                fiscal_year_cycle = ${fiscalYearCycle},
                updated_at = NOW()
            WHERE id = ${raw[0].id}::uuid
            RETURNING *
          `;
          upserted = updated[0];
        } else {
          const inserted = await prisma.$queryRaw<any[]>`
            INSERT INTO tenant_profiles (
              tenant_id, organization_legal_name, gstin_registration,
              registered_address, operational_timezone, base_currency, fiscal_year_cycle
            ) VALUES (
              ${tenantId}::uuid, ${organizationLegalName || "REOS Pvt. Ltd."}, ${gstinRegistration || "27AAAAA0000A1Z5"},
              ${registeredAddress || "Gangapur Road, Nashik, Maharashtra 422013"}, ${operationalTimezone || "Asia/Kolkata (IST)"},
              ${baseCurrency || "INR (₹)"}, ${fiscalYearCycle || "April - March (India)"}
            )
            RETURNING *
          `;
          upserted = inserted[0];
        }
      } catch (err: unknown) {
        throw new Error(safeErrorMessage(err, "Organisation profile could not be saved"));
      }
    }

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: upserted.id,
        organizationLegalName: upserted.organizationLegalName || upserted.organization_legal_name,
        gstinRegistration: upserted.gstinRegistration || upserted.gstin_registration,
        registeredAddress: upserted.registeredAddress || upserted.registered_address,
        operationalTimezone: upserted.operationalTimezone || upserted.operational_timezone,
        baseCurrency: upserted.baseCurrency || upserted.base_currency,
        fiscalYearCycle: upserted.fiscalYearCycle || upserted.fiscal_year_cycle,
        activeUsersCount: Number(upserted.activeUsersCount ?? upserted.active_users_count ?? 1),
        activeSiteAccountsCount: Number(upserted.activeSiteAccountsCount ?? upserted.active_site_accounts_count ?? 1),
      },
      error: null,
      meta: null,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "TENANT_UPDATE_ERROR",
        message: safeErrorMessage(err, "Tenant profile could not be saved"),
      },
      meta: null,
    }, { status: 500 });
  }
}

