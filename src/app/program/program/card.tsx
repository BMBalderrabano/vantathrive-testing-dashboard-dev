'use client';

import Image from 'next/image';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Copy, Trash2 } from 'lucide-react';
import { useQaContext } from '@/context/qa-context';
import { programAssignmentsKeys } from '@/hooks/use-passignments';
import type { ProgramAssignmentWithTemplate } from '@/lib/supabase/schemas/program-assignments';
import {
  QuickAssignDialog,
  QuickDeassignDialog,
} from './quick-assign-dialogs';

interface ProgramTemplateCardProps {
  assignment: ProgramAssignmentWithTemplate;
  organizationName?: string;
  onClick: () => void;
  onDelete?: () => void;
  onClone?: () => void;
}

export function ProgramTemplateCard({
  assignment,
  organizationName,
  onClick,
  onDelete,
  onClone,
}: ProgramTemplateCardProps) {
  const queryClient = useQueryClient();
  const { selectedUserId, selectedOrgId, users } = useQaContext();
  const template = assignment.program_template;

  if (!template) {
    return null;
  }

  const invalidateAssignments = () => {
    void queryClient.invalidateQueries({
      queryKey: programAssignmentsKeys.lists(),
    });
  };

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete();
    }
  };

  const getImageUrl = (): string | null => {
    if (!template.image_url) {
      return null;
    }

    // Handle image_url as Json - could be string or object
    if (typeof template.image_url === 'string') {
      return template.image_url;
    }

    // Database constraint requires: { image_url: string, blur_hash: string }
    if (
      typeof template.image_url === 'object' &&
      template.image_url !== null &&
      'image_url' in template.image_url
    ) {
      return String(template.image_url.image_url);
    }

    return null;
  };

  const imageUrl = getImageUrl();

  // Extract user info for active assignments
  const profiles = assignment.profiles as
    | {
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
      }
    | null
    | undefined;
  const assignedToLabel = profiles
    ? profiles.email?.trim() ||
      [profiles.first_name, profiles.last_name].filter(Boolean).join(' ') ||
      'Unknown User'
    : null;
  const isActive = assignment.status === 'active';

  return (
    <Card
      onClick={onClick}
      className="h-full flex flex-col gap-0 group overflow-hidden border border-border/60 hover:border-primary/40 hover:shadow-(--shadow-lg) transition-all duration-300 cursor-pointer relative"
    >
      {/* Delete / Clone Buttons */}
      {(onDelete || onClone) && (
        <div
          className="absolute top-2 right-2 z-10 flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {onClone && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-semibold cursor-pointer bg-background/80 backdrop-blur-sm shadow-(--shadow-sm) text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClone();
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clone</p>
              </TooltipContent>
            </Tooltip>
          )}
          {onDelete && (
            <DeleteConfirmationDialog
              title="Delete Program"
              description={`Are you sure you want to delete "${template.name}"? This action cannot be undone.`}
              onConfirm={handleDelete}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 font-semibold cursor-pointer bg-background/80 backdrop-blur-sm shadow-(--shadow-sm)"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
            />
          )}
        </div>
      )}

      {/* Template Image */}
      <div className="relative aspect-4/3 overflow-hidden bg-linear-to-br from-muted to-background">
        {imageUrl ? (
          <Image
            src={imageUrl}
            fill
            alt={template.name}
            className="object-cover group-hover:scale-115 transition-transform duration-300"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-muted to-background">
            <span className="text-muted-foreground text-sm font-medium">
              {template.weeks}w program
            </span>
          </div>
        )}
      </div>

      {/* Template Info */}
      <CardContent className="flex-1 flex flex-col p-5 bg-linear-to-b from-muted/40 to-background">
        <h3 className="font-semibold text-foreground text-base mb-3 line-clamp-2 leading-tight">
          {template.name}
        </h3>

        {template.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {template.description}
          </p>
        )}

        {isActive && assignedToLabel && (
          <div className="text-sm text-muted-foreground mb-3">
            Assigned to:{' '}
            <span className="font-medium text-foreground">{assignedToLabel}</span>
          </div>
        )}

        <div className="space-y-2 mt-auto">
          <div className="flex items-center gap-2 flex-wrap">
            {organizationName && (
              <Badge variant="outline">{organizationName}</Badge>
            )}
            <Badge variant="secondary">
              {template.weeks} {template.weeks === 1 ? 'week' : 'weeks'}
            </Badge>
            {template.goals && (
              <Badge variant="outline" className="text-muted-foreground">
                {template.goals}
              </Badge>
            )}
          </div>
          <div
            className="flex justify-end pt-2"
            onClick={(e) => e.stopPropagation()}
          >
            {isActive ? (
              <QuickDeassignDialog
                targetUserId={assignment.user_id ?? (selectedUserId || null)}
                users={users}
                assignedProfile={profiles}
                onSuccess={invalidateAssignments}
              />
            ) : (
              <QuickAssignDialog
                programName={template.name}
                programTemplateId={template.id}
                organizationId={selectedOrgId ?? assignment.organization_id}
                selectedUserId={selectedUserId}
                users={users}
                onSuccess={invalidateAssignments}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
