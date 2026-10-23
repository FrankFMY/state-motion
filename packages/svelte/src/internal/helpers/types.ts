/** A structural mutable value, independent of any reactive framework. */
export interface IState<V> { get(): V; set(value: V): void; }
