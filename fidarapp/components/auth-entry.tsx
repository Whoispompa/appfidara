import Image from "next/image";
import { Poppins } from "next/font/google";
import type { LucideIcon } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { AuthShell } from "./auth-shell";
import { BrandPanel } from "./brand-panel";
import { FidaraLogo } from "./fidara-logo";
import styles from "./auth-entry.module.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });

export function AuthEntry({
  mode,
  title,
  subtitle,
  children,
}: {
  mode: "login" | "register";
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <AuthShell
      mode={mode}
      className={styles.login + " " + poppins.className}
      showNavLogo={false}
      brandPanel={
        <BrandPanel>
          <div className={styles.illustrationFrame}>
            <Image
              src="/login-footer.png"
              alt="Ejemplos de tarjetas Fidara en Apple Wallet y Google Wallet"
              width={1447}
              height={1087}
              unoptimized
              className={styles.brandIllustration}
            />
          </div>
        </BrandPanel>
      }
    >
      <div className="form-wrap">
        <FidaraLogo variant="dark" className={styles.formLogo} />
        <h2>{title}</h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {children}
      </div>
    </AuthShell>
  );
}

export function AuthField({
  id,
  label,
  icon: Icon,
  action,
  ...props
}: ComponentPropsWithoutRef<"input"> & {
  id: string;
  label: string;
  icon: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className={`field-group ${styles.inputField}${action ? " password-wrap" : ""}`}>
      <label className="sr-only" htmlFor={id}>{label}</label>
      <Icon className={styles.fieldIcon} size={18} aria-hidden="true" />
      <input id={id} {...props} />
      {action}
    </div>
  );
}
