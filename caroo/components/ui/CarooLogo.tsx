export function CarooLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  }

  return (
    <div className={`font-bold ${sizes[size]}`}>
      <span className="text-caroo-groen">Car</span>
      <span className="text-caroo-oranje">oo</span>
    </div>
  )
}
