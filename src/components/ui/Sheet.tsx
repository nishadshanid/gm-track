import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Sticky action row at the bottom — usually Save / Cancel. */
  footer?: ReactNode
}

/**
 * Bottom sheet. Editing happens here rather than on a separate route, so the
 * list stays visible behind and Back never loses a half-typed form.
 */
export function Sheet({ open, title, onClose, children, footer }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-30 flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-label={title}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="relative flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-3xl border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          >
            <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <h2 className="font-semibold">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>

            {footer && (
              <footer className="border-t border-slate-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] dark:border-slate-800">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
