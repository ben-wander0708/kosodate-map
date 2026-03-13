"use client";

import { useContext } from "react";
import { LiffContext } from "@/components/providers/LiffProvider";

export function useLiff() {
  return useContext(LiffContext);
}
