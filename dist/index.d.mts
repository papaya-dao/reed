import { ParsedTransactionResult, Simnet } from '@hirosystems/clarinet-sdk';
import { ClarityValue, ContractPrincipalCV } from '@stacks/transactions';

declare const TESTNET_ZERO_ADDRESS = "ST000000000000000000002AMW42H";
interface ExtendedParsedTransactionResult extends ParsedTransactionResult {
}
declare class ExtendedParsedTransactionResult implements ParsedTransactionResult {
    result: ClarityValue;
    events: {
        event: string;
        data: {
            [key: string]: any;
            raw_value?: string | undefined;
            value?: ClarityValue | undefined;
        };
    }[];
    _expect: Function;
    constructor(txn: ParsedTransactionResult, expect: Function);
    get expect(): any;
}
interface ExtendedSimnetParams {
    simnet: Simnet;
    sender?: string;
    debug?: boolean;
    expect?: Function;
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
interface ExtendedSimnet extends Simnet {
    connect(sender: string | undefined): ExtendedSimnet;
}
declare class ExtendedSimnet implements Simnet {
    private simnet;
    sender: string;
    _debug: boolean;
    _defaultSender: string;
    private _expect;
    private _expectFallback;
    private constructor();
    private getParams;
    static create(params: ExtendedSimnetParams): ExtendedSimnet;
    get debug(): ExtendedSimnet;
    callReadOnlyFn(contract: string, method: string, args: ClarityValue[], sender?: string): ExtendedParsedTransactionResult;
    callPublicFn(contract: string, method: string, args: ClarityValue[], sender?: string): ExtendedParsedTransactionResult;
    getPrincipal(): string;
    getDeployedContractPrincipal(contractName: string): ContractPrincipalCV;
    _parseSender(sender: string): string;
}
declare const isAddress: (maybeAddress: string) => boolean;
declare const range: (n: number) => number[];
declare class ClarityContract {
    [x: string]: any;
    protected simnet: ExtendedSimnet;
    private readonly contractInterface;
    private readonly contractName;
    private readonly _extends;
    protected constructor(simnet: ExtendedSimnet, contractName: string, sender?: string, _debug?: boolean, _extends?: any);
    getSender(): string;
    getPrincipal(): ContractPrincipalCV;
    private tryGetFnInterface;
    static create<T extends ClarityContract>(simnet: ExtendedSimnet, contractName: string, sender?: string, _debug?: boolean, _extends?: T | null): ClarityContract;
    connect(sender: string | undefined): this;
    get debug(): this;
}

export { ClarityContract, ExtendedParsedTransactionResult, ExtendedSimnet, ExtendedSimnetParams, TESTNET_ZERO_ADDRESS, isAddress, range };
