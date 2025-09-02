import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconCalendar, IconPlus } from "@tabler/icons-react";

export default function LeaveManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Management</h1>
          <p className="text-muted-foreground">
            Apply for leaves and view leave history.
          </p>
        </div>
        <Button>
          <IconPlus className="mr-2 h-4 w-4" />
          Apply Leave
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leave Application</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Leave application functionality will be implemented here.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <IconCalendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Select leave dates</span>
              </div>
              <div className="flex items-center gap-2">
                <IconCalendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Choose leave type</span>
              </div>
              <div className="flex items-center gap-2">
                <IconCalendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Submit for approval</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your leave history will be displayed here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
