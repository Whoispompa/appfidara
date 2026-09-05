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
        src="/Fidara-logo-horizontal.png"
        alt="Fidara"
        width={150}
        height={44}
        priority
        className="fidara-logo-image"
      />
    </Link>
  );
}