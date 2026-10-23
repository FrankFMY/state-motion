/**
 * Промис, у которого `resolve`/`reject` снаружи.
 * Слот «сам скажу когда»: сокет, callback-API, тесты.
 */
export class Deferred<T = void, E = Error> {
	promise: Promise<T>;
	resolve!: (result: T) => void;
	reject!: (err: E) => void;

	constructor() {
		this.promise = new Promise<T>((res, rej) => {
			this.resolve = res;
			this.reject = rej;
		});
	}
}
