"use client";

import React from "react";
import { StudentLoader } from "./StudentLoader/StudentLoader";
import { useLoaderStore } from "@/stores/useLoaderStore";

export const GlobalLoader = () => {
  const { isVisible, stopLoading } = useLoaderStore();

  return (
    <StudentLoader 
      isVisible={isVisible} 
      onComplete={stopLoading} 
    />
  );
};
