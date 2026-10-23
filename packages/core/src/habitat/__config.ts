export interface HabitatConfig {
	RENDER_MIN_DT: number;
	RENDER_MAX_DT: number;
	RENDER_START_DT: number;
	SERVER_RENDER_FRAME_DT: number;
	SERVER_RENDER_SETTLE: number;
}

const config: HabitatConfig = {
	RENDER_MIN_DT: 8,
	RENDER_MAX_DT: 50,
	RENDER_START_DT: 16.6667,
	SERVER_RENDER_FRAME_DT: 16.6667,
	SERVER_RENDER_SETTLE: 1000,
};

export default config;
