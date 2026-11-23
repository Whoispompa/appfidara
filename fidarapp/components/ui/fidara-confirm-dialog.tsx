"use client";

import type { ReactNode } from "react";
import { LoaderCircle, X } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type FidaraConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon?: ReactNode;
  iconClassName?: string;
  title: string;
  description: ReactNode;
  children?: ReactNode;
  cancelLabel?: string;
  confirmLabel: string;
  busyLabel?: string;
  confirmIcon?: ReactNode;
  confirmClassName?: string;
  busy?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
};

export function FidaraConfirmDialog({
  open,
  onOpenChange,
  icon,
  iconClassName,
  title,
  description,
  children,
  cancelLabel = "Cancelar",
  confirmLabel,
  busyLabel = "Procesando…",
  confirmIcon,
  confirmClassName,
  busy = false,
  confirmDisabled = false,
  onConfirm,
}: FidaraConfirmDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!busy) onOpenChange(nextOpen);
      }}
    >
      <AlertDialogContent
        size="lg"
        className="w-[calc(100%_-_2rem)] gap-0 rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-[0_30px_90px_rgba(17,24,39,0.30)] ring-0 sm:p-7"
        overlayClassName="bg-[#111827]/60 backdrop-blur-sm"
      >
        <div className="flex items-start gap-4">
          {icon && (
            <span
              className={cn(
                "grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-50 text-[#E11D48]",
                iconClassName,
              )}
              aria-hidden="true"
            >
              {icon}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <AlertDialogTitle className="text-xl font-extrabold tracking-[-0.025em] text-[#111827]">
              {title}
            </AlertDialogTitle>

            <AlertDialogDescription className="mt-2 text-sm leading-6 text-[#6B7280]">
              {description}
            </AlertDialogDescription>
          </div>

          <AlertDialogCancel
            aria-label="Cerrar"
            disabled={busy}
            className="grid h-9 w-9 min-w-9 place-items-center rounded-xl border-0 bg-[#F3F4F6] p-0 text-[#6B7280] shadow-none transition hover:bg-[#F3F4F6] hover:text-[#111827]"
          >
            <X size={18} />
          </AlertDialogCancel>
        </div>

        {children && <div className="mt-5">{children}</div>}

        <div className="mt-7 grid grid-cols-1 gap-3 sm:flex sm:justify-end">
          <AlertDialogCancel
            disabled={busy}
            className="min-h-11 rounded-xl border border-[#E5E7EB] bg-white px-5 text-sm font-extrabold text-[#111827] shadow-none transition hover:bg-[#F3F4F6]"
          >
            {cancelLabel}
          </AlertDialogCancel>

          <AlertDialogAction
            type="button"
            disabled={busy || confirmDisabled}
            className={cn(
              "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-5 text-sm font-extrabold text-white shadow-lg shadow-[#E11D48]/20 transition hover:-translate-y-0.5 hover:bg-[#BE123C]",
              confirmClassName,
            )}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : confirmIcon}
            {busy ? busyLabel : confirmLabel}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
