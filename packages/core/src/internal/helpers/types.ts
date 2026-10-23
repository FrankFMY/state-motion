/** A structural mutable value, independent of any reactive framework. */
export interface IState<V> { get(): V; set(value: V): void; }
export interface IDriftState<V> { current: IState<V>; target: IState<V>; }
export type DriftFunc<V> = (current: IState<V>, target: IState<V>) => void;
export type EqFunc<V, O = number> = (current: V, target: V, eps: O) => boolean;
export type IntervalType = ReturnType<typeof setInterval>;
