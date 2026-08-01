/**
 * PerspectiveLab brand mark — four converging perspective rings.
 */
export default function BrandLogo({ className = "h-8 w-8", title = "PerspectiveLab" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <circle cx="64" cy="40" r="26" stroke="#ea580c" strokeWidth="9" />
      <circle cx="88" cy="64" r="26" stroke="#f59e0b" strokeWidth="9" />
      <circle cx="64" cy="88" r="26" stroke="#64748b" strokeWidth="9" />
      <circle cx="40" cy="64" r="26" stroke="#22d3ee" strokeWidth="9" />
      <circle cx="64" cy="64" r="5.5" fill="#f8fafc" />
    </svg>
  );
}
