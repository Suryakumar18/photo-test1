"use client";

import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const uploadData = Array.from({ length: 12 }, (_, i) => ({
  month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
  photos: Math.floor(Math.random() * 5000) + 1000,
  events: Math.floor(Math.random() * 20) + 5,
}));

const visitorData = Array.from({ length: 30 }, (_, i) => ({
  date: `Day ${i + 1}`,
  visitors: Math.floor(Math.random() * 300) + 50,
  faceMatches: Math.floor(Math.random() * 80) + 10,
}));

const storageData = [
  { name: "Photos", value: 68, color: "#F43F5E" },
  { name: "Videos", value: 22, color: "#8B5CF6" },
  { name: "Thumbnails", value: 7, color: "#F59E0B" },
  { name: "Other", value: 3, color: "#6B7280" },
];

const topEvents = [
  { name: "Priya & Arjun Wedding", photos: 847, visitors: 423, faceMatches: 89 },
  { name: "Meera & Rohan Wedding", photos: 634, visitors: 312, faceMatches: 67 },
  { name: "Kavitha & Suresh Reception", photos: 521, visitors: 267, faceMatches: 45 },
  { name: "Nisha & Raj Engagement", photos: 389, visitors: 198, faceMatches: 32 },
  { name: "Divya & Kiran Wedding", photos: 756, visitors: 387, faceMatches: 78 },
];

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Analytics" subtitle="Insights and performance metrics" />

      <div className="p-6 space-y-6">
        {/* KPI Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Photos", value: "12,847", change: "+23%", color: "text-rose-500" },
            { label: "Total Events", value: "47", change: "+8%", color: "text-violet-500" },
            { label: "Face Matches", value: "3,421", change: "+35%", color: "text-blue-500" },
            { label: "Avg Load Time", value: "0.8s", change: "-12%", color: "text-green-500" },
          ].map((kpi, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="border border-border/50">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className={`text-xs font-medium mt-1 ${kpi.color}`}>{kpi.change} this month</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly overview */}
          <Card className="border border-border/50 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Monthly Photos & Events</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={uploadData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="photos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Photos" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Storage breakdown */}
          <Card className="border border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Storage Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={storageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {storageData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value}%`]}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {storageData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Visitor trend */}
        <Card className="border border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Visitor & Face Match Trends (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={visitorData} margin={{ left: -20 }}>
                <defs>
                  <linearGradient id="visitorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="matchGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  interval={5}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="visitors"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  fill="url(#visitorGrad)"
                  name="Visitors"
                />
                <Area
                  type="monotone"
                  dataKey="faceMatches"
                  stroke="#F43F5E"
                  strokeWidth={2}
                  fill="url(#matchGrad)"
                  name="Face Matches"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Events Table */}
        <Card className="border border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Top Performing Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 pr-4 text-muted-foreground font-medium">Event</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Photos</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Visitors</th>
                    <th className="text-right py-3 pl-4 text-muted-foreground font-medium">Face Matches</th>
                  </tr>
                </thead>
                <tbody>
                  {topEvents.map((event, i) => (
                    <motion.tr
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                            {i + 1}
                          </span>
                          {event.name}
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 font-medium">{event.photos.toLocaleString()}</td>
                      <td className="text-right py-3 px-4 text-muted-foreground">{event.visitors.toLocaleString()}</td>
                      <td className="text-right py-3 pl-4">
                        <Badge variant="rose" className="text-xs">{event.faceMatches}</Badge>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
