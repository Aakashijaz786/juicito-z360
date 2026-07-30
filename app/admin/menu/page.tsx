"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  MenuFormDialog,
  type MenuFormValues,
} from "@/components/admin/menu-form-dialog";
import type { MenuItem } from "@/lib/types";

const CATEGORIES = ["All", "Fast Food", "Sauce", "Lassi", "Burger", "Soup", "Dessert"];

export default function AdminMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/menu");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load menu");
      setItems(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load menu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => (filter === "All" ? items : items.filter((i) => i.category === filter)),
    [items, filter]
  );

  async function handleSubmit(values: MenuFormValues) {
    const payload = {
      name: values.name,
      price: values.price,
      category: values.category,
      available: values.available,
      description: values.description,
      tags: values.tags,
    };
    try {
      const res = values.id
        ? await fetch(`/api/menu/${values.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/menu", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success(values.id ? "Item updated" : "Item added");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function handleDelete(item: MenuItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      const res = await fetch(`/api/menu/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast.success("Item deleted");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Menu</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} items · changes reflect live in the chat agent
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              filter === c
                ? "border-primary bg-accent text-accent-foreground"
                : "hover:border-primary"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading menu…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <Card key={item.id} className="flex flex-col p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <Badge variant="secondary">{item.category}</Badge>
                <Badge variant={item.available ? "success" : "destructive"}>
                  {item.available ? "In stock" : "Out of stock"}
                </Badge>
              </div>
              <h3 className="font-semibold">{item.name}</h3>
              <p className="mb-3 mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">
                {item.description}
              </p>
              <div className="mb-3 text-xl font-bold text-primary">
                Rs. {item.price}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setEditing(item);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(item)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <MenuFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
