import Image from "next/image";

type LogoProps = {
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light";
};

const ASPECT = 1269 / 903;

const sizes = {
  sm: { h: 36, text: "text-base" },
  md: { h: 56, text: "text-xl" },
  lg: { h: 80, text: "text-3xl" },
};

export function Logo({ size = "md", variant = "dark" }: LogoProps) {
  const s = sizes[size];
  const w = Math.round(s.h * ASPECT);

  if (variant === "light") {
    return (
      <span
        className={`inline-flex items-baseline gap-2 font-extrabold tracking-tight ${s.text}`}
      >
        <span className="text-white">RP</span>
        <span className="text-accent-400">MARKETING</span>
      </span>
    );
  }

  return (
    <Image
      src="/logo.jpeg"
      alt="RP Marketing"
      width={w}
      height={s.h}
      priority
      className="select-none"
    />
  );
}
