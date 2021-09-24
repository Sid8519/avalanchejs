import { getAvalanche, createTests, Matcher } from "./e2etestlib"
import { KeystoreAPI } from "src/apis/keystore/api"
import BN from "bn.js"

describe("PChain", (): void => {
  let tx = { value: "" }
  let addrB = { value: "" }
  let addrC = { value: "" }
  let createdSubnetID = { value: "" }

  const avalanche = getAvalanche()
  const pchain = avalanche.PChain()
  const keystore = new KeystoreAPI(avalanche)

  const now: number = new Date().getTime()
  const startTime: Date = new Date(now + 800)
  const endTime: Date = new Date(now + 50000)
  const stakeAmount: BN = new BN(200000000000)

  const user: string = "avalancheJspChainUser"
  const passwd: string = "avalancheJsP@ssw4rd"
  const badUser: string = "asdfasdfsa"
  const badPass: string = "pass"
  const memo: string = "hello world"
  const whaleAddr: string = "P-local18jma8ppw3nhx5r4ap8clazz0dps7rv5u00z96u"
  const key: string =
    "PrivateKey-ewoqjP7PxY4yr3iLTpLisriqt94hdyDFNgchSxGGztUrTXtNN"
  const nodeID: string = "NodeID-7Xhw2mDxuDS44j42TCB6U5579esbSt3Lg"
  const subnetID: string = "2bGsYJorY6X7RhjPBFs3kYjiNEHo4zGrD2eeyZbb43T2KKi7fM"
  const xChainAddr: string = "X-local18jma8ppw3nhx5r4ap8clazz0dps7rv5u00z96u"

  // test_name        response_promise                            resp_fn          matcher           expected_value/obtained_value
  const tests_spec: any = [
    [
      "createUser",
      () => keystore.createUser(user, passwd),
      (x) => x,
      Matcher.toBe,
      () => true
    ],
    [
      "createaddrB",
      () => pchain.createAddress(user, passwd),
      (x) => x,
      Matcher.Get,
      () => addrB
    ],
    [
      "createaddrC",
      () => pchain.createAddress(user, passwd),
      (x) => x,
      Matcher.Get,
      () => addrC
    ],
    [
      "incorrectUser",
      () => pchain.listAddresses(badUser, passwd),
      (x) => x,
      Matcher.toThrow,
      () =>
        `problem retrieving user '${badUser}': incorrect password for user "${badUser}"`
    ],
    [
      "incorrectPass",
      () => pchain.listAddresses(user, badPass),
      (x) => x,
      Matcher.toThrow,
      () =>
        `problem retrieving user '${user}': incorrect password for user "${user}"`
    ],
    [
      "getBalance",
      () => pchain.getBalance(whaleAddr),
      (x) => x.balance,
      Matcher.toBe,
      () => "30000000000000000"
    ],
    [
      "getBalance2",
      () => pchain.getBalance(whaleAddr),
      (x) => x.utxoIDs[0].txID,
      Matcher.toBe,
      () => "11111111111111111111111111111111LpoYY"
    ],
    [
      "getBlockchainsC",
      () => pchain.getBlockchains(),
      (x) => x[0].id,
      Matcher.toBe,
      () => "2CA6j5zYzasynPsFeNoqWkmTCt3VScMvXUZHbfDJ8k3oGzAPtU"
    ],
    [
      "getBlockchainsX",
      () => pchain.getBlockchains(),
      (x) => x[1].id,
      Matcher.toBe,
      () => "2eNy1mUFdmaxXNj1eQHUe7Np4gju9sJsEtWQ4MX3ToiNKuADed"
    ],
    [
      "importKey",
      () => pchain.importKey(user, passwd, key),
      (x) => x,
      Matcher.toBe,
      () => whaleAddr
    ],

    [
      "listAddrs",
      () => pchain.listAddresses(user, passwd),
      (x) => x.sort(),
      Matcher.toEqual,
      () => [whaleAddr, addrB.value, addrC.value].sort()
    ],

    [
      "createSubnet",
      () => pchain.createSubnet(user, passwd, [whaleAddr], 1),
      (x) => {
        return x
      },
      Matcher.Get,
      () => createdSubnetID
    ],

    [
      "addDelegator",
      () =>
        pchain.addDelegator(
          user,
          passwd,
          nodeID,
          startTime,
          endTime,
          stakeAmount,
          whaleAddr
        ),
      (x) => {
        return x
      },
      Matcher.toThrow,
      () =>
        "couldn't unmarshal an argument. Ensure arguments are valid and properly formatted. See documentation for example calls"
    ],
    [
      "addValidator",
      () =>
        pchain.addValidator(
          user,
          passwd,
          nodeID,
          startTime,
          endTime,
          stakeAmount,
          whaleAddr,
          new BN(10)
        ),
      (x) => {
        return x
      },
      Matcher.toThrow,
      () =>
        "couldn't unmarshal an argument. Ensure arguments are valid and properly formatted. See documentation for example calls"
    ],
    [
      "exportKey",
      () => pchain.exportKey(user, passwd, addrB.value),
      (x) => x,
      Matcher.toMatch,
      () => /PrivateKey-\w*/
    ],
    [
      "exportAVAX",
      () => pchain.exportAVAX(user, passwd, new BN(10), xChainAddr),
      (x) => x,
      Matcher.Get,
      () => tx
    ],
    [
      "importAVAX",
      () => pchain.importAVAX(user, passwd, addrB.value, "X"),
      (x) => x,
      Matcher.toThrow,
      () => "no spendable funds were found"
    ]

    // [
    //   "getTx",
    //   () => pchain.getTx(tx.value),
    //   (x) => x,
    //   Matcher.toMatch,
    //   () => /\w+/
    // ],
    // [
    //   "getTxStatus",
    //   () => pchain.getTxStatus(tx.value),
    //   (x) => x,
    //   Matcher.toBe,
    //   () => "Processing"
    // ]
  ]

  createTests(tests_spec)
})
