"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Download, LoaderCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type ProgramMaterial = {
  id: string;
  organizationName?: string;
  organizationSlug?: string;
  name: string;
  description?: string | null;
  targetValue: number;
  cardLogoUrl?: string | null;

  reward?: {
    name: string;
    description?: string | null;
  } | null;
};

const apiUrl =
  process.env.NEXT_PUBLIC_FIDARA_API_URL ?? "https://api.fidara.mx";

function absoluteUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `${apiUrl}${value}`;
}

export default function MarketingMaterialPage() {
  const params = useParams<{
    programId: string;
  }>();

  const searchParams = useSearchParams();

  const printStarted = useRef(false);

  const [program, setProgram] = useState<ProgramMaterial | null>(null);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProgram() {
      try {
        const response = await fetch(`/api/programs/${params.programId}`, {
          cache: "no-store",
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload.message ?? "No fue posible cargar la tarjeta.",
          );
        }

        setProgram(payload.data);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "No fue posible cargar la tarjeta.",
        );
      }
    }

    void loadProgram();
  }, [params.programId]);

  useEffect(() => {
    if (!program || printStarted.current || searchParams.get("print") !== "1") {
      return;
    }

    printStarted.current = true;

    const timeout = window.setTimeout(() => {
      window.print();
    }, 800);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [program, searchParams]);

  if (error) {
    return <div className="material-message">{error}</div>;
  }

  if (!program) {
    return (
      <div className="material-message">
        <LoaderCircle className="scanner-spinner" size={26} />
        Preparando material...
      </div>
    );
  }

  const joinUrl =
    `https://get.fidara.mx/join/` +
    `${program.organizationSlug}` +
    `?programId=${program.id}`;

  const logoUrl = absoluteUrl(program.cardLogoUrl);

  return (
    <main className="marketing-material-page">
      <div className="marketing-toolbar">
        <button type="button" onClick={() => window.print()}>
          <Download size={18} />
          Descargar o imprimir
        </button>
      </div>

      <article className="marketing-sheet">
        <header className="marketing-brand">
          {logoUrl ? (
            <img src={logoUrl} alt={program.organizationName} />
          ) : (
            <strong>{program.organizationName}</strong>
          )}
        </header>

        <h1>Obtén sellos y disfruta tus recompensas</h1>

        <p className="marketing-introduction">
          Únete a nuestro programa de lealtad digital.
        </p>

        <section className="marketing-join">
          <div className="marketing-large-qr">
            <QRCodeSVG
              value={joinUrl}
              size={245}
              level="H"
              marginSize={2}
              bgColor="#ffffff"
              fgColor="#000000"
            />

            <span>{joinUrl}</span>
          </div>

          <div className="marketing-instructions">
            <span>1</span>
            <p>Escanea el código con la cámara de tu teléfono.</p>

            <span>2</span>
            <p>Registra tus datos y agrega la tarjeta a tu Wallet.</p>

            <span>3</span>
            <p>Presenta tu tarjeta en cada visita para acumular sellos.</p>
          </div>
        </section>

        <section className="marketing-reward">
          <small>Tu recompensa</small>

          <h2>{program.reward?.name ?? "Recompensa especial"}</h2>

          <p>
            {program.reward?.description ??
              `Completa ${program.targetValue} sellos para obtenerla.`}
          </p>
        </section>

        <footer className="marketing-wallets">
          <span> Apple Wallet</span>
          <span>Google Wallet</span>

          <small>Programa de lealtad impulsado por Fidara</small>
        </footer>
      </article>
    </main>
  );
}
