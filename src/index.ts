import { ParsedTransactionResult, Simnet } from "@hirosystems/clarinet-sdk";
import { Cl, ClarityValue } from "@stacks/transactions";
import { createAddress } from "@stacks/transactions";

export const TESTNET_ZERO_ADDRESS = 'ST000000000000000000002AMW42H';

type Bigintish = bigint | number | string;
function isBigintish(value: any): value is Bigintish {
    return typeof value === 'bigint' || typeof value === 'number' || typeof value === 'string';
}

export interface ExtendedParsedTransactionResult extends ParsedTransactionResult {}

export class ExtendedParsedTransactionResult implements ParsedTransactionResult {
  result: ClarityValue;
  events: { event: string; data: { [key: string]: any; raw_value?: string | undefined; value?: ClarityValue | undefined; }; }[];
  _expect: Function;
  constructor(txn: ParsedTransactionResult, expect: Function) {
    this.result = txn.result;
    this.events = txn.events
    this._expect = expect;
  }

  get expect() {
    return this._expect(this.result);
  }
}

/**
 * The ExtendedSimnet class is an extension of the Simnet class from the "@hirosystems/clarinet-sdk" package.
 * It provides additional methods and properties for interacting with the Simnet network.
 * 
 * This class uses the Proxy pattern to override the methods of the Simnet class, providing more flexibility.
 * For example, the 'connect' method allows you to connect to the Simnet network with a specified sender.
 * The 'callReadOnlyFn' and 'callPublicFn' methods are overridden to use the sender specified in the 'connect' method by default.
 * 
 * @property {Simnet} simnet - The Simnet instance.
 * @property {string} sender - The sender's address.
 * 
 * @method constructor - The constructor method. It is private to prevent direct instantiation.
 * @method create - A static method that creates a new instance of the ExtendedSimnet class. It uses a Proxy to override the methods of the Simnet class.
 * @method connect - Connects to the Simnet network with a specified sender. If the sender is not specified, it throws an error.
 * @method callReadOnlyFn - Calls a read-only function on the Simnet network. If the sender is not specified, it uses the sender specified in the 'connect' method.
 * @method callPublicFn - Calls a public function on the Simnet network. If the sender is not specified, it uses the sender specified in the 'connect' method.
 * @method getPrincipal - Returns the sender's address.
 */

export interface ExtendedSimnet extends Simnet {
  // Add any additional methods or properties here
  connect(sender: string | undefined): ExtendedSimnet;
}

export interface ExtendedSimnetParams {
  simnet: Simnet;
  sender?: string;
  debug?: boolean;
  expect?: Function
}


export class ExtendedSimnet implements Simnet {
    private simnet: Simnet;
    sender: string;
    _debug: boolean;
    _defaultSender = 'wallet_1';
    private _expect: Function;
    private _expectFallback = () => {throw new Error("Expect chaining disabled: `expect` function was not passed as parameter")};

    private constructor(params: ExtendedSimnetParams) {
        this.simnet = params.simnet;
        this.sender = this._parseSender(params.sender || 'wallet_1');
        this._debug = !!params.debug;
        this._expect = params.expect || this._expectFallback;
    }
    private getParams(): ExtendedSimnetParams {
      return {
        simnet: this.simnet,
        sender: this.sender,
        debug: this._debug,
        expect: this._expect,
      }
    }

    static create(params: ExtendedSimnetParams) {
        return new Proxy(new ExtendedSimnet(params), {
            get: (target, prop: keyof Simnet | keyof ExtendedSimnet, receiver) => {
                if (prop in ExtendedSimnet.prototype) {
                  const maybeFn = target[prop as keyof ExtendedSimnet];
                    if (typeof maybeFn === 'function') {
                        return function(...args: any[]) {
                            return (maybeFn as Function).apply(target, args);
                        };
                    } else {
                        return target[prop as keyof ExtendedSimnet];
                    }
                } else {
                    const maybeFn = target.simnet[prop as keyof Simnet];
                    if (typeof maybeFn === 'function') {
                        return function(...args: any[]) {
                            return (maybeFn as Function).apply(target.simnet, args);
                        };
                    } else {
                        return target.simnet[prop as keyof Simnet];
                    }
                }
            }
        });
    }

    connect(sender: string | undefined): ExtendedSimnet {
      const params: ExtendedSimnetParams = {
        ...this.getParams(),
        sender: this._parseSender(sender || this._defaultSender)
      }
      return ExtendedSimnet.create(params);
    }

    get debug(): ExtendedSimnet {
      const params: ExtendedSimnetParams = {
        ...this.getParams(),
        debug: true
      }
        return ExtendedSimnet.create(params);
    }
    
