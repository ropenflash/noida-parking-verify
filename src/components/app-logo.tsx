import Image from "next/image";

export function AppLogo({
  size = 28,
  className = "",
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/icons/icon-192.png"
      alt="Noida Parking Verify"
      width={size}
      height={size}
      priority={priority}
      className={`rounded-md ${className}`.trim()}
    />
  );
}
