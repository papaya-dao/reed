import { Simnet } from "@hirosystems/clarinet-sdk";
import { ExtendedSimnet, ExtendedSimnetParams, isAddress, range } from "../src";
import { ClarityType } from "@stacks/transactions";

import { describe, expect, it } from "vitest";
declare const simnet: Simnet;
const params: ExtendedSimnetParams = { simnet, expect };

describe("isAddress", () => {
  it("should return true for valid addresses", () => {
    const validAddresses = ["SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7", "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5", "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"];
    validAddresses.forEach(address => {
      expect(isAddress(address)).toBe(true);
    });
  });

  it("should return false for invalid addresses", () => {
    const invalidAddress = ["invalid_address", "wallet_1", "wallet_2", "wallet_3"];
    invalidAddress.forEach(address => {
      expect(isAddress(address)).toBe(false);
    });
  });
});

describe("ExtendedSimnet", () => {
  describe("builder pattern", () => {
    it("connect returns instance of ExtendedSimnet", () => {
      const extendedSimnet = ExtendedSimnet.create(params);
      const wallet_2 = extendedSimnet.getAccounts().get('wallet_2');

      expect(wallet_2).toBeDefined();
      expect(extendedSimnet.connect(wallet_2)).toBeInstanceOf(ExtendedSimnet);
    });

    it("debug property returns instance of ExtendedSimnet", () => {
      const extendedSimnet = ExtendedSimnet.create(params);

      expect(extendedSimnet.debug).toBeInstanceOf(ExtendedSimnet);
    });

    it("connect changes underlying sender", () => {
      const extendedSimnet = ExtendedSimnet.create(params).connect('wallet_2');
      const wallet_2 = extendedSimnet.getAccounts().get('wallet_2');
      const initialSender = extendedSimnet.getAccounts().get('wallet_1');
      const connectedSender = extendedSimnet.getPrincipal();

      expect(wallet_2).toBeDefined();
      expect(initialSender).toBeDefined();
      expect(connectedSender).toBeDefined();
      expect(connectedSender).not.toEqual(initialSender);
    });

    it("connects wallet_1 as default sender", () => {
      const extendedSimnet = ExtendedSimnet.create(params);
      const connectedSender = extendedSimnet.getPrincipal();
      const wallet_1 = extendedSimnet.getAccounts().get('wallet_1');

      expect(wallet_1).toBeDefined();
      expect(connectedSender).toEqual(wallet_1);
    });
  });

  describe("calling public functions on clarity contracts", () => {
    it("should mirror simnet method arguments", () => {
      const extendedSimnet = ExtendedSimnet.create(params);
      const deployer = extendedSimnet.deployer;
      expect(deployer).toBeDefined();

      const response = extendedSimnet.callPublicFn("counter", "increment", [], deployer);
      expect(response.result).toHaveClarityType(ClarityType.ResponseOk);
    });

    it("should extend simnet method arguments", () => {
      const extendedSimnet = ExtendedSimnet.create(params);
      // no need to pass sender, ExtendedSimnet passes the connected sender for us
      const response = extendedSimnet.callPublicFn("counter", "increment", []);
      expect(response.result).toHaveClarityType(ClarityType.ResponseOk);
    });
  });

  describe("calling read only functions on clarity contracts", () => {
    it("should mirror simnet method arguments", () => {
      const extendedSimnet = ExtendedSimnet.create(params);
      const deployer = extendedSimnet.deployer;
      expect(deployer).toBeDefined();

      const response = extendedSimnet.callReadOnlyFn("counter", "get-counter", [], deployer);
      expect(response.result).toHaveClarityType(ClarityType.ResponseOk);
    });

    it("should extend simnet method arguments", () => {
      const extendedSimnet = ExtendedSimnet.create(params);
      // no need to pass sender, ExtendedSimnet passes the connected sender for us
      const response = extendedSimnet.callReadOnlyFn("counter", "get-counter", []);
      expect(response.result).toHaveClarityType(ClarityType.ResponseOk);
    });

    it("should extend ParsedTransactionResult", () => {
      const extendedSimnet = ExtendedSimnet.create(params);
      // no need to pass sender, ExtendedSimnet passes the connected sender for us
      extendedSimnet
        .callReadOnlyFn("counter", "get-counter", [])
        .expect
        .toHaveClarityType(ClarityType.ResponseOk);
    });
  });
});

describe("range", () => {
  it("should return an array of numbers from 0 to n-1", () => {
    const n = 5;
    const expectedArray = [0, 1, 2, 3, 4];
    expect(range(n)).toEqual(expectedArray);
  });

  it("should return an empty array for n=0", () => {
    const n = 0;
    expect(range(n)).toEqual([]);
  });

  it("should throw an error for negative n", () => {
    const n = -5;
    expect(() => range(n)).toThrow();
  });
});
