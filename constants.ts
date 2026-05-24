export const containerWidthMobile = 288;

export const containerWidthDesktop = 464;

export const tileCountPerDimension = 4;

export const mergeAnimationDuration = 100;

export const moveAnimationDuration = 200;

export const gameWinTileValue = 2048;

export const gameStorageKey = "2048-in-react-session";

export const moveDirections = [
  "move_up",
  "move_down",
  "move_left",
  "move_right",
] as const;

export type MoveDirection = (typeof moveDirections)[number];

export const moveDirectionLabels: Record<MoveDirection, string> = {
  move_up: "上",
  move_down: "下",
  move_left: "左",
  move_right: "右",
};

export type ChallengeModeId =
  | "obstacle"
  | "decay"
  | "mergeLimit"
  | "countdown"
  | "disabledDirection";

export type ChallengeConfig = {
  obstacle: {
    spawnCount: number;
    maxObstacles: number;
  };
  decay: {
    step: number;
    minimumValue: number;
  };
  mergeLimit: {
    maxMergesPerMove: number;
  };
  countdown: {
    durationMs: number;
    bonusMsPerMove: number;
  };
  disabledDirection: {
    disabledCount: number;
  };
};

export type EnabledChallengeModes = Record<ChallengeModeId, boolean>;

export const challengeModeOrder: ChallengeModeId[] = [
  "obstacle",
  "decay",
  "mergeLimit",
  "countdown",
  "disabledDirection",
];

export const defaultChallengeConfig: ChallengeConfig = {
  obstacle: {
    spawnCount: 1,
    maxObstacles: 3,
  },
  decay: {
    step: 1,
    minimumValue: 2,
  },
  mergeLimit: {
    maxMergesPerMove: 1,
  },
  countdown: {
    durationMs: 45000,
    bonusMsPerMove: 0,
  },
  disabledDirection: {
    disabledCount: 1,
  },
};

export const createEmptyEnabledModes = (): EnabledChallengeModes => ({
  obstacle: false,
  decay: false,
  mergeLimit: false,
  countdown: false,
  disabledDirection: false,
});

export const challengeModeDefinitions = {
  obstacle: {
    label: "自动障碍",
    description: "每回合在空位生成障碍，障碍会阻挡移动与合并。",
    controls: [
      {
        key: "spawnCount",
        label: "每回合障碍",
        min: 1,
        max: 2,
        step: 1,
      },
      {
        key: "maxObstacles",
        label: "障碍上限",
        min: 1,
        max: 6,
        step: 1,
      },
    ],
  },
  decay: {
    label: "数字衰减",
    description: "每次有效移动后，数字按衰减级数自动减半。",
    controls: [
      {
        key: "step",
        label: "衰减级数",
        min: 1,
        max: 3,
        step: 1,
      },
      {
        key: "minimumValue",
        label: "最小值",
        min: 2,
        max: 32,
        step: 2,
      },
    ],
  },
  mergeLimit: {
    label: "合并限制",
    description: "限制每次移动最多允许的合并次数。",
    controls: [
      {
        key: "maxMergesPerMove",
        label: "每步最多合并",
        min: 0,
        max: 4,
        step: 1,
      },
    ],
  },
  countdown: {
    label: "倒计时",
    description: "时间耗尽即失败，可按配置在每次有效移动后回补时间。",
    controls: [
      {
        key: "durationMs",
        label: "初始毫秒",
        min: 5000,
        max: 120000,
        step: 5000,
      },
      {
        key: "bonusMsPerMove",
        label: "每步回补",
        min: 0,
        max: 10000,
        step: 500,
      },
    ],
  },
  disabledDirection: {
    label: "禁用方向",
    description: "每回合随机禁用部分方向，已禁用方向输入会被直接忽略。",
    controls: [
      {
        key: "disabledCount",
        label: "禁用数量",
        min: 1,
        max: 3,
        step: 1,
      },
    ],
  },
} satisfies {
  [K in ChallengeModeId]: {
    label: string;
    description: string;
    controls: Array<{
      key: keyof ChallengeConfig[K] & string;
      label: string;
      min: number;
      max: number;
      step: number;
    }>;
  };
};
