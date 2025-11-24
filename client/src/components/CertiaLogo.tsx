export function CertiaLogo({ size = "default" }: { size?: "small" | "default" | "large" }) {
  const sizes = {
    small: "h-6 w-6 text-xs",
    default: "h-8 w-8 text-sm",
    large: "h-12 w-12 text-base",
  };

  return (
    <div className={`${sizes[size]} rounded-md bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center font-bold text-primary-foreground shadow-sm`}>
      C
    </div>
  );
}
