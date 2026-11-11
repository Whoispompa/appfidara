// "use client"

// import { useTheme } from "next-themes"
// import { Toaster as Sonner, type ToasterProps } from "sonner"
// import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// const Toaster = ({ ...props }: ToasterProps) => {
//   const { theme = "system" } = useTheme()

//   return (
//     <Sonner
//       theme={theme as ToasterProps["theme"]}
//       className="toaster group"
//       icons={{
//         success: (
//           <CircleCheckIcon className="size-4" />
//         ),
//         info: (
//           <InfoIcon className="size-4" />
//         ),
//         warning: (
//           <TriangleAlertIcon className="size-4" />
//         ),
//         error: (
//           <OctagonXIcon className="size-4" />
//         ),
//         loading: (
//           <Loader2Icon className="size-4 animate-spin" />
//         ),
//       }}
//       style={
//         {
//           "--normal-bg": "var(--popover)",
//           "--normal-text": "var(--popover-foreground)",
//           "--normal-border": "var(--border)",
//           "--border-radius": "var(--radius)",
//         } as React.CSSProperties
//       }
//       toastOptions={{
//         classNames: {
//           toast: "cn-toast",
//         },
//       }}
//       {...props}
//     />
//   )
// }

// export { Toaster }


"use client";

import {
  Check,
  CircleAlert,
  Info,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const toastIcons = {
  success: (
    <span className="grid size-9 place-items-center rounded-full bg-emerald-50 text-emerald-600">
      <Check size={18} strokeWidth={2.4} />
    </span>
  ),
  error: (
    <span className="grid size-9 place-items-center rounded-full bg-rose-50 text-rose-600">
      <CircleAlert size={18} strokeWidth={2.2} />
    </span>
  ),
  warning: (
    <span className="grid size-9 place-items-center rounded-full bg-amber-50 text-amber-600">
      <TriangleAlert size={18} strokeWidth={2.2} />
    </span>
  ),
  info: (
    <span className="grid size-9 place-items-center rounded-full bg-sky-50 text-sky-600">
      <Info size={18} strokeWidth={2.2} />
    </span>
  ),
  loading: (
    <span className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-600">
      <LoaderCircle className="animate-spin" size={18} />
    </span>
  ),
};

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-right"
      closeButton
      duration={4500}
      gap={12}
      icons={toastIcons}
      toastOptions={{
        classNames: {
          toast:
            "group !w-[min(390px,calc(100vw-24px))] !rounded-[18px] !border !border-[#e5e7eb] !bg-white !px-4 !py-4 !text-[#111827] !shadow-[0_18px_45px_rgba(17,24,39,0.14)]",
          content: "!gap-0",
          title: "!text-[14px] !font-extrabold !leading-5 !text-[#111827]",
          description: "!mt-1 !text-[13px] !leading-5 !text-[#6b7280]",
          icon: "!mr-1 !size-9",
          closeButton:
            "!right-3 !top-3 !left-auto !translate-x-0 !translate-y-0 !border-0 !bg-transparent !text-[#6b7280] !shadow-none hover:!bg-[#f3f4f6]",
          success: "!border-emerald-200",
          error: "!border-rose-200",
          warning: "!border-amber-200",
          info: "!border-sky-200",
        },
      }}
      {...props}
    />
  );
}
