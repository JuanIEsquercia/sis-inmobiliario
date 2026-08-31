import Image from "next/image";

interface Logo {
  id: number;
  name: string;
  imageUrl: string;
  linkUrl: string | null;
}

function LogoItem({ logo }: { logo: Logo }) {
  const img = (
    <Image
      src={logo.imageUrl}
      alt={logo.name}
      width={120}
      height={48}
      unoptimized
      className="h-10 w-auto object-contain opacity-70 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
    />
  );

  return (
    <div className="mx-8 flex flex-none items-center" aria-hidden={false}>
      {logo.linkUrl ? (
        <a href={logo.linkUrl} target="_blank" rel="noreferrer noopener" aria-label={logo.name}>
          {img}
        </a>
      ) : (
        img
      )}
    </div>
  );
}

// Marquee en CSS puro (sin librería nueva): la lista se duplica una vez
// y se anima corriendo exactamente el ancho de una copia — al llegar al
// final, la segunda copia ya está en la posición inicial, así que el
// loop es imperceptible.
export function PartnerLogosCarousel({ logos }: { logos: Logo[] }) {
  if (logos.length === 0) return null;

  return (
    <section>
      <p className="mb-6 text-center text-xs font-bold uppercase tracking-[0.2em] text-muted">
        Trabajamos con
      </p>
      <div className="marquee-mask overflow-hidden">
        <div className="marquee-track flex w-max items-center">
          {logos.map((logo) => (
            <LogoItem key={`a-${logo.id}`} logo={logo} />
          ))}
          {logos.map((logo) => (
            <LogoItem key={`b-${logo.id}`} logo={logo} />
          ))}
        </div>
      </div>
    </section>
  );
}