    callReadOnlyFn(contract: string, method: string, args: ClarityValue[], sender: string = ''): ExtendedParsedTransactionResult {
        const _sender = sender == '' ? this.sender : sender;
        const parsedTransactionResult = this.simnet.callReadOnlyFn(contract, method, args, _sender);

        if (this._debug) {
            console.log(`[DEBUG] ${contract}/${method}:`);
            console.log(`[DEBUG]     - Sender: ${_sender}`);
            console.log(`[DEBUG]     - Result: ${Cl.prettyPrint(parsedTransactionResult.result)}`);
        }

        return new ExtendedParsedTransactionResult(parsedTransactionResult, this._expect);
    }

    callPublicFn(contract: string, method: string, args: ClarityValue[], sender: string = ''): ExtendedParsedTransactionResult {
        const _sender = sender == '' ? this.sender : sender;
        const parsedTransactionResult = this.simnet.callPublicFn(contract, method, args, _sender)
        
        if (this._debug) {
            console.log(`[DEBUG] ${contract}/${method}:`);
            console.log(`[DEBUG]     - Sender: ${_sender}`);
            console.log(`[DEBUG]     - Result: ${Cl.prettyPrint(parsedTransactionResult.result)}`);
            console.log(`[DEBUG]     - Events: [${parsedTransactionResult.events.map(ce => (JSON.stringify({ event: ce.event, data: ce.data.value ? Cl.prettyPrint(ce.data.value) : ce.data.value }, null, 4)))}]`);
        }

        return new ExtendedParsedTransactionResult(parsedTransactionResult, this._expect);
    }

    getPrincipal(): string {
      return this.sender;
    }

    getDeployedContractPrincipal(contractName: string) {
      return Cl.contractPrincipal(this.simnet.deployer, contractName);
    }

    _parseSender(sender: string) {
      if (!sender) {
        throw new Error("Connected sender is undefined!");
      }

      let _sender = '';

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
}

export const isAddress = (maybeAddress: string) => {
  let _isAddress = false;
  try {
    createAddress(maybeAddress);
    _isAddress = true;
  } catch (error) { /* Handle the error silently */}

  return _isAddress;
}

export const range = (n: number): number[] => {
    if (n < 0) throw new Error("Negative input is not allowed");
    return Array.from({length: n}, (_, i) => i);
}

const kebabToCamel = (str: string) => str.split('-').map((s, i) => i > 0 ? `${s[0].toUpperCase()}${s.slice(1)}` : s).join('');

export class ClarityContract {
    [x: string]: any;
    protected simnet: ExtendedSimnet;
    private readonly contractInterface: any;
    private readonly contractName: string;
    private readonly _extends: any;
    protected constructor(simnet: ExtendedSimnet, contractName: string, sender: string = 'wallet_1', _debug: boolean = false, _extends: any = null) {
      this._extends = _extends;
      this.contractName = contractName;
      this._sender = sender;
      this.simnet = simnet
      
      const contract = Array.from(this.simnet.getContractsInterfaces().keys()).find(c => {
        return this.contractName === c.split('.')[1];
      })

      if (!contract) throw Error(`Contract ${contractName} not found`);
      this.contractInterface = this.simnet.getContractsInterfaces().get(contract);
    }
    
    getSender(): string {
      return this.simnet.getPrincipal()
    }

    getPrincipal() {
      return this.simnet.getDeployedContractPrincipal(this.contractName);
    }

    private tryGetFnInterface(maybeFnName: string) {
        return this.contractInterface.functions.find((fn: any) => {
          return kebabToCamel(fn.name) == maybeFnName;
        });
    }

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

          // then, try to proxy to the extended class
          if (_extends) {
            const maybeFn = _extends[prop as keyof typeof _extends];
            if (typeof maybeFn === 'function') {
              return function (...args: any[]) {
                return (maybeFn as Function).apply(_extends, args);
              };
            } else {
              return _extends[prop as keyof typeof _extends];
            }
          }

          // finally, try to proxy to the base class
          const maybeFn = target[prop as keyof typeof instance];
          if (typeof maybeFn === 'function') {
            return function (...args: any[]) {
              return (maybeFn as Function).apply(target, args);
            };
          } else {
            return target[prop as keyof typeof instance];
          }
        }
      });
    }

    connect(sender: string | undefined): this {
       return ClarityContract.create(this.simnet, this.contractName, this.simnet._parseSender(sender || this.simnet._defaultSender), this.simnet._debug, this._extends) as this;
    }

    get debug(): this {
        return ClarityContract.create(this.simnet, this.contractName, this.simnet.sender, true, this._extends) as this;
    }
}