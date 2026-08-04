"use client";

import React from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CorporateEmptyState } from "@/components/core/CorporateEmptyState";
import { BookingTrendPoint } from "@/services/dashboardApi";
import { LineChart } from "lucide-react";

interface BookingMomentumChartProps {
  data: BookingTrendPoint[];
}

function formatPeriod(period: string): string {
  const [year, month] = period.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

export function BookingMomentumChart({ data }: BookingMomentumChartProps) {
  const points = data.map((point) => ({
    label: formatPeriod(point.period),
    bookedValueCr: point.bookedValueCr,
    bookings: point.bookings,
  }));

  const totalValue = data.reduce((sum, point) => sum + point.bookedValueCr, 0);
  const totalBookings = data.reduce((sum, point) => sum + point.bookings, 0);

  return (
    <div className="rounded-lg border border-border bg-card shadow-xs p-4 h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
        <h3 className="text-sm font-bold font-heading text-foreground">Booking Momentum</h3>
        <div className="text-right">
          <div className="text-lg font-bold font-mono text-foreground leading-tight">
            ₹{totalValue.toFixed(2)} Cr
          </div>
          <div className="text-[11px] text-muted-foreground">{totalBookings} bookings recorded</div>
        </div>
      </div>

      {points.length === 0 ? (
        <CorporateEmptyState
          title="No Bookings Recorded"
          description="Booked consideration appears here once sales bookings are raised."
          icon={LineChart}
        />
      ) : (
        <div className="flex-1 min-h-56 pt-4">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={points} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="bookingValueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickFormatter={(value: number) => `₹${value}Cr`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                formatter={(value) => [`₹${Number(value ?? 0)} Cr`, "Booked Value"]}
              />
              <Area
                type="monotone"
                dataKey="bookedValueCr"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#bookingValueFill)"
                dot={{ r: 3, fill: "var(--color-primary)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
