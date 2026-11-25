import Image from "next/image";
import Link from "next/link";

export function FidaraLogo({
  className = "",
}: {
  className?: string;
}) {
  return (
    <Link
      href="/login"
      className={`wordmark ${className}`}
      aria-label="Fidara, inicio"
    >
      <Image
        src="/Fidara-logo-blanco.png"
        alt="Fidara"
        width={300}
        height={100}
        sizes="150px"
        priority
        className="fidara-logo-image h-auto w-[150px]"
      />
    </Link>
  );
}
