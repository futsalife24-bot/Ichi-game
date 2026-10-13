// さいようした げんがから、みちと おおきな かたちを きめる。
export const CONCEPT_LAYOUTS = Object.freeze({
  "1": {
    "n": 1,
    "name": "ひだまりの花びら入江",
    "country": "日本",
    "kind": "cove",
    "radius": 25,
    "spawn": [
      0,
      16
    ],
    "hero": [
      0,
      -5
    ],
    "models": [
      [
        "blossomTree",
        0,
        -5,
        1,
        0
      ]
    ],
    "path": [
      [
        0,
        28
      ],
      [
        0,
        16
      ],
      [
        0,
        8
      ],
      [
        -1,
        0
      ],
      [
        0,
        -5
      ]
    ],
    "palette": {
      "ground": 10402661,
      "path": 16050124,
      "sky": 11130613,
      "water": 4700100
    },
    "light": {
      "sun": 16772559,
      "intensity": 2.6,
      "angle": [
        -30,
        42,
        22
      ]
    },
    "season": "spring",
    "reviewSide": [
      8,
      0
    ]
  },
  "2": {
    "n": 2,
    "name": "虹と大樹の森",
    "country": "フィンランド",
    "kind": "forest",
    "radius": 39,
    "spawn": [
      0,
      5
    ],
    "hero": [
      0,
      -9
    ],
    "models": [
      [
        "forestArch",
        0,
        -9,
        1,
        0
      ],
      [
        "nordicSchool",
        16,
        -10,
        1,
        -0.12
      ]
    ],
    "path": [
      [
        0,
        23
      ],
      [
        0,
        12
      ],
      [
        0,
        0
      ],
      [
        0,
        -9
      ],
      [
        2,
        -23
      ],
      [
        -3,
        -35
      ],
      [
        0,
        -44
      ]
    ],
    "palette": {
      "ground": 6264383,
      "path": 13477233,
      "sky": 11064811,
      "water": 5878217
    },
    "light": {
      "sun": 16772544,
      "intensity": 2.5,
      "angle": [
        -25,
        45,
        -6
      ]
    },
    "season": "summer"
  },
  "3": {
    "n": 3,
    "name": "時計塔と青い屋根の港町",
    "country": "オランダ",
    "kind": "harbor",
    "radius": 48,
    "spawn": [
      0,
      35
    ],
    "hero": [
      0,
      -16
    ],
    "models": [
      [
        "harborClock",
        0,
        -21,
        1,
        0
      ],
      [
        "canalHouseA",
        -13,
        -12,
        1,
        0
      ],
      [
        "canalHouseB",
        -21,
        -13,
        1,
        0
      ],
      [
        "canalHouseC",
        -29,
        -13,
        1,
        0
      ],
      [
        "canalHouseB",
        11,
        -18,
        1,
        0
      ],
      [
        "canalHouseC",
        19,
        -21,
        1,
        0
      ],
      [
        "harborBakery",
        30,
        9,
        1,
        -0.25
      ],
      [
        "harborGlasshouse",
        29,
        -31,
        1,
        0
      ],
      [
        "lighthouse",
        -38,
        -42,
        0.75,
        0
      ]
    ],
    "path": [
      [
        0,
        35
      ],
      [
        13,
        34
      ],
      [
        24,
        21
      ],
      [
        20,
        18
      ],
      [
        10,
        4.5
      ],
      [
        0,
        -9
      ],
      [
        0,
        -21
      ]
    ],
    "palette": {
      "ground": 12957069,
      "path": 14270359,
      "sky": 11392751,
      "water": 2725802
    },
    "light": {
      "sun": 16766113,
      "intensity": 2.4,
      "angle": [
        -25,
        35,
        18
      ]
    },
    "season": "autumn",
    "bridge": {
      "a": [
        20,
        18
      ],
      "b": [
        0,
        -9
      ],
      "width": 6.3,
      "rise": 4
    },
    "camera": {
      "offset": [
        2.8,
        5.2,
        15
      ],
      "lookOffset": [
        1,
        7,
        -14
      ],
      "fov": 50
    }
  },
  "4": {
    "n": 4,
    "name": "大水車と積み木の工房谷",
    "country": "スイス",
    "kind": "valley",
    "radius": 40,
    "spawn": [
      0,
      8
    ],
    "hero": [
      0,
      -10
    ],
    "models": [
      [
        "alpineWorkshop",
        -3,
        -14,
        1,
        0
      ],
      [
        "greatWaterwheel",
        10,
        -11,
        1,
        0
      ],
      [
        "workshopAqueduct",
        17,
        -18,
        1,
        0
      ]
    ],
    "path": [
      [
        0,
        24
      ],
      [
        0,
        13
      ],
      [
        0,
        3
      ],
      [
        -2,
        -8
      ],
      [
        -3,
        -14
      ]
    ],
    "palette": {
      "ground": 8559434,
      "path": 12093521,
      "sky": 11196653,
      "water": 5221301
    },
    "light": {
      "sun": 16767915,
      "intensity": 2.5,
      "angle": [
        -28,
        38,
        16
      ]
    },
    "season": "summer",
    "reviewSide": [
      18,
      0
    ]
  },
  "5": {
    "n": 5,
    "name": "大きな果実かごの市場",
    "country": "モロッコ",
    "kind": "market",
    "radius": 38,
    "spawn": [
      0,
      4
    ],
    "hero": [
      0,
      -10
    ],
    "models": [
      [
        "greatFruitMarket",
        0,
        -13,
        1,
        0
      ],
      [
        "moroccanStall",
        -11,
        -1,
        1,
        0.65
      ],
      [
        "moroccanStall",
        11,
        -1,
        1,
        -0.65
      ],
      [
        "moroccanHouse",
        -22,
        -4,
        1,
        0.1
      ],
      [
        "moroccanHouse",
        23,
        -4,
        1,
        -0.1
      ]
    ],
    "path": [
      [
        0,
        24
      ],
      [
        -2,
        13
      ],
      [
        0,
        3
      ],
      [
        0,
        -10
      ]
    ],
    "palette": {
      "ground": 14730906,
      "path": 15259317,
      "sky": 12114411,
      "water": 5814462
    },
    "light": {
      "sun": 16769963,
      "intensity": 2.5,
      "angle": [
        -16,
        45,
        14
      ]
    },
    "season": "summer",
    "reviewSide": [
      18,
      5
    ]
  },
  "6": {
    "n": 6,
    "name": "真珠と珊瑚の海底王国",
    "country": "パラオ",
    "kind": "sea",
    "radius": 42,
    "spawn": [
      0,
      4
    ],
    "hero": [
      0,
      -27
    ],
    "models": [
      [
        "greatPearlShell",
        0,
        -30,
        1.35,
        0
      ],
      [
        "coralArch",
        -12,
        -24,
        0.62,
        0.3
      ],
      [
        "coralArch",
        13,
        -25,
        0.68,
        -0.4
      ],
      [
        "spiralShellSeat",
        -10,
        -4,
        1,
        0.2
      ],
      [
        "spiralShellSeat",
        11,
        -7,
        1,
        -0.3
      ]
    ],
    "path": [
      [
        0,
        24
      ],
      [
        -2,
        13
      ],
      [
        3,
        3
      ],
      [
        0,
        -10
      ],
      [
        0,
        -23
      ],
      [
        0,
        -27
      ]
    ],
    "palette": {
      "ground": 14210225,
      "path": 15720374,
      "sky": 2137005,
      "water": 2465715
    },
    "light": {
      "sun": 11138801,
      "intensity": 2.3,
      "angle": [
        -12,
        45,
        -5
      ]
    },
    "season": "summer"
  },
  "7": {
    "n": 7,
    "name": "雲の庭と風の城",
    "country": "ギリシャ",
    "kind": "sky",
    "radius": 48,
    "spawn": [
      0,
      18
    ],
    "hero": [
      0,
      -20
    ],
    "models": [
      [
        "windCity",
        0,
        -24,
        1,
        0
      ],
      [
        "windSails",
        0,
        -24,
        1,
        0
      ],
      [
        "blueDomePavilion",
        -24,
        -4,
        1,
        0
      ],
      [
        "blueDomePavilion",
        24,
        -5,
        1,
        0
      ],
      [
        "skyAirship",
        39,
        -40,
        0.8,
        0
      ]
    ],
    "path": [
      [
        0,
        28
      ],
      [
        0,
        16
      ],
      [
        0,
        4
      ],
      [
        0,
        -8
      ],
      [
        0,
        -20
      ]
    ],
    "palette": {
      "ground": 15331043,
      "path": 15855074,
      "sky": 5815034,
      "water": 13824255
    },
    "light": {
      "sun": 16773331,
      "intensity": 2.5,
      "angle": [
        -25,
        40,
        20
      ]
    },
    "season": "summer",
    "bridges": [
      {
        "a": [
          0,
          15
        ],
        "b": [
          0,
          -12
        ],
        "width": 7.1,
        "arched": true
      },
      {
        "a": [
          -17,
          -4
        ],
        "b": [
          -3,
          -4
        ],
        "width": 6.2,
        "arched": true
      },
      {
        "a": [
          3,
          -5
        ],
        "b": [
          17,
          -5
        ],
        "width": 6.2,
        "arched": true
      }
    ],
    "camera": {
      "offset": [
        2.8,
        5.2,
        18
      ],
      "lookOffset": [
        1,
        8,
        -14
      ],
      "fov": 50
    }
  },
  "8": {
    "n": 8,
    "name": "星あかりの遊園祭",
    "country": "メキシコ",
    "kind": "festival",
    "radius": 42,
    "spawn": [
      0,
      7
    ],
    "hero": [
      0,
      -7
    ],
    "models": [
      [
        "starCarousel",
        0,
        -10,
        1,
        0
      ],
      [
        "festivalShellStage",
        20,
        -7,
        1,
        -0.2
      ],
      [
        "mexicanHouseA",
        -26,
        -16,
        1,
        0
      ],
      [
        "mexicanHouseB",
        -16,
        -27,
        1,
        0
      ],
      [
        "mexicanHouseA",
        26,
        -24,
        1,
        0
      ],
      [
        "mexicanHouseB",
        11,
        -31,
        1,
        0
      ]
    ],
    "path": [
      [
        0,
        26
      ],
      [
        0,
        15
      ],
      [
        -9,
        3
      ],
      [
        -12,
        -10
      ],
      [
        0,
        -23
      ],
      [
        12,
        -10
      ],
      [
        9,
        3
      ],
      [
        0,
        15
      ]
    ],
    "palette": {
      "ground": 12229504,
      "path": 13808531,
      "sky": 7633579,
      "water": 7959200
    },
    "light": {
      "sun": 16761498,
      "intensity": 1.9,
      "angle": [
        -25,
        14,
        -20
      ]
    },
    "season": "summer"
  }
});
export const CONCEPT_CAMERA = Object.freeze({
  "offset": [
    0,
    5.2,
    15
  ],
  "lookOffset": [
    0,
    7,
    -14
  ],
  "fov": 50
});
