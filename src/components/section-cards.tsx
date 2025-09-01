import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState,useEffect } from "react";

export function SectionCards() {
  const [employeecount ,setEmployeeCount]=useState(0);

  useEffect(()=>{
    fetch("http://localhost:3001/users")
    .then((res)=>res.json())
    .then((users)=>{
      const count =users.filter((user: { role: string; })=>user.role ==="employee").length;
      setEmployeeCount(count);
    })
    .catch((err)=>{
      console.log("Error fetching users:",err);
    })
  },[]);

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex text-2xl justify-center">
            Total Employee
          </CardDescription>
          <CardTitle className="flex text-3xl justify-center font-semibold tabular-nums @[250px]/card:text-3xl">
            {employeecount}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex text-2xl justify-center">
            New Customers
          </CardDescription>
          <CardTitle className="flex text-3xl justify-center  font-semibold tabular-nums @[250px]/card:text-3xl">
            3
          </CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex text-2xl justify-center">
            Active Accounts
          </CardDescription>
          <CardTitle className="flex text-3xl justify-center  font-semibold tabular-nums @[250px]/card:text-3xl">
            45,678
          </CardTitle>
          <CardAction></CardAction>
        </CardHeader>
      </Card>
    </div>
  );
}
