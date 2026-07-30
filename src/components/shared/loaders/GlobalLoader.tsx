"use client";

import React from "react";
import { LoaderJourney } from "./LoaderJourney/LoaderJourney";
import { useLoaderStore } from "@/stores/useLoaderStore";

export const GlobalLoader = () => {
  const { isVisible, isComplete, isHandoff, onCelebrated, stopLoading } = useLoaderStore();

  return (
    <LoaderJourney
      isVisible={isVisible}
      isComplete={isComplete}
      isHandoff={isHandoff}
      onCelebrated={onCelebrated ?? undefined}
      onFinished={stopLoading}
    />
  );
};
