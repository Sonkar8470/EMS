import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis } from "recharts"

const data = [
  { name: "Mon", hours: 8 },
  { name: "Tue", hours: 7.5 },
  { name: "Wed", hours: 8.2 },
  { name: "Thu", hours: 8.5 },
  { name: "Fri", hours: 7.8 },
  { name: "Sat", hours: 0 },
  { name: "Sun", hours: 0 },
]

const chartConfig = {
  hours: {
    label: "Hours",
    color: "hsl(var(--chart-1))",
  },
}

interface EmployeeChartsProps {
  employeeId: string
}

export default function EmployeeCharts({ employeeId: _employeeId }: EmployeeChartsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Hours</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px]">
          <BarChart data={data} width={356} height={200}>
            <XAxis dataKey="name" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="hours" fill="var(--color-hours)" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
