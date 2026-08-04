"use client";

import { useCallback, useEffect, useState } from "react";

export interface CatalogOption {
  id: string;
  category: string;
  optionValue: string;
  sortOrder: number;
}

export function useCatalogOptions(category: string) {
  const [options, setOptions] = useState<CatalogOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/v1/settings/catalog?category=${encodeURIComponent(category)}`);
      const envelope = await res.json();
      if (envelope.success && Array.isArray(envelope.data)) {
        setOptions(envelope.data);
      } else {
        setOptions([]);
      }
    } catch {
      setOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  return { options, values: options.map((o) => o.optionValue), isLoading, reload: load };
}
