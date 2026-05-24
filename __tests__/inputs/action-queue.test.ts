import { ActionQueue } from "@/inputs/input-queue";
import { GameAction } from "@/inputs/action";

describe("ActionQueue", () => {
  let queue: ActionQueue;

  beforeEach(() => {
    queue = new ActionQueue({ maxSize: 3 });
  });

  describe("enqueue", () => {
    it("should add action to queue", () => {
      const action: GameAction = { type: "move_up" };
      const result = queue.enqueue(action);

      expect(result).toBe(true);
      expect(queue.length).toBe(1);
    });

    it("should reject action when queue is full", () => {
      queue.enqueue({ type: "move_up" });
      queue.enqueue({ type: "move_down" });
      queue.enqueue({ type: "move_left" });
      const result = queue.enqueue({ type: "move_right" });

      expect(result).toBe(false);
      expect(queue.length).toBe(3);
    });
  });

  describe("dequeue", () => {
    it("should remove and return first action", () => {
      queue.enqueue({ type: "move_up" });
      queue.enqueue({ type: "move_down" });
      const action = queue.dequeue();

      expect(action).toEqual({ type: "move_up" });
      expect(queue.length).toBe(1);
    });

    it("should return undefined when queue is empty", () => {
      const action = queue.dequeue();

      expect(action).toBeUndefined();
    });
  });

  describe("peek", () => {
    it("should return first action without removing", () => {
      queue.enqueue({ type: "move_up" });
      queue.enqueue({ type: "move_down" });
      const action = queue.peek();

      expect(action).toEqual({ type: "move_up" });
      expect(queue.length).toBe(2);
    });
  });

  describe("clear", () => {
    it("should remove all actions", () => {
      queue.enqueue({ type: "move_up" });
      queue.enqueue({ type: "move_down" });
      queue.clear();

      expect(queue.length).toBe(0);
      expect(queue.isEmpty).toBe(true);
    });
  });

  describe("getActions", () => {
    it("should return copy of queue", () => {
      queue.enqueue({ type: "move_up" });
      queue.enqueue({ type: "move_down" });
      const actions = queue.getActions();

      expect(actions).toEqual([
        { type: "move_up" },
        { type: "move_down" },
      ]);
    });
  });
});