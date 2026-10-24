"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Product, ProductVariant } from "@/data/products";
import { availableStock, maxOrderQty, variantPrice } from "@/data/products";

export interface CartLine {
  /** product id + variant id/label — the same shirt in two sizes is two lines. */
  key: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  /** Null when the product has no variant at all. */
  variant: string | null;
  /** Set only for the new multi-attribute variant system; null for the
   *  legacy single-axis one (or no variant), where `variant` is free text. */
  variant_id: string | null;
  image: string | null;
  stock_type: "ready_stock" | "pre_order";
  unit_price: number;
  qty: number;
  /** Cap from stock or remaining pre-order quota at the time of adding. */
  max_qty: number;
}

interface CartValue {
  lines: CartLine[];
  itemCount: number;
  total: number;
  /** False until the stored cart has been read, so SSR and first paint agree. */
  ready: boolean;
  add: (
    product: Product,
    variant: ProductVariant | null,
    legacyVariant: string | null,
    qty: number
  ) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartValue | null>(null);
const STORAGE_KEY = "hima_cart_v1";

export function lineKey(productId: string, variantIdOrLabel: string | null) {
  return `${productId}::${variantIdOrLabel ?? ""}`;
}

/** How many of this product (or one of its variants) can still be ordered right now. */
export function availableFor(
  product: Product,
  variant?: ProductVariant | null
): number {
  if (product.stock_type === "pre_order") {
    const open =
      product.po_deadline && new Date(product.po_deadline) > new Date();
    if (!open) return 0;
  }
  return maxOrderQty(product, availableStock(product, variant));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  // Read once on mount. localStorage cannot be read while rendering on the
  // server, and seeding it lazily in useState would make the first client
  // paint disagree with the server markup — so hydrating in an effect and
  // gating on `ready` is the correct shape here, not a cascading render.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
    } catch {
      /* corrupt or unavailable storage — start empty */
    }
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* quota or private mode — the cart just won't survive a reload */
    }
  }, [lines, ready]);

  const add = useCallback(
    (
      product: Product,
      variant: ProductVariant | null,
      legacyVariant: string | null,
      qty: number
    ) => {
      const key = lineKey(product.id, variant?.id ?? legacyVariant);
      const max = availableFor(product, variant);
      const label = variant?.label ?? legacyVariant;
      const price = variantPrice(product, variant);
      const image = variant?.image || product.images.find((i) => i.url)?.url || null;

      setLines((prev) => {
        const existing = prev.find((l) => l.key === key);
        if (existing) {
          return prev.map((l) =>
            l.key === key
              ? { ...l, qty: Math.min(max, l.qty + qty), max_qty: max }
              : l
          );
        }
        return [
          ...prev,
          {
            key,
            product_id: product.id,
            product_name: product.name,
            product_slug: product.slug,
            variant: label,
            variant_id: variant?.id ?? null,
            image,
            stock_type: product.stock_type,
            unit_price: price,
            qty: Math.min(max, qty),
            max_qty: max,
          },
        ];
      });
    },
    []
  );

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) =>
      prev.flatMap((l) =>
        l.key === key
          ? qty <= 0
            ? []
            : [{ ...l, qty: Math.min(l.max_qty || qty, qty) }]
          : [l]
      )
    );
  }, []);

  const remove = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartValue>(() => {
    const itemCount = lines.reduce((s, l) => s + l.qty, 0);
    const total = lines.reduce((s, l) => s + l.qty * l.unit_price, 0);
    return { lines, itemCount, total, ready, add, setQty, remove, clear };
  }, [lines, ready, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
