'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { format } from 'date-fns';
import { Avatar } from '@/components/ui/Avatar';
import { Receipt, Scale, Users, History } from 'lucide-react';
import { formatINR } from '@/lib/currency';

export function RecentActivity() {
  const { activities } = useAppStore();

  const iconMap: Record<string, any> = {
    expense: Receipt,
    settlement: Scale,
    group: Users,
    friend: Users,
  };

  if (!activities || activities.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
        No recent activity logged yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.slice(0, 8).map((act) => {
        const Icon = iconMap[act.entity_type] || History;

        return (
          <div
            key={act.id}
            className="flex items-start gap-3 p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/30 transition-colors"
          >
            <div className="mt-0.5">
              <Avatar src={act.user?.avatar_url} name={act.user?.full_name || 'User'} size="sm" />
            </div>

            <div className="flex-1 min-w-0 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-foreground truncate">
                  {act.details.title}
                </span>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {act.created_at ? format(new Date(act.created_at), 'dd MMM, HH:mm') : ''}
                </span>
              </div>
              <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
                {act.details.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
