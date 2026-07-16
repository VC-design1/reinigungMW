"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  action: (formData: FormData) => void;
  initialRating?: number;
  initialComment?: string;
}

export function RatingForm({ action, initialRating = 0, initialComment = "" }: Props) {
  const [rating, setRating] = useState(initialRating);
  const [hovered, setHovered] = useState(0);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setRating(n)}
            aria-label={`${n} Sterne`}
          >
            <Star
              className={`h-6 w-6 ${
                n <= (hovered || rating) ? "fill-amber-400 text-amber-400" : "text-slate-300"
              }`}
            />
          </button>
        ))}
      </div>
      <input type="hidden" name="rating" value={rating} />
      <Textarea name="comment" placeholder="Kommentar (optional)" defaultValue={initialComment} rows={2} />
      <Button type="submit" size="sm" disabled={rating === 0} className="self-start">
        Bewertung speichern
      </Button>
    </form>
  );
}
