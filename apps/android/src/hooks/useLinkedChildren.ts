/**
 * Orchestrates linked-children data for the parent portal.
 * Mirrors useEnrollmentData.ts from the partner portal.
 */
import { useCallback, useEffect } from "react";
import { useApi } from "./useApi";
import { useParentId } from "./useParentId";
import { useRefreshOnFocus } from "./useRefreshOnFocus";
import { parentService } from "../services/parentService";
import { parentStore } from "../store/useParentStore";
import type { LinkedChild } from "../types/parent";

export interface LinkedChildrenData {
  children: LinkedChild[];
  approvedChildren: LinkedChild[];
  pendingChildren: LinkedChild[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useLinkedChildren(): LinkedChildrenData {
  const parentId = useParentId();

  const fetchChildren = useCallback(
    (_signal: AbortSignal) =>
      parentId
        ? parentService.fetchLinkedStudents(parentId)
        : Promise.resolve<LinkedChild[]>([]),
    [parentId]
  );

  const { data, loading, error, refetch } = useApi(fetchChildren, [parentId]);

  useRefreshOnFocus(refetch);

  const children = data ?? [];
  const approvedChildren = children.filter((c) => c.status === "APPROVED");
  const pendingChildren  = children.filter((c) => c.status === "PENDING");

  /* Seed selectedChildId to the first approved child on first load */
  useEffect(() => {
    if (approvedChildren.length > 0 && !parentStore.get().selectedChildId) {
      parentStore.setSelectedChildId(approvedChildren[0].id);
    }
  }, [approvedChildren.length]);

  return { children, approvedChildren, pendingChildren, loading, error, refetch };
}
