import { GameAction } from "./action";

export type QueueOptions = {
  maxSize?: number;
};

export class ActionQueue {
  private queue: GameAction[] = [];
  private maxSize: number;

  constructor(options: QueueOptions = {}) {
    this.maxSize = options.maxSize ?? 10;
  }

  enqueue(action: GameAction): boolean {
    if (this.queue.length >= this.maxSize) {
      return false;
    }
    this.queue.push(action);
    return true;
  }

  dequeue(): GameAction | undefined {
    return this.queue.shift();
  }

  peek(): GameAction | undefined {
    return this.queue[0];
  }

  clear(): void {
    this.queue = [];
  }

  get length(): number {
    return this.queue.length;
  }

  get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  getActions(): GameAction[] {
    return [...this.queue];
  }
}