// EventTarget is not a generic type in TypeScript.
// We use the code adapted from https://github.com/microsoft/TypeScript/issues/28357#issuecomment-2310186394
// to add type safety.

/**
 * Type-safe event listener and dispatch signatures for the custom events
 * defined in `TDetails`.
 */
export interface CustomEventTarget<TDetails> {
  addEventListener<TType extends keyof TDetails>(
    type: TType,

    listener: (ev: CustomEvent<TDetails[TType]>) => any,
    options?: boolean | AddEventListenerOptions,
  ): void;

  removeEventListener<TType extends keyof TDetails>(
    type: TType,

    listener: (ev: CustomEvent<TDetails[TType]>) => any,
    options?: boolean | EventListenerOptions,
  ): void;

  dispatchEvent<TType extends keyof TDetails>(
    ev: _TypedCustomEvent<TDetails, TType>,
  ): void;
}

/**
 * Internal declaration for the `typeof` trick below.
 * Never actually implemented.
 */
declare class _TypedCustomEvent<
  TDetails,
  TType extends keyof TDetails,
> extends CustomEvent<TDetails[TType]> {
  constructor(
    type: TType,
    eventInitDict: { detail: TDetails[TType] } & EventInit,
  );
}

/**
 * Typed custom event (technically a typed alias of `CustomEvent`).
 * Use with `CustomEventTarget.dispatchEvent` to infer `detail` types
 * automatically.
 */
export const TypedCustomEvent = CustomEvent as typeof _TypedCustomEvent

export function createEventTarget<TDetails>(): CustomEventTarget<TDetails> {
  return new EventTarget() as CustomEventTarget<TDetails>
}

export function cloneEventTarget<TDetails>(eventTarget: CustomEventTarget<TDetails>, eventTypes: (keyof TDetails)[]): {
  eventTarget: CustomEventTarget<TDetails>,
  detach: () => void;
 } {
  const cloned = createEventTarget<TDetails>()
  // listen to all the events from the original event target
  const listeners: {eventType: keyof TDetails, callback: (ev: CustomEvent<TDetails[keyof TDetails]>) => void}[] = []
  for (const eventType of eventTypes) {
    function callback(ev: CustomEvent<TDetails[typeof eventType]>) {
      // dispatch the event to the cloned event target
      cloned.dispatchEvent(new TypedCustomEvent(eventType, { detail: ev.detail }))
    }

    eventTarget.addEventListener(eventType, callback)
    listeners.push({ eventType, callback })
  }
  function detach() {
    // remove all the listeners from the original event target
    while (listeners.length > 0) {
      const listener = listeners.pop()
      if (!listener) {
        continue
      }
      const { eventType, callback } = listener
      eventTarget.removeEventListener(eventType, callback)
    }
  }
  return { eventTarget: cloned, detach }
}
