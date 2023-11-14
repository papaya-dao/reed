// src/index.ts
import { Cl } from "@stacks/transactions";
import { createAddress } from "@stacks/transactions";
var TESTNET_ZERO_ADDRESS = "ST000000000000000000002AMW42H";
var ExtendedParsedTransactionResult = class {
  result;
  events;
  _expect;
  constructor(txn, expect) {
    this.result = txn.result;
    this.events = txn.events;
    this._expect = expect;
  }
  get expect() {
    return this._expect(this.result);
  }
};
var ExtendedSimnet = class _ExtendedSimnet {
  simnet;
  sender;
  _debug;
  _defaultSender = "wallet_1";
  _expect;
  _expectFallback = () => {
    throw new Error("Expect chaining disabled: `expect` function was not passed as parameter");
  };
  constructor(params) {
    this.simnet = params.simnet;
    this.sender = this._parseSender(params.sender || "wallet_1");
    this._debug = !!params.debug;
    this._expect = params.expect || this._expectFallback;
  }
  getParams() {
    return {
      simnet: this.simnet,
      sender: this.sender,
      debug: this._debug,
      expect: this._expect
    };
  }
  static create(params) {
    return new Proxy(new _ExtendedSimnet(params), {
      get: (target, prop, receiver) => {
        if (prop in _ExtendedSimnet.prototype) {
          const maybeFn = target[prop];
          if (typeof maybeFn === "function") {
            return function(...args) {
              return maybeFn.apply(target, args);
            };
          } else {
            return target[prop];
          }
        } else {
          const maybeFn = target.simnet[prop];
          if (typeof maybeFn === "function") {
            return function(...args) {
              return maybeFn.apply(target.simnet, args);
            };
          } else {
            return target.simnet[prop];
          }
        }
      }
    });
  }
  connect(sender) {
    const params = {
      ...this.getParams(),
      sender: this._parseSender(sender || this._defaultSender)
    };
    return _ExtendedSimnet.create(params);
  }
  get debug() {
    const params = {
      ...this.getParams(),
      debug: true
    };
    return _ExtendedSimnet.create(params);
  }
  callReadOnlyFn(contract, method, args, sender = "") {
    const _sender = sender == "" ? this.sender : sender;
    const parsedTransactionResult = this.simnet.callReadOnlyFn(contract, method, args, _sender);
    if (this._debug) {
      console.log(`[DEBUG] ${contract}/${method}:`);
      console.log(`[DEBUG]     - Sender: ${_sender}`);
      console.log(`[DEBUG]     - Result: ${Cl.prettyPrint(parsedTransactionResult.result)}`);
    }
    return new ExtendedParsedTransactionResult(parsedTransactionResult, this._expect);
  }
  callPublicFn(contract, method, args, sender = "") {
    const _sender = sender == "" ? this.sender : sender;
    const parsedTransactionResult = this.simnet.callPublicFn(contract, method, args, _sender);
    if (this._debug) {
      console.log(`[DEBUG] ${contract}/${method}:`);
      console.log(`[DEBUG]     - Sender: ${_sender}`);
      console.log(`[DEBUG]     - Result: ${Cl.prettyPrint(parsedTransactionResult.result)}`);
      console.log(`[DEBUG]     - Events: [${parsedTransactionResult.events.map((ce) => JSON.stringify({ event: ce.event, data: ce.data.value ? Cl.prettyPrint(ce.data.value) : ce.data.value }, null, 4))}]`);
    }
    return new ExtendedParsedTransactionResult(parsedTransactionResult, this._expect);
  }
  getPrincipal() {
    return this.sender;
  }
  getDeployedContractPrincipal(contractName) {
    return Cl.contractPrincipal(this.simnet.deployer, contractName);
  }
  _parseSender(sender) {
    if (!sender) {
      throw new Error("Connected sender is undefined!");
    }
    let _sender = "";
    if (isAddress(sender)) {
      _sender = sender;
    } else {
      const maybeAccount = this.simnet.getAccounts().get(sender);
      if (!maybeAccount)
        throw new Error(`Invalid sender: could not parse as address or get account from ${sender}`);
      _sender = maybeAccount;
    }
    return _sender;
  }
};
var isAddress = (maybeAddress) => {
  let _isAddress = false;
  try {
    createAddress(maybeAddress);
    _isAddress = true;
  } catch (error) {
  }
  return _isAddress;
};
var range = (n) => {
  if (n < 0)
    throw new Error("Negative input is not allowed");
  return Array.from({ length: n }, (_, i) => i);
};
var kebabToCamel = (str) => str.split("-").map((s, i) => i > 0 ? `${s[0].toUpperCase()}${s.slice(1)}` : s).join("");
var ClarityContract = class _ClarityContract {
  simnet;
  contractInterface;
  contractName;
  _extends;
  constructor(simnet, contractName, sender = "wallet_1", _debug = false, _extends = null) {
    this._extends = _extends;
    this.contractName = contractName;
    this._sender = sender;
    this.simnet = simnet;
    const contract = Array.from(this.simnet.getContractsInterfaces().keys()).find((c) => {
      return this.contractName === c.split(".")[1];
    });
    if (!contract)
      throw Error(`Contract ${contractName} not found`);
    this.contractInterface = this.simnet.getContractsInterfaces().get(contract);
  }
  getSender() {
    return this.simnet.getPrincipal();
  }
  getPrincipal() {
    return this.simnet.getDeployedContractPrincipal(this.contractName);
  }
  tryGetFnInterface(maybeFnName) {
    return this.contractInterface.functions.find((fn) => {
      return kebabToCamel(fn.name) == maybeFnName;
    });
  }
  // private transformArguments(functionInterface: any, args: any[]) {
  //   return functionInterface.args.map((arg, i) => {
  //     return CVMap.transformArgument(args[i], arg.type)
  //   });
  // }
  static create(simnet, contractName, sender = "wallet_1", _debug = false, _extends = null) {
    const instance = new this(simnet, contractName, sender, _debug, _extends);
    return new Proxy(instance, {
      get: (target, prop, receiver) => {
        const maybeInterface = target.tryGetFnInterface(prop);
        if (maybeInterface) {
          return function(...args) {
            if (args.length != maybeInterface.args.length)
              throw Error(`Wrong number of arguments, expecting: ${JSON.stringify(maybeInterface.args)}`);
            if (maybeInterface.access == "public") {
              return target.simnet.callPublicFn(contractName, maybeInterface.name, [...args]);
            } else {
              return target.simnet.callReadOnlyFn(contractName, maybeInterface.name, [...args]);
            }
          };
        }
        if (_extends) {
          const maybeFn2 = _extends[prop];
          if (typeof maybeFn2 === "function") {
            return function(...args) {
              return maybeFn2.apply(_extends, args);
            };
          } else {
            return _extends[prop];
          }
        }
        const maybeFn = target[prop];
        if (typeof maybeFn === "function") {
          return function(...args) {
            return maybeFn.apply(target, args);
          };
        } else {
          return target[prop];
        }
      }
    });
  }
  connect(sender) {
    return _ClarityContract.create(this.simnet, this.contractName, this.simnet._parseSender(sender || this.simnet._defaultSender), this.simnet._debug, this._extends);
  }
  get debug() {
    return _ClarityContract.create(this.simnet, this.contractName, this.simnet.sender, true, this._extends);
  }
};
export {
  ClarityContract,
  ExtendedParsedTransactionResult,
  ExtendedSimnet,
  TESTNET_ZERO_ADDRESS,
  isAddress,
  range
};
//# sourceMappingURL=index.mjs.map