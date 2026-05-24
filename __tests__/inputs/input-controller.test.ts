import { InputController } from "@/inputs/input-controller";
import { GameAction } from "@/inputs/action";

describe("InputController", () => {
  let controller: InputController;
  let handler: jest.Mock;

  beforeEach(() => {
    handler = jest.fn();
    controller = new InputController({
      animationLockDuration: 100,
      queueMaxSize: 5,
    });
  });

  afterEach(() => {
    controller.stop();
  });

  describe("start/stop", () => {
    it("should register and unregister adapters", () => {
      const cleanup = controller.start(handler);
      expect(typeof cleanup).toBe("function");
      cleanup();
    });

    it("should not process actions after stop", () => {
      controller.start(handler);
      controller.stop();

      const action: GameAction = { type: "move_up" };
      controller["handleInput"](action);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("action processing", () => {
    it("should call handler with action", () => {
      controller.start(handler);

      const action: GameAction = { type: "move_up" };
      controller["handleInput"](action);

      expect(handler).toHaveBeenCalledWith(action);
    });

    it("should queue actions when locked", () => {
      controller.start(handler);
      controller.lock();

      controller["handleInput"]({ type: "move_up" });
      controller["handleInput"]({ type: "move_down" });

      expect(handler).toHaveBeenCalledTimes(0);
      expect(controller.getState().pendingActions).toBe(2);
    });

    it("should process queued actions after unlock", () => {
      controller.start(handler);
      controller.lock();
      controller["handleInput"]({ type: "move_up" });

      controller.unlock();

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe("animation lock", () => {
    it("should block input processing while locked", () => {
      controller.start(handler);
      controller.lock();

      controller["handleInput"]({ type: "move_up" });

      expect(handler).not.toHaveBeenCalled();
      expect(controller.getState().isLocked).toBe(true);
    });

    it("should queue inputs even when locked", () => {
      controller.start(handler);
      controller.lock();

      controller["handleInput"]({ type: "move_up" });

      expect(controller.getState().pendingActions).toBe(1);
    });

    it("should auto-unlock after animation duration", () => {
      jest.useFakeTimers();
      controller.start(handler);

      controller["handleInput"]({ type: "move_up" });
      expect(controller.getState().isLocked).toBe(true);

      jest.advanceTimersByTime(100);
      expect(controller.getState().isLocked).toBe(false);
      jest.useRealTimers();
    });
  });

  describe("queue management", () => {
    it("should clear queue", () => {
      controller.start(handler);
      controller.lock();
      controller["handleInput"]({ type: "move_up" });
      controller["handleInput"]({ type: "move_down" });

      controller.clearQueue();

      expect(controller.getState().pendingActions).toBe(0);
    });

    it("should reject actions when queue is full", () => {
      controller.start(handler);
      controller.lock();

      for (let i = 0; i < 5; i++) {
        controller["handleInput"]({ type: "move_up" });
      }

      expect(controller.getState().pendingActions).toBe(5);

      controller["handleInput"]({ type: "move_down" });
      expect(controller.getState().pendingActions).toBe(5);
    });
  });

  describe("state", () => {
    it("should return correct initial state", () => {
      const state = controller.getState();

      expect(state.isLocked).toBe(false);
      expect(state.pendingActions).toBe(0);
    });
  });
});