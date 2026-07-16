"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createTemplate } from "../actions";

interface Item {
  room_name: string;
  label: string;
}

const DEFAULT_ITEMS: Item[] = [
  { room_name: "Küche", label: "Herd & Backofen gereinigt" },
  { room_name: "Bad", label: "Dusche/Wanne gereinigt" },
  { room_name: "Schlafzimmer", label: "Bett frisch bezogen" },
  { room_name: "Flur", label: "Boden gesaugt & gewischt" },
];

export function TemplateEditor({ error }: { error?: string }) {
  const [items, setItems] = useState<Item[]>(DEFAULT_ITEMS);

  function updateItem(index: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { room_name: prev[prev.length - 1]?.room_name ?? "", label: "" }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form action={createTemplate} className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name der Vorlage</Label>
        <Input id="name" name="name" required placeholder="z. B. Standard-Reinigung" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Beschreibung (optional)</Label>
        <Textarea id="description" name="description" />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Checklisten-Punkte (raumweise)</Label>
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              placeholder="Raum, z. B. Küche"
              value={item.room_name}
              onChange={(e) => updateItem(index, { room_name: e.target.value })}
              className="w-40"
            />
            <Input
              placeholder="Aufgabe"
              value={item.label}
              onChange={(e) => updateItem(index, { label: e.target.value })}
              className="flex-1"
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addItem} className="self-start">
          Punkt hinzufügen
        </Button>
      </div>

      <input type="hidden" name="items_json" value={JSON.stringify(items)} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit">Vorlage anlegen</Button>
    </form>
  );
}
