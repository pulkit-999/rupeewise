'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { Avatar } from '@/components/ui/Avatar';
import { format } from 'date-fns';
import { Receipt, Scale, Users, History, FileText } from 'lucide-react';

export default function ActivityPage() {
  const { activities } = useAppStore();

  const iconMap: Record<string, any> = {
    expense: Receipt,
    settlement: Scale,
    group: Users,
    friend: Users,
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          Activity Log
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-semibold">
            {activities.length}
          </span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Detailed audit trail of all bills, payments, group updates, and comments.
        </p>
      </div>

      <div className="space-y-3">
        {activities.map((act) => {
          const Icon = iconMap[act.entity_type] || FileText;

          return (
            <div
              key={act.id}
              className="p-4 rounded-xl border border-border/80 bg-card hover:bg-muted/30 transition-all flex items-start gap-3.5 shadow-2xs"
            >
              <Avatar src={act.user?.avatar_url} name={act.user?.full_name || 'U'} size="md" />

              <div className="flex-1 min-w-0 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-sm text-foreground truncate">
                    {act.details.title}
                  </h4>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {act.created_at ? format(new Date(act.created_at), 'dd MMM yyyy, HH:mm') : ''}
                  </span>
                </div>

                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  {act.details.description}
                </p>

                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                  <span className="capitalize font-semibold text-foreground">
                    Action: {act.action}
                  </span>
                  <span>•</span>
                  <span>Entity: {act.entity_type}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
