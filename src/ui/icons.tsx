/** Small line icons, all drawn in the same style. They use currentColor. */
type IconProps = { size?: number; strokeWidth?: number }

function Icon({ size = 18, strokeWidth = 1.9, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const CheckIcon = (p: IconProps) => (
  <Icon strokeWidth={2.4} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
)
export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
)
export const ArrowRightIcon = (p: IconProps) => (
  <Icon strokeWidth={2} {...p}>
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </Icon>
)
export const UploadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 15V4" />
    <path d="M7.5 8.5L12 4l4.5 4.5" />
    <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
  </Icon>
)
export const SheetIcon = (p: IconProps) => (
  <Icon strokeWidth={1.75} {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M8 12h8M8 16h8M12 12v7" />
  </Icon>
)
export const TrashIcon = (p: IconProps) => (
  <Icon strokeWidth={2} {...p}>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
  </Icon>
)
export const SwapIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 8h15" />
    <path d="M16 5l3 3-3 3" />
    <path d="M20 16H5" />
    <path d="M8 13l-3 3 3 3" />
  </Icon>
)
export const ShieldIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z" />
    <path d="M9 12l2 2 4-4" />
  </Icon>
)
export const AlertIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4l9 16H3z" />
    <path d="M12 10v4" />
    <path d="M12 17.5v.01" />
  </Icon>
)
export const ArrowLeftIcon = (p: IconProps) => (
  <Icon strokeWidth={2} {...p}>
    <path d="M19 12H5" />
    <path d="M11 6l-6 6 6 6" />
  </Icon>
)
