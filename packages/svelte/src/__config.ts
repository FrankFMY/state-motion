export interface SvelteHelpersConfig {
	LOADER_DEFAULT: boolean;
	PRESENCE_INITIAL: boolean;
	PRESENCE_DURATION: number;
	SLIDE_DURATION: number;
	/** Доля `t`, пока opacity держится 0. */
	SLIDE_FADE_DELAY: number;
	/** Насколько раньше размера доезжает до 1 (`1 − v` — порог). */
	SLIDE_SIZE_BOOST: number;
}

const config: SvelteHelpersConfig = {
	LOADER_DEFAULT: false,
	PRESENCE_INITIAL: true,
	PRESENCE_DURATION: 350,
	SLIDE_DURATION: 325,
	SLIDE_FADE_DELAY: 1 / 3,
	SLIDE_SIZE_BOOST: 2 / 5,
};

export default config;
