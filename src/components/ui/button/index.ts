import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Button } from './Button.vue'

// Botones de la dirección Línea: 52px de alto, esquinas de 12px, sin sombras.
// go = la única acción rosa de la pantalla, line = secundaria, quiet = discreta.
export const buttonVariants = cva(
  'inline-flex w-full items-center justify-center gap-2 min-h-[52px] rounded-[12px] px-4 font-bold text-base disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink [&_svg]:size-5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        go: 'bg-rosa text-white [&_svg]:fill-white',
        line: 'bg-white text-ink border-2 border-ink [&_svg]:fill-ink',
        quiet: 'bg-concrete text-ink [&_svg]:fill-ink',
      },
      size: {
        default: '',
      },
    },
    defaultVariants: {
      variant: 'go',
      size: 'default',
    },
  },
)
export type ButtonVariants = VariantProps<typeof buttonVariants>
