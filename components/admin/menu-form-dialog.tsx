"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MenuItem } from "@/lib/types";

export interface MenuFormValues {
  id?: string;
  name: string;
  price: number;
  category: string;
  available: boolean;
  description: string;
  tags: string;
}

const EMPTY: MenuFormValues = {
  name: "",
  price: 0,
  category: "Fast Food",
  available: true,
  description: "",
  tags: "",
};

export function MenuFormDialog({
  open,
  onOpenChange,
  item,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: MenuItem | null;
  onSubmit: (values: MenuFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<MenuFormValues>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setValues({
        id: item.id,
        name: item.name,
        price: item.price,
        category: item.category,
        available: item.available,
        description: item.description,
        tags: (item.tags ?? []).join(", "),
      });
    } else {
      setValues(EMPTY);
    }
  }, [item, open]);

  function set<K extends keyof MenuFormValues>(k: K, v: MenuFormValues[K]) {
    setValues((prev) => ({ ...prev, [k]: v }));
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Edit Item" : "Add Menu Item"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="price">Price (Rs.)</Label>
              <Input
                id="price"
                type="number"
                value={values.price}
                onChange={(e) => set("price", Number(e.target.value))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={values.category}
                onChange={(e) => set("category", e.target.value)}
              >
                {["Fast Food", "Sauce", "Lassi", "Burger", "Soup", "Dessert"].map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={values.tags}
              onChange={(e) => set("tags", e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.available}
              onChange={(e) => set("available", e.target.checked)}
            />
            Available (in stock)
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !values.name.trim()}>
            {saving ? "Saving…" : item ? "Save Changes" : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
