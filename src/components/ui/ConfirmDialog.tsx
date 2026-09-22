import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  open: boolean
  title: string
  body?: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  destructive,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 grid place-items-center px-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-900/60"
          />
          <motion.div
            role="alertdialog"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="card relative w-full max-w-xs"
          >
            <h2 className="font-semibold">{title}</h2>
            {body && <p className="mt-1.5 text-sm text-slate-400">{body}</p>}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={onCancel} className="btn-ghost flex-1">
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`btn flex-1 text-white ${destructive ? 'bg-danger' : 'bg-accent'}`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
