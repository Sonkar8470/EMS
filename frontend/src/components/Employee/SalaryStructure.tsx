import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconBone, IconDownload, IconEye } from "@tabler/icons-react";

export default function SalaryStructure() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Salary Structure</h1>
          <p className="text-muted-foreground">
            View your salary details and payslips.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">Current Month</Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconBone className="h-5 w-5" />
              Salary Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Basic Salary</label>
                <p className="text-lg font-semibold">₹45,000</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">HRA</label>
                <p className="text-lg font-semibold">₹18,000</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">DA</label>
                <p className="text-lg font-semibold">₹9,000</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total</label>
                <p className="text-lg font-semibold text-primary">₹72,000</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Payslips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">September 2024</p>
                <p className="text-sm text-muted-foreground">₹72,000</p>
              </div>
              <div className="flex gap-2">
                <IconEye className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary" />
                <IconDownload className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary" />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">August 2024</p>
                <p className="text-sm text-muted-foreground">₹72,000</p>
              </div>
              <div className="flex gap-2">
                <IconEye className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary" />
                <IconDownload className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              More payslips will be available here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
