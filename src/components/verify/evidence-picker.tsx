"use client";

import { useRef } from "react";
import { Camera, FileUp, Images, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EVIDENCE_CATEGORY_LABELS } from "@/lib/constants";
import type { EvidenceCategory } from "@/lib/types";

export type LocalEvidence = {
  id: string;
  previewUrl: string;
  file: File;
  category: EvidenceCategory;
};

export function EvidencePicker({
  title,
  hint,
  category,
  allowPdf = false,
  items,
  onAdd,
  onRemove,
}: {
  title: string;
  hint?: string;
  category: EvidenceCategory;
  allowPdf?: boolean;
  items: LocalEvidence[];
  onAdd: (files: FileList | null, category: EvidenceCategory) => void;
  onRemove: (id: string) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const matching = items.filter((item) => item.category === category);
  const imageAccept = "image/jpeg,image/png,image/webp,image/heic,image/heif";
  const fileAccept = allowPdf ? `${imageAccept},application/pdf` : imageAccept;

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        {hint ? <p className="text-xs text-zinc-600">{hint}</p> : null}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-12 flex-col gap-1 px-1 text-[11px] leading-tight"
          onClick={() => cameraRef.current?.click()}
        >
          <Camera className="size-4" />
          Camera
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 flex-col gap-1 px-1 text-[11px] leading-tight"
          onClick={() => libraryRef.current?.click()}
        >
          <Images className="size-4" />
          Photos
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 flex-col gap-1 px-1 text-[11px] leading-tight"
          onClick={() => fileRef.current?.click()}
        >
          <FileUp className="size-4" />
          File
        </Button>
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          onAdd(e.target.files, category);
          e.target.value = "";
        }}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          onAdd(e.target.files, category);
          e.target.value = "";
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept={fileAccept}
        multiple
        className="sr-only"
        onChange={(e) => {
          onAdd(e.target.files, category);
          e.target.value = "";
        }}
      />
      {matching.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {matching.map((item) => (
            <EvidenceThumb
              key={item.id}
              item={item}
              onRemove={() => onRemove(item.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function EvidenceThumb({
  item,
  onRemove,
}: {
  item: LocalEvidence;
  onRemove?: () => void;
}) {
  const isImage = item.file.type.startsWith("image/");
  return (
    <figure className="relative overflow-hidden rounded-md border bg-zinc-50">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.previewUrl} alt="" className="h-24 w-full object-cover" />
      ) : (
        <div className="flex h-24 items-center justify-center p-2 text-center text-[10px] text-zinc-600">
          {item.file.name}
        </div>
      )}
      <figcaption className="p-1 text-[10px]">
        {EVIDENCE_CATEGORY_LABELS[item.category]}
      </figcaption>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1 right-1 rounded-full bg-white/90 p-1 text-zinc-700 shadow"
          aria-label="Remove attachment"
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}
    </figure>
  );
}
