export function Button({ className = '', variant = 'default', disabled = false, ...props }) {
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed',
    ghost: 'hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed',
  }

  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 px-4 py-2 ${variants[variant] || variants.default} ${className}`}
      {...props}
    />
  )
}
