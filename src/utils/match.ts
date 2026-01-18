type HandlerMap<K extends PropertyKey, R> = { [P in K]: () => R };
export const exhaustiveMatch = <K extends PropertyKey, R>(handlers: HandlerMap<K, R>) => {
	return (value: K): R => handlers[value]();
};

type AsyncHandlerMap<K extends PropertyKey, R> = { [P in K]: () => Promise<R> };
export const exhaustiveMatchAsync = <K extends PropertyKey, R>(handlers: AsyncHandlerMap<K, R>) => {
	return async (value: K): Promise<R> => handlers[value]();
};
