import type { Config } from "tailwindcss"

const config: Config = {
	theme: {
		screens: {
			sm: "640px",
			md: "768px",
			lg: "1024px",
			xl: "1280px",
		},
	},
	plugins: [require("tailwindcss-animate")],
}

export default config
