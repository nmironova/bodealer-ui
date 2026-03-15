import { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

export enum ButtonVariant {
    PRIMARY = 'primary',
    SECONDARY= 'secondary',
    GHOST= 'ghost'
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({
  variant = ButtonVariant.PRIMARY,
  className,
  ...props
}: Props) {
  return (
    <button
      {...props}
      className={clsx(
        // base
        'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium shadow-sm',
        'focus:outline-none focus:ring-2 focus:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-60',

        // variants
        variant === 'primary' &&
          'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',

        variant === 'secondary' &&
          'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-400',

        variant === 'ghost' &&
          'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-400',

        className,
      )}
    />
  );
}
