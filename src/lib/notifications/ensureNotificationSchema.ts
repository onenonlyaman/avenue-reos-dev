import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export interface SystemNotificationRecord {
  id: string;
  timestamp: string;
  src_module: string;
  user_type: string;
  type: "ALERT" | "APPROVAL_REQUEST" | "INFO" | "WORKFLOW_STEP" | "AI_AGENT_ACTION_REQUIRED";
  description: string;
  action_link: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  is_read: boolean;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export async function ensureNotificationSchema(tenantId: string = ACTIVE_TENANT_ID): Promise<void> {
  await runtimeDdl("table:notification_system_notifications_v1", async () => {
    await prisma.$executeRaw`CREATE SCHEMA IF NOT EXISTS notification;`;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS notification.system_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        src_module VARCHAR(100) NOT NULL,
        user_type VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('ALERT', 'APPROVAL_REQUEST', 'INFO', 'WORKFLOW_STEP', 'AI_AGENT_ACTION_REQUIRED')),
        description TEXT NOT NULL,
        action_link VARCHAR(1024) NOT NULL,
        priority VARCHAR(20) NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        tenant_id UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_notification_user ON notification.system_notifications (tenant_id, user_type, is_read);
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_notification_priority ON notification.system_notifications (tenant_id, priority);
    `;
  });

  // Seed default operational notifications for the active tenant if empty
  const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count FROM notification.system_notifications WHERE tenant_id = ${tenantId}::uuid
  `;

  if (countResult[0]?.count === BigInt(0)) {
    await prisma.$executeRaw`
      INSERT INTO notification.system_notifications (
        tenant_id, src_module, user_type, type, description, action_link, priority, is_read, timestamp
      ) VALUES
      (
        ${tenantId}::uuid, 'Sales', 'ALL', 'APPROVAL_REQUEST',
        'Gangapur Road Flat #402 reservation requires authorization for 5% pricing discount.',
        '/crm', 'HIGH', false, NOW() - INTERVAL '10 minutes'
      ),
      (
        ${tenantId}::uuid, 'Procurement', 'ALL', 'APPROVAL_REQUEST',
        'Purchase Order #PO-4412 (₹35,00,000) for Grade 53 Structural Cement awaiting executive authorization.',
        '/procurement', 'CRITICAL', false, NOW() - INTERVAL '25 minutes'
      ),
      (
        ${tenantId}::uuid, 'Construction', 'ALL', 'WORKFLOW_STEP',
        'Daily Progress Report submitted for Pathardi Phata Site, Tower B, Floor 14.',
        '/construction', 'MEDIUM', true, NOW() - INTERVAL '1 hour'
      ),
      (
        ${tenantId}::uuid, 'Finance', 'ALL', 'ALERT',
        'Tally Ledger Reconciliation: GST Input Tax Credit discrepancy flagged on vendor invoice batch #49.',
        '/finance', 'HIGH', false, NOW() - INTERVAL '2 hours'
      );
    `;
  }
}
