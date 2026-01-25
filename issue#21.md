This is a **Medium (150 pts)** task. I will provide the code to implement **Issue #21 (Friendbot Integration)**.

This feature is critical for onboarding because it allows users to get free Testnet tokens (XLM) without leaving your application.

### Step 1: Create the Friendbot Service

Create `lib/friendbot.ts`. This handles the actual API call to the Stellar Friendbot service.

```typescript
// lib/friendbot.ts
import { toast } from "sonner";

export async function fundAccount(publicKey: string) {
  try {
    const response = await fetch(
      `https://friendbot.stellar.org/?addr=${encodeURIComponent(publicKey)}`,
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to fund account");
    }

    return data;
  } catch (error: any) {
    console.error("Friendbot error:", error);
    throw new Error(error.message || "Network error connecting to Friendbot");
  }
}
```

### Step 2: Create the UI Component

We want a button that is smart: it should only appear if the user is on **Testnet** (Friendbot doesn't exist on Mainnet) and ideally only if they need funds.

Create `components/fund-account-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useWallet } from "@/store/useWallet";
import { useNetworkStore } from "@/store/useNetworkStore";
import { fundAccount } from "@/lib/friendbot";
import { Button } from "@/components/ui/button";
import { Loader2, Coins } from "lucide-react";
import { toast } from "sonner";

export function FundAccountButton() {
  const { address, isConnected } = useWallet();
  const { currentNetwork } = useNetworkStore();
  const [isLoading, setIsLoading] = useState(false);

  // Friendbot is only available on Testnet (and sometimes Futurenet)
  const isTestnet =
    currentNetwork === "testnet" || currentNetwork === "futurenet";

  if (!isConnected || !address || !isTestnet) {
    return null;
  }

  const handleFund = async () => {
    setIsLoading(true);
    const toastId = toast.loading("Requesting funds from Friendbot...");

    try {
      await fundAccount(address);
      toast.success("Account funded! You received 10,000 XLM.", {
        id: toastId,
      });

      // Optional: Refresh the page to update balances immediately
      // A better way is to trigger a refetch in your Dashboard component via a shared signal
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      toast.error(`Funding failed: ${error.message}`, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="secondary"
      onClick={handleFund}
      disabled={isLoading}
      className="gap-2 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Coins className="h-4 w-4" />
      )}
      {isLoading ? "Funding..." : "Get Testnet XLM"}
    </Button>
  );
}
```

### Step 3: Integrate into Dashboard

Add this button to your Dashboard page, typically right next to the "Connect Wallet" button or near the Balance Card.

Open `app/dashboard/page.tsx` (or your main `page.tsx`) and add it.

```tsx
// app/dashboard/page.tsx
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
```

### Verification

1. Switch your Network Switcher (Issue #3) to **Testnet**.
2. Connect a wallet (Issue #2).
3. You should see the **"Get Testnet XLM"** button appear in the top right.
4. Click it. You should see a loading spinner.
5. After ~2-4 seconds, you should get a success toast, and your balance should increase by 10,000 XLM.
6. Switch to **Mainnet**. The button should disappear (safety feature).
