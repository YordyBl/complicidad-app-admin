"use client"

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const data = [
  { category: "Groceries", demand: 2400, supply: 2200 },
  { category: "Dairy", demand: 1800, supply: 1900 },
  { category: "Snacks", demand: 1600, supply: 1400 },
  { category: "Beverages", demand: 2200, supply: 2100 },
  { category: "Personal Care", demand: 1200, supply: 1300 },
  { category: "Household", demand: 800, supply: 900 },
]

export function DemandChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="category" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="demand" fill="#f59e0b" name="Demand" />
        <Bar dataKey="supply" fill="#6366f1" name="Supply" />
      </BarChart>
    </ResponsiveContainer>
  )
}
