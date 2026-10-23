import type * as ST from "./types.js";

export interface Vector3Config {
	C3_EPS: ST.C3;
	C3_STATE_TAU: ST.C3;
}

const config: Vector3Config = {
	C3_EPS: { x: 1e-3, y: 1e-3, z: 1e-3 },
	C3_STATE_TAU: { x: 90, y: 90, z: 90 },
};

export default config;
