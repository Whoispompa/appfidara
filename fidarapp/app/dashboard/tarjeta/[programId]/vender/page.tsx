import { redirect } from "next/navigation";

type SalePageProps = {
  params: Promise<{ programId: string }>;
};

export default async function LegacyGiftCardSalePage({ params }: SalePageProps) {
  const { programId } = await params;
  redirect(
    `/dashboard/tarjeta/${encodeURIComponent(programId)}#venta-gift-card`,
  );
}
