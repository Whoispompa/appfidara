function Block({ className, dark = false }: { className: string; dark?: boolean }) {
  return <div className={className + (dark ? " bg-white/15" : " bg-[#E5E7EB]")} />;
}

const panel = "rounded-[22px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.035)] sm:p-6";
const four = [0, 1, 2, 3];

export function DashboardSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Cargando resumen del negocio…</span>
      <div aria-hidden="true" className="motion-safe:animate-pulse motion-safe:[animation-duration:2.5s]">
        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full max-w-[640px]">
            <Block className="my-2 h-2.5 w-36 rounded-md" />
            <Block className="mt-3 h-[51px] w-full sm:h-12 rounded-md" />
            <Block className="mt-2 h-5 w-48 max-w-full rounded-md" />
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Block className="h-12 rounded-xl sm:w-32" />
            <Block className="h-12 rounded-xl sm:w-44" />
          </div>
        </div>

        <div className="mb-5 flex w-fit gap-1 rounded-xl bg-[#F3F4F6] p-1">
          <Block className="h-9 w-[62px] rounded-lg" />
          <Block className="h-9 w-[89px] rounded-lg" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {four.map((index) => (
            <div key={index} className="rounded-[20px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.035)]">
              <div className="flex justify-between gap-4">
                <Block className="h-11 w-11 rounded-2xl" />
                <Block className="h-[23px] w-10 rounded-full" />
              </div>
              <Block className="mt-5 h-4 w-32 max-w-full rounded-md" />
              <Block className="mt-1 h-[42px] w-24 max-w-full rounded-md" />
              <Block className="mt-2 h-5 w-40 max-w-full rounded-md" />
            </div>
          ))}
        </div>

        <div className="my-5 grid gap-5 rounded-[22px] bg-black p-5 sm:p-6 lg:grid-cols-[1.1fr_repeat(4,0.7fr)] lg:items-center">
          <div>
            <Block dark className="my-2 h-2.5 w-24 rounded-md" />
            <Block dark className="mt-2 h-7 w-36 max-w-full rounded-md" />
            <Block dark className="mt-1 h-5 w-48 max-w-full rounded-md" />
          </div>
          {four.map((index) => (
            <div key={index} className="border-t border-white/10 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
              <Block dark className="size-[18px] rounded-md" />
              <Block dark className="mt-3 h-7 w-16 max-w-full rounded-md" />
              <Block dark className="mt-1 h-[15px] w-24 max-w-full rounded-md" />
            </div>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(310px,0.5fr)]">
          <div className={panel}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <SectionHeading />
              <div className="flex flex-wrap gap-1 rounded-xl bg-[#F3F4F6] p-1">
                <Block className="h-[31px] w-14 rounded-md" />
                <Block className="h-[31px] w-20 rounded-md" />
                <Block className="h-[31px] w-16 rounded-md" />
              </div>
            </div>
            <div className="mt-8 grid h-[245px] grid-cols-7 gap-2 sm:gap-4">
              {[0, 1, 2, 3, 4, 5, 6].map((index) => (
                <div key={index} className="flex min-w-0 flex-col items-center">
                  <div className="flex h-[180px] w-full items-end justify-center">
                    <Block className="h-32 w-full max-w-[52px] rounded-t-xl" />
                  </div>
                  <Block className="mt-3 h-[15px] w-7 max-w-full rounded-md" />
                  <Block className="mt-1 h-3 w-5 max-w-full rounded-md" />
                </div>
              ))}
            </div>
          </div>

          <div className={panel}>
            <Block className="size-11 rounded-2xl" />
            <Block className="mt-5 h-[15px] w-14 rounded-md" />
            <Block className="mt-2 h-7 w-44 max-w-full rounded-md" />
            <Block className="mt-5 h-[60px] w-20 rounded-md" />
            <Block className="h-4 w-48 max-w-full rounded-md" />
            <div className="mt-7 space-y-5">
              {["Apple", "Google"].map((platform) => (
                <div key={platform}>
                  <div className="flex justify-between gap-4">
                    <Block className="h-5 w-24 rounded-md" />
                    <Block className="h-5 w-7 rounded-md" />
                  </div>
                  <Block className="mt-2 h-2 w-full rounded-full" />
                  <Block className="mt-1 ml-auto h-[14px] w-7 rounded-md" />
                </div>
              ))}
            </div>
            <Block className="mt-7 h-4 w-40 max-w-full rounded-md" />
          </div>
        </div>

        <div className={"mt-5 " + panel}>
          <div className="flex items-start justify-between gap-4">
            <SectionHeading />
            <Block className="size-6 shrink-0 rounded-md" />
          </div>
          <div className="mt-6 divide-y divide-[#E5E7EB] border-t border-[#E5E7EB]">
            {[0, 1, 2].map((index) => (
              <div key={index} className="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="flex min-w-0 items-start gap-3">
                  <Block className="size-11 shrink-0 rounded-2xl" />
                  <div className="min-w-0">
                    <Block className="h-5 w-40 max-w-full rounded-md" />
                    <Block className="mt-1 h-4 w-24 max-w-full rounded-md" />
                  </div>
                </div>
                <div className="flex items-end justify-between gap-4 pl-14 sm:block sm:pl-0">
                  <Block className="h-5 w-14 sm:ml-auto rounded-md" />
                  <Block className="h-[15px] w-20 max-w-full rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading() {
  return (
    <div className="min-w-0">
      <Block className="my-2 h-2.5 w-28 max-w-full rounded-md" />
      <Block className="mt-2 h-7 w-48 max-w-full rounded-md" />
      <Block className="mt-1 h-4 w-56 max-w-full rounded-md" />
    </div>
  );
}
