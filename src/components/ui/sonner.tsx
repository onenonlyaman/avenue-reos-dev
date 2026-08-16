"use client";

import React from "react";

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

// Lightweight, zero-dependency toast notification dispatcher
export function toast({ title, description, variant }: ToastOptions) {
  if (typeof window === "undefined") return;

  const toastContainerId = "avenue-toast-container";
  let container = document.getElementById(toastContainerId);

  if (!container) {
    container = document.createElement("div");
    container.id = toastContainerId;
    container.className = "fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none";
    document.body.appendChild(container);
  }

  const toastEl = document.createElement("div");
  const isDestructive = variant === "destructive";

  toastEl.className = `pointer-events-auto flex flex-col gap-1 p-3.5 rounded-xl border shadow-lg transition-all transform duration-200 translate-y-2 opacity-0 max-w-sm text-xs ${
    isDestructive
      ? "bg-rose-950/95 text-rose-100 border-rose-800"
      : "bg-card/95 text-card-foreground border-border"
  }`;

  if (title) {
    const titleEl = document.createElement("div");
    titleEl.className = "font-bold text-xs";
    titleEl.innerText = title;
    toastEl.appendChild(titleEl);
  }

  if (description) {
    const descEl = document.createElement("div");
    descEl.className = "text-[11px] opacity-90";
    descEl.innerText = description;
    toastEl.appendChild(descEl);
  }

  container.appendChild(toastEl);

  requestAnimationFrame(() => {
    toastEl.classList.remove("translate-y-2", "opacity-0");
  });

  setTimeout(() => {
    toastEl.classList.add("opacity-0", "translate-y-2");
    setTimeout(() => {
      if (toastEl.parentNode) {
        toastEl.parentNode.removeChild(toastEl);
      }
    }, 250);
  }, 4000);
}
