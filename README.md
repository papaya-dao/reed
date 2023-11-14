# reed
## Installation
`reed` is a test framework for `@hirosystems/clarinet-sdk` with the goal of providing a developer experience familiar to Ethereum developers.
- npm
```
npm install --save-dev @papaya-dao/reed
```
- yarn
```
yarn add -D @papaya-dao/reed
```
## Clarinet SDK API Differences

The `ExtendedSimnet` class extends the `Simnet` class provided by the `@hirosystems/clarinet-sdk` package. It provides identical and additional methods and properties for interacting with the simulated network. `ExtendedSimnet` uses the Proxy pattern to override the methods of the `Simnet` class, providing more flexibility.

```
declare const simnet: Simnet;
const params: ExtendedSimnetParams = { simnet, expect };
const simNet = ExtendedSimnet.create(params);

// simNet can be used in place of simnet
const getSymbolResponse = simNet.callReadOnlyFn(
  "my-sip-010-token",
  "get-symbol",
  [stxTokenSignifier, depositAmount],
  sender
);
```

The `connect` method in `ExtendedSimnet` allows you to connect to the Simnet network with a specified sender. `callReadOnlyFn` and `callPublicFn` methods on `ExtendedSimnet` are overridden to use the sender specified in the `connect` method unless overridden by passing sender as the last argument as specified by the `Simnet` api.

```
declare const simnet: Simnet;
const params: ExtendedSimnetParams = { simnet, expect }; 
const simNet = ExtendedSimnet.create(params);// wallet_1 conntected by default

const getSymbolResponse = simNet.callReadOnlyFn(
  "my-sip-010-token",
  "get-symbol",
  [stxTokenSignifier, depositAmount],
  // sender <--- able to omit sender, simnet will use wallet_1 by default
);
```
The connect method implements the builder pattern for method chaining:
```
const getSymbolResponse = simNet.connect('wallet_2') // connect a different sender
  .callReadOnlyFn(
    "my-sip-010-token",
    "get-symbol",
    [stxTokenSignifier, depositAmount]
  );
```

### ExtendedSimnet API

- `getPrincipal()`

Returns the sender's principal as a string.

- `getDeployedContractPrincipal(contractName: string)`

Returns the principal of a deployed contract.

### `ExtendedParsedTransactionResult`
The `ExtendedParsedTransactionResult` class extends the `ParsedTransactionResult` class from the `@hirosystems/clarinet-sdk` package. It provides an `expect` method that allows expectation chaining on the transaction result.

```
const extendedSimnet = ExtendedSimnet.create(params);
const params: ExtendedSimnetParams = { simnet, expect }; // wondering why we pass expect?
extendedSimnet
  .callReadOnlyFn("counter", "get-counter", [])
  .expect // we can method chain like this
  .toHaveClarityType(ClarityType.ResponseOk);
```

## `ClarityContract` magic 🪄 

The `ClarityContract` class implements the proxy design pattern, which automatically tries to convert `kebab-case` stacks clarity contract names to `camelCase` and match the proxy prop against these functions to automatically dispatch `callReadOnlyFn` or `callPublicFn`

```
[...]
static create<T extends ClarityContract>(simnet: ExtendedSimnet, contractName: string, sender: string = 'wallet_1', _debug: boolean = false, _extends: T|null = null) {
      const instance = new this(simnet, contractName, sender, _debug, _extends);
      return new Proxy(instance, {
        get: (target: typeof instance, prop: string, receiver) => {
          const maybeInterface = target.tryGetFnInterface(prop);

          // first, attempt to proxy to the smart contract interface
          if (maybeInterface) {
            return function (...args: any[]) {
              if (args.length != maybeInterface.args.length) throw Error(`Wrong number of arguments, expecting: ${JSON.stringify(maybeInterface.args)}`);
              if (maybeInterface.access == 'public') {
                return target.simnet.callPublicFn(contractName, maybeInterface.name, [...args]);
              } else {
                return target.simnet.callReadOnlyFn(contractName, maybeInterface.name, [...args]);
              }
            };
          }
          [...]
        }
      });
    }


```

This allows you to define and interact with ClarityContracts like so:
```
export interface MyToken {
    getBalance(owner: PrincipalCV): ExtendedParsedTransactionResult;
    getTotalSupply(): ExtendedParsedTransactionResult;
    getName(): ExtendedParsedTransactionResult;
    getSymbol(): ExtendedParsedTransactionResult;
    getDecimals(): ExtendedParsedTransactionResult;
    transfer(amount: UIntCV, sender: PrincipalCV, recipient: PrincipalCV, memo?: OptionalCV<BufferCV>): ExtendedParsedTransactionResult;
    getTokenUri(): ExtendedParsedTransactionResult;
    mint(receiver: PrincipalCV, amount: UIntCV): ExtendedParsedTransactionResult;
}

export class MyToken extends ClarityContract {
    static contractName = 'my-token';

    static create(simnet: Simnet, contractName: string = MyToken.contractName, sender: string = 'wallet_1', _debug: boolean = false): MyToken {
        const instance = new MyToken(simnet, contractName, sender, _debug);
        return (ClarityContract.create(simnet, contractName, sender, _debug, instance) as MyToken);
    }
}

[...]

const extendedSimnet = ExtendedSimnet.create(params);
const params: ExtendedSimnetParams = { simnet, expect };
const myToken = MyToken.create(simNet);
const user = Cl.standardPrincipal(myToken.getSender());
myToken
  .getBalance(user)
  .expect
  .toBeOk(Cl.uint(rewardAmount * BigInt(3)))
```
