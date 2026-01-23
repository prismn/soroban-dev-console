import { Address, scValToNative, xdr } from '@stellar/stellar-sdk';

export type ArgType = 'i32' | 'u32' | 'i128' | 'u128' | 'symbol' | 'address' | 'string';

export interface ContractArg {
  id: string; // Unique ID for React lists
  type: ArgType;
  value: string;
}

export function convertToScVal(type: ArgType, value: string): xdr.ScVal {
  switch (type) {
    case 'i32':
    case 'u32':
      return xdr.ScVal.scvI32(Number(value)); // Simplified for JS numbers
    case 'i128':
    case 'u128':
      // For 128-bit, we treat them as high/low 64-bit parts or use native BigInt if SDK supports it directly
      // For this Wave MVP, we'll try basic integer conversion.
      // In production, use xdr.ScVal.scvI128(...) with ScInt128Parts
      return xdr.ScVal.scvI128(
        new xdr.Int128Parts({
          lo: xdr.Uint64.fromString(value), // Simplified: assumes value fits
          hi: xdr.Int64.fromString('0'),
        })
      );
    case 'symbol':
      return xdr.ScVal.scvSymbol(value);
    case 'address':
      return new Address(value).toScVal();
    case 'string':
      return xdr.ScVal.scvString(value);
    default:
      throw new Error(`Unsupported type: ${type}`);
  }
}