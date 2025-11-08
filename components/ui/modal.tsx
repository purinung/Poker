import React from "react"

interface ModalProps {
	isOpen: boolean
	onClose: () => void
	title?: string
	children: React.ReactNode
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
	if (!isOpen) return null

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div className="relative rounded-lg bg-white p-4">
				<div className="mb-4 flex min-w-[400px] items-center justify-between">
					{title && (
						<h3 className="text-accent-black text-[20px] font-bold">{title}</h3>
					)}
					<button className="btn-primary" onClick={onClose} aria-label="Close">
						CLOSE
					</button>
				</div>
				{children}
			</div>
		</div>
	)
}

export default Modal
