import { GameAction } from "./action";
import { ActionQueue } from "./input-queue";
import { InputAdapter, createKeyboardAdapter } from "./keyboard-adapter";
import { createPointerAdapter } from "./pointer-adapter";

export type InputControllerOptions = {
  animationLockDuration: number;
  queueMaxSize?: number;
  keyboardEnabled?: boolean;
  pointerEnabled?: boolean;
  keyboardOptions?: Parameters<typeof createKeyboardAdapter>[0];
  pointerOptions?: Parameters<typeof createPointerAdapter>[0];
};

export type InputControllerState = {
  isLocked: boolean;
  pendingActions: number;
};

export class InputController {
  private queue: ActionQueue;
  private adapters: InputAdapter[] = [];
  private cleanupFns: (() => void)[] = [];
  private isLocked: boolean = false;
  private animationLockDuration: number;
  private actionHandler: ((action: GameAction) => void) | null = null;

  constructor(options: InputControllerOptions) {
    this.animationLockDuration = options.animationLockDuration;
    this.queue = new ActionQueue({ maxSize: options.queueMaxSize ?? 10 });

    if (options.keyboardEnabled !== false) {
      this.adapters.push(createKeyboardAdapter(options.keyboardOptions));
    }

    if (options.pointerEnabled !== false) {
      this.adapters.push(createPointerAdapter(options.pointerOptions));
    }
  }

  start(handler: (action: GameAction) => void): () => void {
    this.actionHandler = handler;

    for (const adapter of this.adapters) {
      const cleanup = adapter.start((action) => {
        this.handleInput(action);
      });
      this.cleanupFns.push(cleanup);
    }

    return () => this.stop();
  }

  stop(): void {
    for (const cleanup of this.cleanupFns) {
      cleanup();
    }
    this.cleanupFns = [];
    this.actionHandler = null;
  }

  private handleInput(action: GameAction): void {
    if (!this.queue.enqueue(action)) {
      return;
    }
    this.processQueue();
  }

  private processQueue(): void {
    if (this.isLocked || this.actionHandler === null) {
      return;
    }

    const action = this.queue.dequeue();
    if (!action) {
      return;
    }

    this.isLocked = true;
    this.actionHandler(action);

    setTimeout(() => {
      this.isLocked = false;
      this.processQueue();
    }, this.animationLockDuration);
  }

  getState(): InputControllerState {
    return {
      isLocked: this.isLocked,
      pendingActions: this.queue.length,
    };
  }

  clearQueue(): void {
    this.queue.clear();
  }

  lock(): void {
    this.isLocked = true;
  }

  unlock(): void {
    this.isLocked = false;
    this.processQueue();
  }
}