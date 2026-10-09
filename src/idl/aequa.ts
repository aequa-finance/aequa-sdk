/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/aequa.json`.
 */
export type Aequa = {
  "address": "9xhUvFQy1yAnyuZTygfK1nD6naicXQoWMR6doxFxuTbL",
  "metadata": {
    "name": "aequa",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "USDq: a dollar backed by tokenized S&P 500 and Nasdaq-100 ETFs, hedged with short index perps"
  },
  "instructions": [
    {
      "name": "acceptAdmin",
      "discriminator": [
        112,
        42,
        45,
        90,
        116,
        181,
        13,
        170
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "pendingAdmin",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "addCollateral",
      "discriminator": [
        127,
        82,
        121,
        42,
        161,
        176,
        249,
        206
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "mint"
        },
        {
          "name": "collateral",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  108,
                  108,
                  97,
                  116,
                  101,
                  114,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  108,
                  108,
                  97,
                  116,
                  101,
                  114,
                  97,
                  108,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "swapAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  119,
                  97,
                  112,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "transit",
          "docs": [
            "The swap authority's transit account for this mint; anyone can create it, so the setup",
            "creates it (idempotently) and this only checks it."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "swapAuthority"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "listingArgs"
            }
          }
        }
      ]
    },
    {
      "name": "bridgeOut",
      "discriminator": [
        27,
        194,
        57,
        119,
        215,
        165,
        247,
        150
      ],
      "accounts": [
        {
          "name": "keeper",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "reserve",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "buffer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              }
            ]
          }
        },
        {
          "name": "usdcMint",
          "writable": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "messageSentEventData",
          "docs": [
            "A fresh account CCTP writes the message into; it signs, and the keeper pays its rent."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "senderAuthority"
        },
        {
          "name": "denylist"
        },
        {
          "name": "messageTransmitter",
          "writable": true
        },
        {
          "name": "tokenMessenger"
        },
        {
          "name": "remoteTokenMessenger"
        },
        {
          "name": "tokenMinter"
        },
        {
          "name": "localToken",
          "writable": true
        },
        {
          "name": "cctpEventAuthority"
        },
        {
          "name": "messageTransmitterProgram"
        },
        {
          "name": "tokenMessengerMinterProgram"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "maxFee",
          "type": "u64"
        },
        {
          "name": "fast",
          "type": "bool"
        }
      ]
    },
    {
      "name": "buyback",
      "discriminator": [
        106,
        117,
        64,
        30,
        56,
        69,
        7,
        45
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "aequaPool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  101,
                  113,
                  117,
                  97,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "twap",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  97,
                  112
                ]
              }
            ]
          }
        },
        {
          "name": "usdqMint",
          "writable": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "usdcMint",
          "relations": [
            "config"
          ]
        },
        {
          "name": "protocol",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "buffer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              }
            ]
          }
        },
        {
          "name": "aequaPoolVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  101,
                  113,
                  117,
                  97,
                  95,
                  112,
                  111,
                  111,
                  108,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "swap",
          "accounts": [
            {
              "name": "aequaMint",
              "writable": true
            },
            {
              "name": "aequaTokenProgram"
            },
            {
              "name": "swapAuthority"
            },
            {
              "name": "transitUsdc",
              "writable": true
            },
            {
              "name": "transitAequa",
              "writable": true
            },
            {
              "name": "jupiterProgram"
            }
          ]
        },
        {
          "name": "pyth",
          "accounts": [
            {
              "name": "pythProgram",
              "address": "pytd2yyk641x7ak7mkaasSJVXh6YYZnC7wTmtgAyxPt"
            },
            {
              "name": "pythStorage",
              "address": "3rdJbqfnagQ4yx9HXJViD4zc4xpiSqmFsKpPuSCQVyQL"
            },
            {
              "name": "pythTreasury",
              "writable": true
            },
            {
              "name": "instructions",
              "address": "Sysvar1nstructions1111111111111111111111111"
            },
            {
              "name": "systemProgram",
              "address": "11111111111111111111111111111111"
            }
          ]
        }
      ],
      "args": [
        {
          "name": "message",
          "type": "bytes"
        },
        {
          "name": "ed25519Index",
          "type": "u16"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "route",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "claimUsdq",
      "discriminator": [
        72,
        144,
        77,
        108,
        160,
        182,
        208,
        168
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "usdqMint",
          "relations": [
            "config"
          ]
        },
        {
          "name": "userUsdq",
          "writable": true
        },
        {
          "name": "susdqSilo",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  115,
                  100,
                  113,
                  95,
                  115,
                  105,
                  108,
                  111
                ]
              }
            ]
          }
        },
        {
          "name": "cooldown",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  115,
                  100,
                  113,
                  95,
                  99,
                  111,
                  111,
                  108,
                  100,
                  111,
                  119,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "coverDeficit",
      "discriminator": [
        111,
        47,
        68,
        186,
        165,
        82,
        169,
        88
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "reserve",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "aequaPool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  101,
                  113,
                  117,
                  97,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "usdqMint",
          "writable": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "twap",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  97,
                  112
                ]
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "aequaPoolVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  101,
                  113,
                  117,
                  97,
                  95,
                  112,
                  111,
                  111,
                  108,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "slashSale",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  108,
                  97,
                  115,
                  104,
                  95,
                  115,
                  97,
                  108,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "reserveFund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101,
                  95,
                  102,
                  117,
                  110,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "usdqTokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "pyth",
          "accounts": [
            {
              "name": "pythProgram",
              "address": "pytd2yyk641x7ak7mkaasSJVXh6YYZnC7wTmtgAyxPt"
            },
            {
              "name": "pythStorage",
              "address": "3rdJbqfnagQ4yx9HXJViD4zc4xpiSqmFsKpPuSCQVyQL"
            },
            {
              "name": "pythTreasury",
              "writable": true
            },
            {
              "name": "instructions",
              "address": "Sysvar1nstructions1111111111111111111111111"
            },
            {
              "name": "systemProgram",
              "address": "11111111111111111111111111111111"
            }
          ]
        }
      ],
      "args": [
        {
          "name": "message",
          "type": "bytes"
        },
        {
          "name": "ed25519Index",
          "type": "u16"
        }
      ]
    },
    {
      "name": "createSusdqVaults",
      "discriminator": [
        85,
        217,
        42,
        36,
        116,
        150,
        167,
        54
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "usdqMint",
          "relations": [
            "config"
          ]
        },
        {
          "name": "susdqAssets",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  115,
                  100,
                  113,
                  95,
                  97,
                  115,
                  115,
                  101,
                  116,
                  115
                ]
              }
            ]
          }
        },
        {
          "name": "susdqSilo",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  115,
                  100,
                  113,
                  95,
                  115,
                  105,
                  108,
                  111
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createVaults",
      "discriminator": [
        79,
        9,
        204,
        64,
        64,
        120,
        98,
        137
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "usdqMint",
          "relations": [
            "config"
          ]
        },
        {
          "name": "usdcMint",
          "relations": [
            "config"
          ]
        },
        {
          "name": "buffer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              }
            ]
          }
        },
        {
          "name": "landingAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  110,
                  100,
                  105,
                  110,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "landing",
          "docs": [
            "USDC from HyperCore lands here: the associated token account of `landing_authority`,",
            "the form Circle's forwarding service mints into. Anyone can create an associated",
            "account, so the setup creates it (idempotently) and this only checks it."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "landingAuthority"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "swapAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  119,
                  97,
                  112,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "transitUsdc",
          "docs": [
            "The swap authority's USDC transit account, created by the setup like `landing`."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "swapAuthority"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "reserveFund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101,
                  95,
                  102,
                  117,
                  110,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "protocol",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "distribute",
      "discriminator": [
        191,
        44,
        223,
        207,
        164,
        236,
        126,
        61
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "reserve",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "usdqVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  115,
                  100,
                  113,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "usdqMint",
          "writable": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "susdqMint",
          "relations": [
            "config"
          ]
        },
        {
          "name": "susdqAssets",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  115,
                  100,
                  113,
                  95,
                  97,
                  115,
                  115,
                  101,
                  116,
                  115
                ]
              }
            ]
          }
        },
        {
          "name": "reserveFund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101,
                  95,
                  102,
                  117,
                  110,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "protocol",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "buffer",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "pyth",
          "accounts": [
            {
              "name": "pythProgram",
              "address": "pytd2yyk641x7ak7mkaasSJVXh6YYZnC7wTmtgAyxPt"
            },
            {
              "name": "pythStorage",
              "address": "3rdJbqfnagQ4yx9HXJViD4zc4xpiSqmFsKpPuSCQVyQL"
            },
            {
              "name": "pythTreasury",
              "writable": true
            },
            {
              "name": "instructions",
              "address": "Sysvar1nstructions1111111111111111111111111"
            },
            {
              "name": "systemProgram",
              "address": "11111111111111111111111111111111"
            }
          ]
        }
      ],
      "args": [
        {
          "name": "message",
          "type": "bytes"
        },
        {
          "name": "ed25519Index",
          "type": "u16"
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "program",
          "address": "9xhUvFQy1yAnyuZTygfK1nD6naicXQoWMR6doxFxuTbL"
        },
        {
          "name": "programData"
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "reserve",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "usdqVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  115,
                  100,
                  113,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "aequaPool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  101,
                  113,
                  117,
                  97,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "usdqMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  100,
                  113,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "susdqMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  115,
                  100,
                  113,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "initializeArgs"
            }
          }
        }
      ]
    },
    {
      "name": "landUsdc",
      "discriminator": [
        149,
        181,
        199,
        81,
        131,
        198,
        87,
        193
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "reserve",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "usdcMint",
          "relations": [
            "config"
          ]
        },
        {
          "name": "landingAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  110,
                  100,
                  105,
                  110,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "landing",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "landingAuthority"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "buffer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "mintWithCollateral",
      "discriminator": [
        154,
        255,
        140,
        128,
        45,
        111,
        175,
        91
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "reserve",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "collateral",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  108,
                  108,
                  97,
                  116,
                  101,
                  114,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "mint",
          "relations": [
            "collateral"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "collateral"
          ]
        },
        {
          "name": "userXstock",
          "docs": [
            "The user's xStock account; the token program checks the mint and the authority."
          ],
          "writable": true
        },
        {
          "name": "usdqMint",
          "writable": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "userUsdq",
          "writable": true
        },
        {
          "name": "reserveFund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101,
                  95,
                  102,
                  117,
                  110,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "protocol",
          "docs": [
            "program checks."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "aequaStake",
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  101,
                  113,
                  117,
                  97,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "aequaPool",
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  101,
                  113,
                  117,
                  97,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "xstockTokenProgram"
        },
        {
          "name": "pyth",
          "accounts": [
            {
              "name": "pythProgram",
              "address": "pytd2yyk641x7ak7mkaasSJVXh6YYZnC7wTmtgAyxPt"
            },
            {
              "name": "pythStorage",
              "address": "3rdJbqfnagQ4yx9HXJViD4zc4xpiSqmFsKpPuSCQVyQL"
            },
            {
              "name": "pythTreasury",
              "writable": true
            },
            {
              "name": "instructions",
              "address": "Sysvar1nstructions1111111111111111111111111"
            },
            {
              "name": "systemProgram",
              "address": "11111111111111111111111111111111"
            }
          ]
        }
      ],
      "args": [
        {
          "name": "message",
          "type": "bytes"
        },
        {
          "name": "ed25519Index",
          "type": "u16"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "minOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "mintWithUsdc",
      "discriminator": [
        128,
        28,
        133,
        173,
        71,
        142,
        185,
        206
      ],
      "accounts": [
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "usdqMint",
          "writable": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "usdcMint",
          "relations": [
            "config"
          ]
        },
        {
          "name": "userUsdc",
          "writable": true
        },
        {
          "name": "userUsdq",
          "writable": true
        },
        {
          "name": "buffer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              }
            ]
          }
        },
        {
          "name": "reserveFund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101,
                  95,
                  102,
                  117,
                  110,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "protocol",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "aequaStake",
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  101,
                  113,
                  117,
                  97,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "aequaPool",
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  101,
                  113,
                  117,
                  97,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "minOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "observePool",
      "discriminator": [
        75,
        99,
        12,
        129,
        224,
        213,
        32,
        158
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "keeper",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "twap",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  97,
                  112
                ]
              }
            ]
          }
        },
        {
          "name": "poolAequaVault"
        },
        {
          "name": "poolQuoteVault"
        }
      ],
      "args": []
    },
    {
      "name": "pause",
      "discriminator": [
        211,
        22,
        221,
        251,
        74,
        121,
        193,
        47
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "collateral",
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  108,
                  108,
                  97,
                  116,
                  101,
                  114,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "collateral.mint",
                "account": "collateral"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "paths",
          "type": "u32"
        }
      ]
    },
    {
      "name": "redeemForCollateral",
      "discriminator": [
        21,
        37,
        133,
        153,
        1,
        169,
        248,
        188
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "reserve",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "collateral",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  108,
                  108,
                  97,
                  116,
                  101,
                  114,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "mint",
          "relations": [
            "collateral"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "collateral"
          ]
        },
        {
          "name": "userXstock",
          "writable": true
        },
        {
          "name": "usdqMint",
          "writable": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "userUsdq",
          "writable": true
        },
        {
          "name": "reserveFund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101,
                  95,
                  102,
                  117,
                  110,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "protocol",
          "docs": [
            "program checks."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "aequaStake",
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  101,
                  113,
                  117,
                  97,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "aequaPool",
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  101,
                  113,
                  117,
                  97,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "xstockTokenProgram"
        },
        {
          "name": "pyth",
          "accounts": [
            {
              "name": "pythProgram",
              "address": "pytd2yyk641x7ak7mkaasSJVXh6YYZnC7wTmtgAyxPt"
            },
            {
              "name": "pythStorage",
              "address": "3rdJbqfnagQ4yx9HXJViD4zc4xpiSqmFsKpPuSCQVyQL"
            },
            {
              "name": "pythTreasury",
              "writable": true
            },
            {
              "name": "instructions",
              "address": "Sysvar1nstructions1111111111111111111111111"
            },
            {
              "name": "systemProgram",
              "address": "11111111111111111111111111111111"
            }
          ]
        }
      ],
      "args": [
        {
          "name": "message",
          "type": "bytes"
        },
        {
          "name": "ed25519Index",
          "type": "u16"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "minOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "redeemForUsdc",
      "discriminator": [
        150,
        9,
        215,
        220,
        255,
        157,
        74,
        78
      ],
      "accounts": [
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "usdqMint",
          "writable": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "usdcMint",
          "relations": [
            "config"
          ]
        },
        {
          "name": "userUsdq",
          "writable": true
        },
        {
          "name": "userUsdc",
          "writable": true
        },
        {
          "name": "buffer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              }
            ]
          }
        },
        {
          "name": "reserveFund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101,
                  95,
                  102,
                  117,
                  110,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "protocol",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "aequaStake",
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  101,
                  113,
                  117,
                  97,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "aequaPool",
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  101,
                  113,
                  117,
                  97,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "minOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "reportHedge",
      "discriminator": [
        13,
        204,
        41,
        9,
        141,
        39,
        112,
        82
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "reporter",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "reserve",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "reportArgs"
            }
          }
        }
      ]
    },
    {
      "name": "sellSlashed",
      "discriminator": [
        120,
        205,
        120,
        218,
        66,
        230,
        98,
        206
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "reserve",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "aequaPool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  101,
                  113,
                  117,
                  97,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "twap",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  97,
                  112
                ]
              }
            ]
          }
        },
        {
          "name": "usdqMint",
          "writable": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "usdcMint",
          "relations": [
            "config"
          ]
        },
        {
          "name": "slashSale",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  108,
                  97,
                  115,
                  104,
                  95,
                  115,
                  97,
                  108,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "buffer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              }
            ]
          }
        },
        {
          "name": "reserveFund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101,
                  95,
                  102,
                  117,
                  110,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "swap",
          "accounts": [
            {
              "name": "aequaMint",
              "writable": true
            },
            {
              "name": "aequaTokenProgram"
            },
            {
              "name": "swapAuthority"
            },
            {
              "name": "transitUsdc",
              "writable": true
            },
            {
              "name": "transitAequa",
              "writable": true
            },
            {
              "name": "jupiterProgram"
            }
          ]
        },
        {
          "name": "pyth",
          "accounts": [
            {
              "name": "pythProgram",
              "address": "pytd2yyk641x7ak7mkaasSJVXh6YYZnC7wTmtgAyxPt"
            },
            {
              "name": "pythStorage",
              "address": "3rdJbqfnagQ4yx9HXJViD4zc4xpiSqmFsKpPuSCQVyQL"
            },
            {
              "name": "pythTreasury",
              "writable": true
            },
            {
              "name": "instructions",
              "address": "Sysvar1nstructions1111111111111111111111111"
            },
            {
              "name": "systemProgram",
              "address": "11111111111111111111111111111111"
            }
          ]
        }
      ],
      "args": [
        {
          "name": "message",
          "type": "bytes"
        },
        {
          "name": "ed25519Index",
          "type": "u16"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "route",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "setAequa",
      "discriminator": [
        146,
        131,
        124,
        115,
        109,
        53,
        80,
        134
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "mint"
        },
        {
          "name": "quoteMint"
        },
        {
          "name": "poolAequaVault"
        },
        {
          "name": "poolQuoteVault"
        },
        {
          "name": "aequaPoolVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  101,
                  113,
                  117,
                  97,
                  95,
                  112,
                  111,
                  111,
                  108,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "slashSale",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  108,
                  97,
                  115,
                  104,
                  95,
                  115,
                  97,
                  108,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "twap",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  119,
                  97,
                  112
                ]
              }
            ]
          }
        },
        {
          "name": "swapAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  119,
                  97,
                  112,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "transitAequa",
          "docs": [
            "The transit account buybacks and slash sales pass through."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "swapAuthority"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "quoteTokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "aequaArgs"
            }
          }
        }
      ]
    },
    {
      "name": "setBridgeRoute",
      "discriminator": [
        221,
        254,
        170,
        5,
        38,
        72,
        0,
        4
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "bridgeArgs"
            }
          }
        }
      ]
    },
    {
      "name": "setCollateral",
      "discriminator": [
        78,
        238,
        107,
        150,
        31,
        244,
        158,
        27
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "collateral",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  108,
                  108,
                  97,
                  116,
                  101,
                  114,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "collateral.mint",
                "account": "collateral"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "listingArgs"
            }
          }
        }
      ]
    },
    {
      "name": "setParams",
      "discriminator": [
        27,
        234,
        178,
        52,
        147,
        2,
        187,
        141
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "params"
            }
          }
        }
      ]
    },
    {
      "name": "setRoles",
      "discriminator": [
        119,
        86,
        129,
        161,
        55,
        23,
        250,
        12
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "guardian",
          "type": "pubkey"
        },
        {
          "name": "keeper",
          "type": "pubkey"
        },
        {
          "name": "reporter",
          "type": "pubkey"
        },
        {
          "name": "pendingAdmin",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "setTokenMetadata",
      "discriminator": [
        218,
        126,
        122,
        193,
        220,
        149,
        103,
        39
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "usdqVault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  115,
                  100,
                  113,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "metadata",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "const",
                "value": [
                  11,
                  112,
                  101,
                  177,
                  227,
                  209,
                  124,
                  69,
                  56,
                  157,
                  82,
                  127,
                  107,
                  4,
                  195,
                  205,
                  88,
                  184,
                  108,
                  115,
                  26,
                  160,
                  253,
                  181,
                  73,
                  182,
                  209,
                  188,
                  3,
                  248,
                  41,
                  70
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                11,
                112,
                101,
                177,
                227,
                209,
                124,
                69,
                56,
                157,
                82,
                127,
                107,
                4,
                195,
                205,
                88,
                184,
                108,
                115,
                26,
                160,
                253,
                181,
                73,
                182,
                209,
                188,
                3,
                248,
                41,
                70
              ]
            }
          }
        },
        {
          "name": "tokenMetadataProgram",
          "address": "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "tokenMetadataArgs"
            }
          }
        }
      ]
    },
    {
      "name": "stakeAequa",
      "discriminator": [
        167,
        143,
        23,
        180,
        151,
        143,
        135,
        71
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "aequaPool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  101,
                  113,
                  117,
                  97,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "aequaStake",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  101,
                  113,
                  117,
                  97,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "userAequa",
          "writable": true
        },
        {
          "name": "aequaPoolVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  101,
                  113,
                  117,
                  97,
                  95,
                  112,
                  111,
                  111,
                  108,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "minShares",
          "type": "u64"
        }
      ]
    },
    {
      "name": "stakeUsdq",
      "discriminator": [
        165,
        197,
        163,
        170,
        81,
        225,
        145,
        107
      ],
      "accounts": [
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "usdqVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  115,
                  100,
                  113,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "usdqMint",
          "relations": [
            "config"
          ]
        },
        {
          "name": "susdqMint",
          "writable": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "userUsdq",
          "writable": true
        },
        {
          "name": "userSusdq",
          "writable": true
        },
        {
          "name": "susdqAssets",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  115,
                  100,
                  113,
                  95,
                  97,
                  115,
                  115,
                  101,
                  116,
                  115
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "minShares",
          "type": "u64"
        }
      ]
    },
    {
      "name": "startAequaUnstake",
      "discriminator": [
        59,
        20,
        100,
        93,
        173,
        59,
        21,
        182
      ],
      "accounts": [
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "aequaStake",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  101,
                  113,
                  117,
                  97,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "startUsdqCooldown",
      "discriminator": [
        0,
        173,
        201,
        145,
        65,
        148,
        227,
        180
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "usdqVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  115,
                  100,
                  113,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "usdqMint",
          "relations": [
            "config"
          ]
        },
        {
          "name": "susdqMint",
          "writable": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "userSusdq",
          "writable": true
        },
        {
          "name": "susdqAssets",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  115,
                  100,
                  113,
                  95,
                  97,
                  115,
                  115,
                  101,
                  116,
                  115
                ]
              }
            ]
          }
        },
        {
          "name": "susdqSilo",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  115,
                  100,
                  113,
                  95,
                  115,
                  105,
                  108,
                  111
                ]
              }
            ]
          }
        },
        {
          "name": "cooldown",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  115,
                  100,
                  113,
                  95,
                  99,
                  111,
                  111,
                  108,
                  100,
                  111,
                  119,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "shares",
          "type": "u64"
        }
      ]
    },
    {
      "name": "swap",
      "docs": [
        "The keeper's swap between the buffer and a collateral vault. The Jupiter route's",
        "accounts follow as remaining accounts."
      ],
      "discriminator": [
        248,
        198,
        158,
        145,
        225,
        117,
        135,
        200
      ],
      "accounts": [
        {
          "name": "keeper",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "collateral",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  108,
                  108,
                  97,
                  116,
                  101,
                  114,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "mint",
          "relations": [
            "collateral"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "collateral"
          ]
        },
        {
          "name": "usdcMint",
          "relations": [
            "config"
          ]
        },
        {
          "name": "buffer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              }
            ]
          }
        },
        {
          "name": "swapAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  119,
                  97,
                  112,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "transitUsdc",
          "writable": true
        },
        {
          "name": "transitXstock",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "xstockTokenProgram"
        },
        {
          "name": "jupiterProgram"
        },
        {
          "name": "pyth",
          "accounts": [
            {
              "name": "pythProgram",
              "address": "pytd2yyk641x7ak7mkaasSJVXh6YYZnC7wTmtgAyxPt"
            },
            {
              "name": "pythStorage",
              "address": "3rdJbqfnagQ4yx9HXJViD4zc4xpiSqmFsKpPuSCQVyQL"
            },
            {
              "name": "pythTreasury",
              "writable": true
            },
            {
              "name": "instructions",
              "address": "Sysvar1nstructions1111111111111111111111111"
            },
            {
              "name": "systemProgram",
              "address": "11111111111111111111111111111111"
            }
          ]
        }
      ],
      "args": [
        {
          "name": "message",
          "type": "bytes"
        },
        {
          "name": "ed25519Index",
          "type": "u16"
        },
        {
          "name": "buy",
          "type": "bool"
        },
        {
          "name": "amountIn",
          "type": "u64"
        },
        {
          "name": "route",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "unpause",
      "discriminator": [
        169,
        144,
        4,
        38,
        10,
        141,
        188,
        255
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "paths",
          "type": "u32"
        }
      ]
    },
    {
      "name": "unpauseCollateral",
      "discriminator": [
        245,
        174,
        45,
        201,
        186,
        194,
        172,
        112
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "collateral",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  108,
                  108,
                  97,
                  116,
                  101,
                  114,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "collateral.mint",
                "account": "collateral"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "withdrawAequa",
      "discriminator": [
        53,
        173,
        66,
        93,
        23,
        6,
        214,
        36
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "aequaPool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  101,
                  113,
                  117,
                  97,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "aequaStake",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  101,
                  113,
                  117,
                  97,
                  95,
                  115,
                  116,
                  97,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "userAequa",
          "writable": true
        },
        {
          "name": "aequaPoolVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  101,
                  113,
                  117,
                  97,
                  95,
                  112,
                  111,
                  111,
                  108,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "aequaPool",
      "discriminator": [
        139,
        252,
        55,
        200,
        51,
        172,
        50,
        249
      ]
    },
    {
      "name": "aequaStake",
      "discriminator": [
        24,
        88,
        143,
        18,
        168,
        164,
        187,
        206
      ]
    },
    {
      "name": "collateral",
      "discriminator": [
        123,
        130,
        234,
        63,
        255,
        240,
        255,
        92
      ]
    },
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "reserve",
      "discriminator": [
        43,
        242,
        204,
        202,
        26,
        247,
        59,
        127
      ]
    },
    {
      "name": "twap",
      "discriminator": [
        79,
        156,
        152,
        34,
        242,
        104,
        123,
        152
      ]
    },
    {
      "name": "usdqCooldown",
      "discriminator": [
        169,
        30,
        98,
        207,
        226,
        78,
        225,
        253
      ]
    },
    {
      "name": "usdqVault",
      "discriminator": [
        179,
        196,
        141,
        240,
        255,
        206,
        193,
        23
      ]
    }
  ],
  "events": [
    {
      "name": "aequaStaked",
      "discriminator": [
        31,
        205,
        123,
        218,
        231,
        116,
        247,
        52
      ]
    },
    {
      "name": "aequaUnstakeStarted",
      "discriminator": [
        200,
        165,
        75,
        175,
        53,
        1,
        158,
        231
      ]
    },
    {
      "name": "aequaWithdrawn",
      "discriminator": [
        46,
        207,
        227,
        42,
        220,
        248,
        25,
        92
      ]
    },
    {
      "name": "boughtBack",
      "discriminator": [
        188,
        156,
        61,
        154,
        116,
        184,
        186,
        21
      ]
    },
    {
      "name": "bridgedOut",
      "discriminator": [
        180,
        11,
        234,
        80,
        108,
        53,
        208,
        189
      ]
    },
    {
      "name": "deficitCovered",
      "discriminator": [
        213,
        208,
        5,
        40,
        54,
        111,
        109,
        198
      ]
    },
    {
      "name": "distributed",
      "discriminator": [
        10,
        212,
        24,
        78,
        35,
        202,
        182,
        134
      ]
    },
    {
      "name": "hedgeReported",
      "discriminator": [
        25,
        42,
        162,
        203,
        74,
        255,
        202,
        84
      ]
    },
    {
      "name": "landed",
      "discriminator": [
        150,
        49,
        54,
        234,
        26,
        218,
        130,
        103
      ]
    },
    {
      "name": "minted",
      "discriminator": [
        174,
        131,
        21,
        57,
        88,
        117,
        114,
        121
      ]
    },
    {
      "name": "paramsChanged",
      "discriminator": [
        174,
        49,
        9,
        64,
        58,
        171,
        241,
        24
      ]
    },
    {
      "name": "pathsPaused",
      "discriminator": [
        64,
        59,
        84,
        243,
        58,
        196,
        91,
        20
      ]
    },
    {
      "name": "redeemed",
      "discriminator": [
        14,
        29,
        183,
        71,
        31,
        165,
        107,
        38
      ]
    },
    {
      "name": "slashSold",
      "discriminator": [
        81,
        19,
        89,
        148,
        15,
        201,
        75,
        72
      ]
    },
    {
      "name": "swapped",
      "discriminator": [
        217,
        52,
        52,
        83,
        147,
        135,
        96,
        109
      ]
    },
    {
      "name": "usdqClaimed",
      "discriminator": [
        39,
        23,
        114,
        23,
        223,
        1,
        116,
        64
      ]
    },
    {
      "name": "usdqCooldownStarted",
      "discriminator": [
        107,
        176,
        23,
        109,
        248,
        79,
        104,
        161
      ]
    },
    {
      "name": "usdqStaked",
      "discriminator": [
        30,
        49,
        204,
        24,
        53,
        92,
        255,
        36
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "zeroAmount",
      "msg": "Enter an amount"
    },
    {
      "code": 6001,
      "name": "insufficientFunds",
      "msg": "The balance is lower than that"
    },
    {
      "code": 6002,
      "name": "slippageExceeded",
      "msg": "The amount out is below the minimum asked for"
    },
    {
      "code": 6003,
      "name": "capacityExceeded",
      "msg": "This hour's capacity on this path was used in the meantime"
    },
    {
      "code": 6004,
      "name": "supplyCapExceeded",
      "msg": "That would take USDq past its supply ceiling"
    },
    {
      "code": 6005,
      "name": "spotCapExceeded",
      "msg": "That would take this collateral past its spot cap"
    },
    {
      "code": 6006,
      "name": "bufferInsufficient",
      "msg": "The buffer holds less than that right now"
    },
    {
      "code": 6007,
      "name": "vaultInsufficient",
      "msg": "The vault holds less of this collateral than that"
    },
    {
      "code": 6008,
      "name": "collateralNotLive",
      "msg": "No fresh price for this collateral: the session is closed"
    },
    {
      "code": 6009,
      "name": "hedgeNotLive",
      "msg": "The hedge report is stale or the hedge market is paused"
    },
    {
      "code": 6010,
      "name": "corporateActionWindow",
      "msg": "This collateral is inside a corporate-action window"
    },
    {
      "code": 6011,
      "name": "issuerPaused",
      "msg": "The issuer has paused this collateral's mint"
    },
    {
      "code": 6012,
      "name": "collateralNotAdmissible",
      "msg": "The collateral mint fails an admission check"
    },
    {
      "code": 6013,
      "name": "stalePrice",
      "msg": "The signed price is older than the freshness limit"
    },
    {
      "code": 6014,
      "name": "invalidPythMessage",
      "msg": "The Pyth message could not be read"
    },
    {
      "code": 6015,
      "name": "wrongPythChannel",
      "msg": "The Pyth message is on a channel slower than 200 ms"
    },
    {
      "code": 6016,
      "name": "invalidPythPrice",
      "msg": "The Pyth price is missing or not positive"
    },
    {
      "code": 6017,
      "name": "cooldownActive",
      "msg": "The cooldown is still running"
    },
    {
      "code": 6018,
      "name": "nothingToClaim",
      "msg": "There is nothing to claim"
    },
    {
      "code": 6019,
      "name": "nothingStaked",
      "msg": "There is no stake to unstake"
    },
    {
      "code": 6020,
      "name": "positionCooling",
      "msg": "The position is cooling down"
    },
    {
      "code": 6021,
      "name": "windowNotOpen",
      "msg": "The withdraw window isn't open"
    },
    {
      "code": 6022,
      "name": "aequaNotSet",
      "msg": "AEQUA has not been set up yet"
    },
    {
      "code": 6023,
      "name": "notDue",
      "msg": "Not due yet"
    },
    {
      "code": 6024,
      "name": "nothingToMove",
      "msg": "Nothing to move"
    },
    {
      "code": 6025,
      "name": "deficitNotHeld",
      "msg": "The deficit has not held long enough"
    },
    {
      "code": 6026,
      "name": "slashCapReached",
      "msg": "The slash cap for the rolling window is used"
    },
    {
      "code": 6027,
      "name": "twapBound",
      "msg": "The fill is outside the bound around the TWAP"
    },
    {
      "code": 6028,
      "name": "twapNotReady",
      "msg": "Not enough price observations for the TWAP"
    },
    {
      "code": 6029,
      "name": "reportOutOfOrder",
      "msg": "The report is older than the last one"
    },
    {
      "code": 6030,
      "name": "invalidRoute",
      "msg": "The swap route is not a Jupiter route over the expected accounts"
    },
    {
      "code": 6031,
      "name": "swapBelowMinimum",
      "msg": "The swap returned less than the Pyth price allows"
    },
    {
      "code": 6032,
      "name": "swapOverspent",
      "msg": "The swap spent more than it was given"
    },
    {
      "code": 6033,
      "name": "bridgeNotSet",
      "msg": "The bridge route is not set"
    },
    {
      "code": 6034,
      "name": "unauthorized",
      "msg": "The signer does not hold this role"
    },
    {
      "code": 6035,
      "name": "paused",
      "msg": "This path is paused"
    },
    {
      "code": 6036,
      "name": "paramOutOfRange",
      "msg": "A parameter is outside its hard-coded range"
    },
    {
      "code": 6037,
      "name": "tooManyCollaterals",
      "msg": "The collateral list is full"
    },
    {
      "code": 6038,
      "name": "collateralMismatch",
      "msg": "The collateral accounts don't match the listing"
    },
    {
      "code": 6039,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6040,
      "name": "reportTimeOutOfRange",
      "msg": "The report's HyperCore time is outside the accepted range"
    }
  ],
  "types": [
    {
      "name": "aequaArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "docs": [
              "The designated pool and its two reserve accounts."
            ],
            "type": "pubkey"
          },
          {
            "name": "poolAequaVault",
            "type": "pubkey"
          },
          {
            "name": "poolQuoteVault",
            "type": "pubkey"
          },
          {
            "name": "quoteFeed",
            "docs": [
              "Zero when the pool's quote asset is a dollar; otherwise its Pyth Pro feed."
            ],
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "aequaPool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "base",
            "docs": [
              "Vested AEQUA in the pool. Tokens sent straight to the vault don't count."
            ],
            "type": "u64"
          },
          {
            "name": "stream",
            "type": {
              "defined": {
                "name": "vesting"
              }
            }
          },
          {
            "name": "totalShares",
            "type": "u64"
          },
          {
            "name": "usdqSpent",
            "type": "u64"
          },
          {
            "name": "aequaBought",
            "type": "u64"
          },
          {
            "name": "aequaBurned",
            "type": "u64"
          },
          {
            "name": "aequaStreamed",
            "type": "u64"
          },
          {
            "name": "buybacks",
            "type": "u64"
          },
          {
            "name": "buybackBucket",
            "docs": [
              "What `buyback` may still spend: `buyback_max_chunk` an hour, refilled continuously, so",
              "small calls can't use up the hour."
            ],
            "type": {
              "defined": {
                "name": "bucket"
              }
            }
          },
          {
            "name": "slashes",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "slashRecord"
                  }
                },
                32
              ]
            }
          },
          {
            "name": "slashedTotal",
            "type": "u64"
          },
          {
            "name": "slashSoldTotal",
            "type": "u64"
          },
          {
            "name": "slashUsdqBurned",
            "type": "u64"
          },
          {
            "name": "slashBucket",
            "docs": [
              "What `sell_slashed` may still sell, in dollars at the TWAP: `buyback_max_chunk` an hour."
            ],
            "type": {
              "defined": {
                "name": "bucket"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                48
              ]
            }
          }
        ]
      }
    },
    {
      "name": "aequaSetup",
      "docs": [
        "The AEQUA side, set once the token exists."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "tokenProgram",
            "type": "pubkey"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "transit",
            "docs": [
              "The swap authority's AEQUA transit account."
            ],
            "type": "pubkey"
          },
          {
            "name": "pool",
            "docs": [
              "The designated pool the buyback prices against, and its two reserves."
            ],
            "type": "pubkey"
          },
          {
            "name": "poolAequaVault",
            "type": "pubkey"
          },
          {
            "name": "poolQuoteVault",
            "type": "pubkey"
          },
          {
            "name": "quoteMint",
            "docs": [
              "The pool's quote asset and how it converts to dollars."
            ],
            "type": "pubkey"
          },
          {
            "name": "quoteDecimals",
            "type": "u8"
          },
          {
            "name": "quoteFeed",
            "docs": [
              "Zero when the quote asset is a dollar (USDC, USDq); otherwise a Pyth Pro feed for it."
            ],
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "aequaStake",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "shares",
            "type": "u64"
          },
          {
            "name": "cooldownStart",
            "docs": [
              "When unstaking started; zero for an active position."
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "aequaStaked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "aequa",
            "type": "u64"
          },
          {
            "name": "shares",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "aequaUnstakeStarted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "shares",
            "type": "u64"
          },
          {
            "name": "windowOpens",
            "type": "i64"
          },
          {
            "name": "windowCloses",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "aequaWithdrawn",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "aequa",
            "type": "u64"
          },
          {
            "name": "shares",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "boughtBack",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "usdqIn",
            "type": "u64"
          },
          {
            "name": "aequaOut",
            "type": "u64"
          },
          {
            "name": "burned",
            "type": "u64"
          },
          {
            "name": "streamed",
            "type": "u64"
          },
          {
            "name": "twapE12",
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "bridgeArgs",
      "docs": [
        "`set_bridge_route`'s arguments: the hedge account on HyperCore and the fee cap."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recipient",
            "type": {
              "array": [
                "u8",
                20
              ]
            }
          },
          {
            "name": "maxFeeBps",
            "type": "u16"
          },
          {
            "name": "maxFeeFlat",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "bridgeRoute",
      "docs": [
        "Where `bridge_out` sends USDC: a Circle CCTP V2 burn to HyperEVM whose hook",
        "names the hedge account, so Circle's CctpForwarder mints and credits it on HyperCore."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tokenMessengerMinter",
            "type": "pubkey"
          },
          {
            "name": "messageTransmitter",
            "type": "pubkey"
          },
          {
            "name": "destinationDomain",
            "docs": [
              "HyperEVM's CCTP domain (19)."
            ],
            "type": "u32"
          },
          {
            "name": "mintRecipient",
            "docs": [
              "The CctpForwarder, left-padded to 32 bytes; also the only allowed caller."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "destinationCaller",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "maxFeeBps",
            "docs": [
              "The keeper's fee may be at most `amount × max_fee_bps / 10,000 + max_fee_flat`."
            ],
            "type": "u16"
          },
          {
            "name": "maxFeeFlat",
            "type": "u64"
          },
          {
            "name": "hookLen",
            "docs": [
              "The forwarding hook: \"cctp-forward\", version 0, the hedge account and its dex."
            ],
            "type": "u8"
          },
          {
            "name": "hookData",
            "type": {
              "array": [
                "u8",
                96
              ]
            }
          }
        ]
      }
    },
    {
      "name": "bridgedOut",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "bridgedOutTotal",
            "type": "u64"
          },
          {
            "name": "message",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "bucket",
      "docs": [
        "An hourly token bucket: `available = min(cap, available + cap × elapsed / 3600)`."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "available",
            "type": "u64"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "bumps",
      "docs": [
        "Bumps of the program's PDAs, so signing never searches for one."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "config",
            "type": "u8"
          },
          {
            "name": "reserve",
            "type": "u8"
          },
          {
            "name": "usdqVault",
            "type": "u8"
          },
          {
            "name": "aequaPool",
            "type": "u8"
          },
          {
            "name": "usdqMint",
            "type": "u8"
          },
          {
            "name": "susdqMint",
            "type": "u8"
          },
          {
            "name": "buffer",
            "type": "u8"
          },
          {
            "name": "landing",
            "type": "u8"
          },
          {
            "name": "susdqAssets",
            "type": "u8"
          },
          {
            "name": "susdqSilo",
            "type": "u8"
          },
          {
            "name": "reserveFund",
            "type": "u8"
          },
          {
            "name": "protocol",
            "type": "u8"
          },
          {
            "name": "aequaPoolVault",
            "type": "u8"
          },
          {
            "name": "slashSale",
            "type": "u8"
          },
          {
            "name": "swapAuthority",
            "type": "u8"
          },
          {
            "name": "twap",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "collateral",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "tokenProgram",
            "type": "pubkey"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "index",
            "docs": [
              "Position in `Config::collaterals` and in the hedge report's arrays."
            ],
            "type": "u8"
          },
          {
            "name": "paused",
            "docs": [
              "Stopped by the guardian; the USDC paths keep running."
            ],
            "type": "bool"
          },
          {
            "name": "feed",
            "docs": [
              "The ETF's Pyth Pro feed (SPY 1398, QQQ 1363). One feed spans every session; each",
              "update names its session."
            ],
            "type": "u32"
          },
          {
            "name": "bandsBps",
            "docs": [
              "Band per session: regular, pre-market, post-market, overnight, in bps (5 / 15 / 15 / 25)."
            ],
            "type": {
              "array": [
                "u16",
                4
              ]
            }
          },
          {
            "name": "spotCap",
            "docs": [
              "Spot value cap, in dollars at 6 decimals."
            ],
            "type": "u64"
          },
          {
            "name": "hourlyCap",
            "docs": [
              "Capacity per hour for each xStock path, in dollars at 6 decimals."
            ],
            "type": "u64"
          },
          {
            "name": "mintBucket",
            "type": {
              "defined": {
                "name": "bucket"
              }
            }
          },
          {
            "name": "redeemBucket",
            "type": {
              "defined": {
                "name": "bucket"
              }
            }
          },
          {
            "name": "perp",
            "docs": [
              "The hedge market, e.g. \"xyz:SP500\", and its HyperCore asset id."
            ],
            "type": {
              "array": [
                "u8",
                24
              ]
            }
          },
          {
            "name": "perpAsset",
            "type": "u32"
          },
          {
            "name": "transit",
            "docs": [
              "The swap authority's transit account for this collateral."
            ],
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    },
    {
      "name": "config",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "pendingAdmin",
            "type": "pubkey"
          },
          {
            "name": "guardian",
            "type": "pubkey"
          },
          {
            "name": "keeper",
            "type": "pubkey"
          },
          {
            "name": "reporter",
            "type": "pubkey"
          },
          {
            "name": "usdqMint",
            "type": "pubkey"
          },
          {
            "name": "susdqMint",
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "type": "pubkey"
          },
          {
            "name": "paused",
            "docs": [
              "Paths stopped by the guardian (`path::*` bits)."
            ],
            "type": "u32"
          },
          {
            "name": "params",
            "type": {
              "defined": {
                "name": "params"
              }
            }
          },
          {
            "name": "usdcBucket",
            "type": {
              "defined": {
                "name": "bucket"
              }
            }
          },
          {
            "name": "spotCapTotal",
            "docs": [
              "Σ spot_cap over the listed collateral; the USDq ceiling is this over the spot share."
            ],
            "type": "u64"
          },
          {
            "name": "collateralCount",
            "type": "u8"
          },
          {
            "name": "collaterals",
            "type": {
              "array": [
                "pubkey",
                8
              ]
            }
          },
          {
            "name": "bridge",
            "type": {
              "defined": {
                "name": "bridgeRoute"
              }
            }
          },
          {
            "name": "aequa",
            "type": {
              "defined": {
                "name": "aequaSetup"
              }
            }
          },
          {
            "name": "bumps",
            "type": {
              "defined": {
                "name": "bumps"
              }
            }
          },
          {
            "name": "transitUsdc",
            "docs": [
              "The swap authority's USDC transit account."
            ],
            "type": "pubkey"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          }
        ]
      }
    },
    {
      "name": "deficitCovered",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fundBurned",
            "docs": [
              "Reserve Fund USDq burned against the shortfall first."
            ],
            "type": "u64"
          },
          {
            "name": "aequa",
            "docs": [
              "AEQUA moved to the slash-sale vault."
            ],
            "type": "u64"
          },
          {
            "name": "deficit",
            "docs": [
              "The shortfall left for the slash sale to raise."
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "distributed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nav",
            "type": "i64"
          },
          {
            "name": "supply",
            "type": "u64"
          },
          {
            "name": "surplus",
            "type": "i64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "toSusdq",
            "type": "u64"
          },
          {
            "name": "toReserveFund",
            "type": "u64"
          },
          {
            "name": "toProtocol",
            "type": "u64"
          },
          {
            "name": "burned",
            "docs": [
              "USDq burned from the Reserve Fund against a deficit."
            ],
            "type": "u64"
          },
          {
            "name": "deficitStreak",
            "type": "u8"
          },
          {
            "name": "susdqRateE12",
            "docs": [
              "USDq per sUSDq after the distribution, at 1e12."
            ],
            "type": "u128"
          },
          {
            "name": "at",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "hedgeReport",
      "docs": [
        "The reporter's latest figures for the hedge account."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "accountValue",
            "docs": [
              "Account value on HyperCore, dollars at 6 decimals."
            ],
            "type": "i64"
          },
          {
            "name": "shortNotional",
            "docs": [
              "Short notional per collateral index, dollars at 6 decimals."
            ],
            "type": {
              "array": [
                "u64",
                8
              ]
            }
          },
          {
            "name": "marketLive",
            "docs": [
              "Bit i: the perp of collateral i trades in its external session."
            ],
            "type": "u8"
          },
          {
            "name": "creditedTotal",
            "docs": [
              "USDC credited to the hedge account from `bridge_out`, cumulative."
            ],
            "type": "u64"
          },
          {
            "name": "withdrawnTotal",
            "docs": [
              "USDC withdrawn from the hedge account towards the landing account, cumulative."
            ],
            "type": "u64"
          },
          {
            "name": "hlTime",
            "docs": [
              "HyperCore's time for these figures, in milliseconds."
            ],
            "type": "i64"
          },
          {
            "name": "reportedAt",
            "docs": [
              "Solana time the report landed."
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "hedgeReported",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "accountValue",
            "type": "i64"
          },
          {
            "name": "marketLive",
            "type": "u8"
          },
          {
            "name": "creditedTotal",
            "type": "u64"
          },
          {
            "name": "withdrawnTotal",
            "type": "u64"
          },
          {
            "name": "hlTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "initializeArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "guardian",
            "type": "pubkey"
          },
          {
            "name": "keeper",
            "type": "pubkey"
          },
          {
            "name": "reporter",
            "type": "pubkey"
          },
          {
            "name": "params",
            "type": {
              "defined": {
                "name": "params"
              }
            }
          }
        ]
      }
    },
    {
      "name": "landed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "landedTotal",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "listingArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "feed",
            "docs": [
              "The ETF's Pyth Pro feed id."
            ],
            "type": "u32"
          },
          {
            "name": "bandsBps",
            "type": {
              "array": [
                "u16",
                4
              ]
            }
          },
          {
            "name": "spotCap",
            "type": "u64"
          },
          {
            "name": "hourlyCap",
            "type": "u64"
          },
          {
            "name": "perp",
            "type": {
              "array": [
                "u8",
                24
              ]
            }
          },
          {
            "name": "perpAsset",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "minted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "asset",
            "docs": [
              "USDC or the collateral mint."
            ],
            "type": "pubkey"
          },
          {
            "name": "amountIn",
            "type": "u64"
          },
          {
            "name": "usdqOut",
            "type": "u64"
          },
          {
            "name": "fee",
            "type": "u64"
          },
          {
            "name": "feeTo",
            "type": "u8"
          },
          {
            "name": "feeBps",
            "type": "u16"
          },
          {
            "name": "priceE8",
            "docs": [
              "The price used, at 1e8, and its session (0 for USDC)."
            ],
            "type": "u64"
          },
          {
            "name": "session",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "params",
      "docs": [
        "Every parameter governance can set, each inside its range in `params.rs`."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "leverageBps",
            "docs": [
              "Short leverage: band low, target, band high, as leverage × 10,000 (2x, 3x, 4x)."
            ],
            "type": {
              "array": [
                "u32",
                3
              ]
            }
          },
          {
            "name": "bufferBps",
            "docs": [
              "Liquidity buffer: band low, target, band high, in bps of supply (5%, 10%, 15%)."
            ],
            "type": {
              "array": [
                "u16",
                3
              ]
            }
          },
          {
            "name": "deltaToleranceBps",
            "docs": [
              "Spot against short, per pair, in bps of supply (0.5%)."
            ],
            "type": "u16"
          },
          {
            "name": "usdcHourlyCap",
            "docs": [
              "USDC mint capacity per hour, in dollars at 6 decimals."
            ],
            "type": "u64"
          },
          {
            "name": "baseFeeBps",
            "docs": [
              "Mint and redeem fee without an active stAEQUA position."
            ],
            "type": "u16"
          },
          {
            "name": "tierStake",
            "docs": [
              "Active stAEQUA, in whole AEQUA, for each lower fee tier."
            ],
            "type": {
              "array": [
                "u64",
                2
              ]
            }
          },
          {
            "name": "tierFeeBps",
            "type": {
              "array": [
                "u16",
                2
              ]
            }
          },
          {
            "name": "keeperSlippageBps",
            "docs": [
              "The keeper's swaps must clear the Pyth price less this."
            ],
            "type": "u16"
          },
          {
            "name": "pythFreshnessSecs",
            "type": "u32"
          },
          {
            "name": "reportFreshnessSecs",
            "type": "u32"
          },
          {
            "name": "distributionIntervalSecs",
            "type": "u32"
          },
          {
            "name": "susdqVestingSecs",
            "type": "u32"
          },
          {
            "name": "cushionBps",
            "docs": [
              "Kept in the reserve above supply before anything is distributed, in bps of supply."
            ],
            "type": "u16"
          },
          {
            "name": "yieldCapBpsPerDay",
            "docs": [
              "What one distribution may mint, in bps of supply per day elapsed."
            ],
            "type": "u16"
          },
          {
            "name": "reserveFundShareBps",
            "docs": [
              "Surplus shares: the Reserve Fund's (fixed 10%) and the protocol vault's (5%–20%)."
            ],
            "type": "u16"
          },
          {
            "name": "protocolShareBps",
            "type": "u16"
          },
          {
            "name": "reserveFundTargetBps",
            "type": "u16"
          },
          {
            "name": "susdqCooldownSecs",
            "type": "u32"
          },
          {
            "name": "buybackMaxChunk",
            "type": "u64"
          },
          {
            "name": "buybackTwapBoundBps",
            "type": "u16"
          },
          {
            "name": "buybackBurnBps",
            "type": "u16"
          },
          {
            "name": "aequaStreamSecs",
            "type": "u32"
          },
          {
            "name": "aequaCooldownSecs",
            "type": "u32"
          },
          {
            "name": "slashCapBps",
            "type": "u16"
          },
          {
            "name": "deficitHold",
            "type": "u8"
          },
          {
            "name": "slashTwapBoundBps",
            "type": "u16"
          },
          {
            "name": "caWindowBeforeSecs",
            "docs": [
              "The corporate-action window around a scheduled multiplier change."
            ],
            "type": "u32"
          },
          {
            "name": "caWindowAfterSecs",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "paramsChanged",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "by",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "pathsPaused",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "by",
            "type": "pubkey"
          },
          {
            "name": "paused",
            "type": "u32"
          },
          {
            "name": "collateral",
            "type": {
              "option": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "redeemed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "asset",
            "type": "pubkey"
          },
          {
            "name": "usdqIn",
            "type": "u64"
          },
          {
            "name": "amountOut",
            "type": "u64"
          },
          {
            "name": "fee",
            "type": "u64"
          },
          {
            "name": "feeTo",
            "type": "u8"
          },
          {
            "name": "feeBps",
            "type": "u16"
          },
          {
            "name": "priceE8",
            "type": "u64"
          },
          {
            "name": "session",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "reportArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "accountValue",
            "type": "i64"
          },
          {
            "name": "shortNotional",
            "type": {
              "array": [
                "u64",
                8
              ]
            }
          },
          {
            "name": "marketLive",
            "type": "u8"
          },
          {
            "name": "creditedTotal",
            "type": "u64"
          },
          {
            "name": "withdrawnTotal",
            "type": "u64"
          },
          {
            "name": "hlTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "reserve",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "report",
            "type": {
              "defined": {
                "name": "hedgeReport"
              }
            }
          },
          {
            "name": "bridgedOutTotal",
            "type": "u64"
          },
          {
            "name": "landedTotal",
            "type": "u64"
          },
          {
            "name": "lastDistribution",
            "type": "i64"
          },
          {
            "name": "lastNav",
            "docs": [
              "NAV and supply at the last distribution, and the shortfall it left after burning the",
              "Reserve Fund (zero when NAV covered supply)."
            ],
            "type": "i64"
          },
          {
            "name": "lastSupply",
            "type": "u64"
          },
          {
            "name": "deficit",
            "type": "u64"
          },
          {
            "name": "deficitStreak",
            "docs": [
              "Distributions in a row that found NAV below supply with the Reserve Fund spent."
            ],
            "type": "u8"
          },
          {
            "name": "lastCover",
            "docs": [
              "When `cover_deficit` last moved AEQUA; once per distribution."
            ],
            "type": "i64"
          },
          {
            "name": "distributions",
            "type": "u64"
          },
          {
            "name": "distributedTotal",
            "type": "u64"
          },
          {
            "name": "deficitBurnedTotal",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    },
    {
      "name": "slashRecord",
      "docs": [
        "One slash: AEQUA moved to the sale vault, and when."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "at",
            "type": "i64"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "slashSold",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "aequaIn",
            "type": "u64"
          },
          {
            "name": "usdqOut",
            "type": "u64"
          },
          {
            "name": "burned",
            "type": "u64"
          },
          {
            "name": "toReserveFund",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "swapped",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "collateral",
            "type": "pubkey"
          },
          {
            "name": "buy",
            "docs": [
              "True when USDC bought collateral."
            ],
            "type": "bool"
          },
          {
            "name": "amountIn",
            "type": "u64"
          },
          {
            "name": "amountOut",
            "type": "u64"
          },
          {
            "name": "minOut",
            "type": "u64"
          },
          {
            "name": "priceE8",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "tokenMetadataArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "twap",
      "docs": [
        "The buyback's price reference: observations of the designated pool's price, from which",
        "the program takes a time-weighted average."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "at",
            "docs": [
              "Ring of (time, cumulative price × seconds) samples; prices in quote units per AEQUA at 1e12."
            ],
            "type": {
              "array": [
                "i64",
                64
              ]
            }
          },
          {
            "name": "cumulative",
            "type": {
              "array": [
                "u128",
                64
              ]
            }
          },
          {
            "name": "lastPrice",
            "type": "u128"
          },
          {
            "name": "head",
            "type": "u8"
          },
          {
            "name": "count",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "usdqClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "usdq",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "usdqCooldown",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "unlockAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "usdqCooldownStarted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "shares",
            "type": "u64"
          },
          {
            "name": "usdq",
            "type": "u64"
          },
          {
            "name": "cooling",
            "type": "u64"
          },
          {
            "name": "unlockAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "usdqStaked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "usdq",
            "type": "u64"
          },
          {
            "name": "shares",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "usdqVault",
      "docs": [
        "sUSDq's state: USDq it holds for stakers and what is still vesting."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "base",
            "docs": [
              "Vested USDq behind sUSDq. Tokens sent straight to the assets account don't count."
            ],
            "type": "u64"
          },
          {
            "name": "vesting",
            "type": {
              "defined": {
                "name": "vesting"
              }
            }
          },
          {
            "name": "susdqMint",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "vesting",
      "docs": [
        "A linear release of `amount` between `start` and `end` (sUSDq vesting, the stAEQUA stream)."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "start",
            "type": "i64"
          },
          {
            "name": "end",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
