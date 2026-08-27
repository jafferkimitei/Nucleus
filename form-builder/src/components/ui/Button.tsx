import { memo, type ButtonHTMLAttributes } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
}

function ButtonImpl({ variant = 'primary', className, ...rest }: ButtonProps) {
  const classes = ['button', `button--${variant}`, className]
    .filter(Boolean)
    .join(' ')
  return <button type="button" className={classes} {...rest} />
}

export const Button = memo(ButtonImpl)
