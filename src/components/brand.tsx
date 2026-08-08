import Image from "next/image";
import logo from "../../MedCiclo_logo.png";
export function Brand({ alt }: { alt: string }) {
  return (
    <Image
      className="brand-image"
      src={logo}
      alt={alt}
      priority
      sizes="132px"
    />
  );
}
