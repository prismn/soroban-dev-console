import { FundAccountButton } from "@/components/fund-account-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// ... other imports

export default function Dashboard() {
  // ... existing code

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Welcome / Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your Stellar account and network activity.
          </p>
        </div>

        {/* NEW: Add the button here */}
        <FundAccountButton />
      </div>

      {/* ... Rest of your dashboard ... */}
    </div>
  );
}
