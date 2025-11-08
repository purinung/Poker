"use client"
import { FaWindows } from "react-icons/fa"
import { FaApple } from "react-icons/fa6"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { GameStatusEnum } from "@/common/enum"
import { UI_LABELS } from "@/common/label"

const HomePage = () => {
	const [username, setUsername] = useState("")
	const [password, setPassword] = useState("")
	const [isLogin, setIsLogin] = useState(true)
	const [error, setError] = useState("")
	const [loading, setLoading] = useState(false)
	const router = useRouter()

	// Check auth status
	useEffect(() => {
		fetch("/api/auth/check", {
			method: "GET",
			credentials: "include",
		})
			.then((res) => {
				if (res.ok) {
					return res.json()
				}
				return null
			})
			.then((data) => {
				if (data) {
					// Check if player is already in an active room
					if (
						data.gameRoomId &&
						data.gameRoom &&
						data.gameRoom.status !== GameStatusEnum.FINISHED
					) {
						router.replace(`/gameroom/${data.gameRoom.id}`)
					} else {
						router.replace("/lobby")
					}
				}
			})
			.catch(() => {
				// Not authenticated, stay on login page
			})
	}, [router])

	const handleSubmit = async (e: React.MouseEvent<HTMLDivElement>) => {
		e.preventDefault()
		if (!username.trim() || !password.trim()) {
			setError("Please enter both username and password.")
			return
		}
		setLoading(true)
		try {
			const endpoint = isLogin ? "/api/auth/signin" : "/api/auth/signup"
			const res = await fetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: username.trim(),
					password: password.trim(),
				}),
				credentials: "include",
			})
			const data = await res.json()
			if (res.ok && data.success) {
				// Session cookie is set by API, redirect to lobby
				router.replace("/lobby")
			} else {
				setError(
					data.error || (isLogin ? "Login failed." : "Registration failed."),
				)
			}
		} catch (error) {
			console.error("Network error:", error)
			setError("Network error.")
		}
		setLoading(false)
	}

	return (
		<section className="flex w-full flex-col">
			{/* Title */}
			<div className="flex h-screen flex-col items-center justify-center">
				<h1 className="text-title">PREDICTION</h1>

				<p className="text-primary">
					POKER STRATEGY AND WIN RATE{" "}
					<span className="text-accent-red">PREDICTION</span>
				</p>

				<div className="mt-4 flex flex-col items-center gap-2">
					<div className="flex items-center gap-2">
						<h3 className="text-primary">Platforms:</h3>

						<div className="flex items-center gap-2">
							<FaWindows />
							<FaApple />
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<input
							type="text"
							placeholder={UI_LABELS.USERNAME}
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							className="border-accent-white border px-2 py-1 text-[16px] outline-none focus:ring-0"
							disabled={loading}
						/>
						<input
							type="password"
							placeholder={UI_LABELS.PASSWORD}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="border-accent-white border px-2 py-1 text-[16px] outline-none focus:ring-0"
							disabled={loading}
						/>
						<div
							className="btn-primary"
							onClick={handleSubmit}
							style={{ pointerEvents: loading ? "none" : "auto" }}
						>
							<p className="text-primary font-semibold">
								{isLogin ? "Login" : "Register"}
							</p>
						</div>
						<div
							className="text-primary cursor-pointer text-center text-base"
							onClick={() => setIsLogin(!isLogin)}
						>
							{isLogin
								? "Need an account? Register"
								: "Already have an account? Login"}
						</div>
						{error && (
							<span className="text-accent-red ml-2 text-sm">{error}</span>
						)}
					</div>
				</div>
			</div>
		</section>
	)
}

export default HomePage
