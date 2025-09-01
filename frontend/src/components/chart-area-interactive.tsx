"use client"

import { useState } from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const chartData = [
  { date: "2024-01-01", present: 85, leave: 10, wfh: 15 },
  { date: "2024-01-02", present: 88, leave: 8, wfh: 12 },
  { date: "2024-01-03", present: 90, leave: 5, wfh: 18 },
  { date: "2024-01-04", present: 82, leave: 12, wfh: 20 },
  { date: "2024-01-05", present: 87, leave: 9, wfh: 16 },
  { date: "2024-01-08", present: 89, leave: 7, wfh: 14 },
  { date: "2024-01-09", present: 91, leave: 6, wfh: 13 },
]

const chartConfig = {
  present: {
    label: "Present",
    color: "hsl(var(--chart-1))",
  },
  leave: {
    label: "Leave",
    color: "hsl(var(--chart-2))",
  },
  wfh: {
    label: "WFH",
    color: "hsl(var(--chart-3))",
  },
}

export function ChartAreaInteractive() {
  const [timeRange, setTimeRange] = useState("7d")

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const now = new Date()
    let daysToSubtract = 7
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "90d") {
      daysToSubtract = 90
    }
    now.setDate(now.getDate() - daysToSubtract)
    return date >= now
  })

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Employee Attendance Overview</CardTitle>
          <CardDescription>
            Showing attendance trends for the selected period
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="w-[160px] rounded-lg sm:ml-auto"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Last 7 days" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="7d" className="rounded-lg">
              Last 7 days
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              Last 30 days
            </SelectItem>
            <SelectItem value="90d" className="rounded-lg">
              Last 90 days
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillPresent" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-present)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-present)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillLeave" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-leave)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-leave)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillWfh" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-wfh)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-wfh)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="wfh"
              type="natural"
              fill="url(#fillWfh)"
              stroke="var(--color-wfh)"
              stackId="a"
            />
            <Area
              dataKey="leave"
              type="natural"
              fill="url(#fillLeave)"
              stroke="var(--color-leave)"
              stackId="a"
            />
            <Area
              dataKey="present"
              type="natural"
              fill="url(#fillPresent)"
              stroke="var(--color-present)"
              stackId="a"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
