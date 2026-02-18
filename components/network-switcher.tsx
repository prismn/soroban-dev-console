'use client';

import { useState, useEffect } from 'react';
import { useNetworkStore } from '@/store/useNetworkStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, AlertTriangle, Wifi, Settings } from 'lucide-react';
import Link from 'next/link';

export function NetworkSwitcher() {
  const { currentNetwork, setNetwork, getAllNetworks } = useNetworkStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const allNetworks = getAllNetworks();
  const activeNet = allNetworks.find(n => n.id === currentNetwork) || allNetworks[0];

  const handleSwitch = (id: string) => {
    setNetwork(id);
    window.location.reload();
  };

  const getNetworkColor = (id: string) => {
    if (id.includes('custom')) return 'bg-blue-500';
    switch (id) {
      case 'mainnet': return 'bg-green-500';
      case 'testnet': return 'bg-orange-500';
      case 'futurenet': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  if (!isMounted) {
    return <Skeleton className="h-9 w-[140px] rounded-md" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 min-w-[140px] justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${getNetworkColor(activeNet.id)}`} />
            <span className="font-medium hidden sm:inline-block truncate max-w-[100px]">
              {activeNet.name}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {allNetworks.map((network) => (
          <DropdownMenuItem
            key={network.id}
            onClick={() => handleSwitch(network.id)}
            className="gap-2 cursor-pointer"
          >
            <div className={`h-2 w-2 rounded-full ${getNetworkColor(network.id)}`} />
            <span className="truncate max-w-[150px]">{network.name}</span>
            {currentNetwork === network.id && (
              <Wifi className="h-3 w-3 ml-auto opacity-50" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer gap-2 flex items-center w-full">
            <Settings className="h-3 w-3" />
            Manage Networks
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}