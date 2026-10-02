"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import type { CartItem, Customization } from "@/types/commerce";
import { cartTotals } from "@/lib/pricing";
import { buildLineId } from "./line-id";

const KEY = "atelier.cart.v1";
const MAX_QTY = 10;

type NewItem = Omit<CartItem, "id">;

type Action =
  | { type: "hydrate"; items: CartItem[] }
  | { type: "add"; item: NewItem }
  | { type: "replace"; id: string; item: NewItem }
  | { type: "qty"; id: string; quantity: number }
  | { type: "remove"; id: string }
  | { type: "clear" };

const lineId = (i: NewItem) => buildLineId(i.variantId, i.customization);

function reducer(items: CartItem[], a: Action): CartItem[] {
  switch (a.type) {
    case "hydrate":
      return a.items;
    case "add": {
      const id = lineId(a.item);
      const hit = items.find((i) => i.id === id);
      if (hit) return items.map((i) => (i.id === id ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + a.item.quantity) } : i));
      return [...items, { ...a.item, id }];
    }
    case "replace": {
      const id = lineId(a.item);
      const old = items.find((i) => i.id === a.id);
      const rest = items.filter((i) => i.id !== a.id);
      const merged = rest.find((i) => i.id === id);
      if (merged) return rest.map((i) => (i.id === id ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + a.item.quantity) } : i));
      // keep the original position in the bag
      const idx = old ? items.indexOf(old) : rest.length;
      const next = [...rest];
      next.splice(idx, 0, { ...a.item, id });
      return next;
    }
    case "qty":
      return items.map((i) => (i.id === a.id ? { ...i, quantity: Math.max(1, Math.min(MAX_QTY, a.quantity)) } : i));
    case "remove":
      return items.filter((i) => i.id !== a.id);
    case "clear":
      return [];
  }
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  totals: ReturnType<typeof cartTotals>;
  hydrated: boolean;
  add: (item: NewItem) => void;
  replace: (id: string, item: NewItem) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(reducer, []);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) dispatch({ type: "hydrate", items: JSON.parse(raw) });
    } catch {
      /* corrupt storage → start empty */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable */
    }
  }, [items, hydrated]);

  const add = useCallback((item: NewItem) => dispatch({ type: "add", item }), []);
  const replace = useCallback((id: string, item: NewItem) => dispatch({ type: "replace", id, item }), []);
  const setQuantity = useCallback((id: string, quantity: number) => dispatch({ type: "qty", id, quantity }), []);
  const remove = useCallback((id: string) => dispatch({ type: "remove", id }), []);
  const clear = useCallback(() => dispatch({ type: "clear" }), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      totals: cartTotals(items),
      hydrated,
      add,
      replace,
      setQuantity,
      remove,
      clear,
    }),
    [items, hydrated, add, replace, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export type { Customization };
