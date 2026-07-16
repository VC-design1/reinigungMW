"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CHART_COLORS = {
  blue: "#2a78d6",
  aqua: "#1baf7a",
  orange: "#eb6834",
};

const CHROME = {
  grid: "#e1e0d9",
  axis: "#898781",
  text: "#52514e",
};

export interface BarDatum {
  label: string;
  value: number;
}

function SingleSeriesBarChart({
  data,
  color,
  unit,
  height = 220,
}: {
  data: BarDatum[];
  color: string;
  unit: string;
  height?: number;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-400">Keine Daten für den gewählten Zeitraum.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHROME.grid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: CHROME.text, fontSize: 12 }}
          axisLine={{ stroke: CHROME.axis }}
          tickLine={false}
        />
        <YAxis tick={{ fill: CHROME.text, fontSize: 12 }} axisLine={false} tickLine={false} width={36} />
        <Tooltip
          cursor={{ fill: "rgba(11,11,11,0.04)" }}
          formatter={(value) => [`${value} ${unit}`, ""]}
          contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e1e0d9" }}
        />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={48}>
          <LabelList dataKey="value" position="top" style={{ fill: CHROME.text, fontSize: 11 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function UtilizationChart({ data }: { data: BarDatum[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Auslastung pro Reinigungskraft</CardTitle>
      </CardHeader>
      <CardContent>
        <SingleSeriesBarChart data={data} color={CHART_COLORS.blue} unit="Reinigungen" />
      </CardContent>
    </Card>
  );
}

export function DurationChart({ data }: { data: BarDatum[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ø Reinigungsdauer pro Reinigungskraft</CardTitle>
      </CardHeader>
      <CardContent>
        <SingleSeriesBarChart data={data} color={CHART_COLORS.aqua} unit="Min." />
      </CardContent>
    </Card>
  );
}

export function DamageRateChart({ data }: { data: BarDatum[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Schadensquote pro Wohnung</CardTitle>
      </CardHeader>
      <CardContent>
        <SingleSeriesBarChart data={data} color={CHART_COLORS.orange} unit="%" />
      </CardContent>
    </Card>
  );
}
