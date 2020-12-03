/**
 * @packageDocumentation
 * @module API-EVM-Outputs
 */
import { Buffer } from 'buffer/';
import BN from 'bn.js';
import BinTools from '../../utils/bintools';
import { EVMConstants } from './constants';
import { Output, StandardAmountOutput, StandardTransferableOutput, BaseNFTOutput } from '../../common/output';
import { Serialization, SerializedEncoding } from '../../utils/serialization';

const bintools: BinTools = BinTools.getInstance();
const serializer: Serialization = Serialization.getInstance();

/**
 * Takes a buffer representing the output and returns the proper Output instance.
 *
 * @param outputid A number representing the inputID parsed prior to the bytes passed in
 *
 * @returns An instance of an [[Output]]-extended class.
 */
export const SelectOutputClass = (outputid: number, ...args: any[]): Output => {
  if(outputid == EVMConstants.SECPXFEROUTPUTID){
    return new SECPTransferOutput( ...args);
  }
  throw new Error(`Error - SelectOutputClass: unknown outputid ${outputid}`);
}

export class TransferableOutput extends StandardTransferableOutput{
  protected _typeName = "TransferableOutput";
  protected _typeID = undefined;

  //serialize is inherited

  deserialize(fields: object, encoding: SerializedEncoding = "hex") {
    super.deserialize(fields, encoding);
    this.output = SelectOutputClass(fields["output"]["_typeID"]);
    this.output.deserialize(fields["output"], encoding);
  }

  fromBuffer(bytes: Buffer, offset: number = 0): number {
    this.assetID = bintools.copyFrom(bytes, offset, offset + EVMConstants.ASSETIDLEN);
    offset += EVMConstants.ASSETIDLEN;
    const outputid:number = bintools.copyFrom(bytes, offset, offset + 4).readUInt32BE(0);
    offset += 4;
    this.output = SelectOutputClass(outputid);
    return this.output.fromBuffer(bytes, offset);
  }

}

export abstract class AmountOutput extends StandardAmountOutput {
  protected _typeName = "AmountOutput";
  protected _typeID = undefined;

  //serialize and deserialize both are inherited
  
  /**
   * 
   * @param assetID An assetID which is wrapped around the Buffer of the Output
   */
  makeTransferable(assetID: Buffer): TransferableOutput {
      return new TransferableOutput(assetID, this);
  }

  select(id:number, ...args: any[]): Output {
      return SelectOutputClass(id, ...args);
  }
}

/**
 * An [[Output]] class which specifies an Output that carries an ammount for an assetID and uses secp256k1 signature scheme.
 */
export class SECPTransferOutput extends AmountOutput {
  protected _typeName = "SECPTransferOutput";
  protected _typeID = EVMConstants.SECPXFEROUTPUTID;

  //serialize and deserialize both are inherited

  /**
     * Returns the outputID for this output
     */
  getOutputID():number {
    return this._typeID;
  }

  create(...args:any[]):this{
    return new SECPTransferOutput(...args) as this;
  }

  clone():this {
    const newout:SECPTransferOutput = this.create()
    newout.fromBuffer(this.toBuffer());
    return newout as this;
  }
}

export class EVMOutput {
  protected address: Buffer = Buffer.alloc(20); 
  protected amount: Buffer = Buffer.alloc(8);
  protected amountValue: BN = new BN(0);
  protected assetid: Buffer = Buffer.alloc(32);

  /**
   * Returns the address of the input as {@link https://github.com/feross/buffer|Buffer}
   */
  getAddress = (): Buffer => this.address;

  /**
   * Returns the address as a bech32 encoded string.
   */
  // TODO - Get getAddressString to work. Why is `getPreferredHRP(networkID)` failing?
  // getAddressString = (networkID: number = 1, blockchainID: string = "X"): string => {return bintools.addressToString(getPreferredHRP(networkID), blockchainID, this.address)}

  /**
   * Returns the amount as a {@link https://github.com/indutny/bn.js/|BN}.
   */
  getAmount = (): BN => this.amountValue.clone();

  /**
   * Returns the assetid of the input as {@link https://github.com/feross/buffer|Buffer}
   */ 
  getAssetID = (): Buffer => this.assetid;
 
  /**
   * Returns a {@link https://github.com/feross/buffer|Buffer} representation of the [[EVMOutput]].
   */
  toBuffer():Buffer {
    const bsize: number = this.address.length + this.amount.length + this.assetid.length;
    const barr: Buffer[] = [this.address, this.amount, this.assetid];
    const buff: Buffer = Buffer.concat(barr, bsize);
    return buff;
  }

  /**
   * Decodes the [[EVMOutput]] as a {@link https://github.com/feross/buffer|Buffer} and returns the size.
   */
  fromBuffer(bytes: Buffer, offset: number = 0): number {
    this.address = bintools.copyFrom(bytes, offset, offset + 20);
    offset += 20;
    this.amount = bintools.copyFrom(bytes, offset, offset + 8);
    offset += 8;
    this.assetid = bintools.copyFrom(bytes, offset, offset + 32);
    offset += 32;
    return offset;
  }

  /**
   * Returns a base-58 representation of the [[EVMOutput]].
   */
  toString():string {
    return bintools.bufferToB58(this.toBuffer());
  }

  create(...args: any[]): this{
    return new EVMOutput(...args) as this;
  }

  clone(): this {
    const newout: EVMOutput = this.create();
    newout.fromBuffer(this.toBuffer());
    return newout as this;
  }

  /**
   * An [[EVMOutput]] class which contains address, amount, and assetID.
   *
   * @param address The address recieving the asset as a {@link https://github.com/feross/buffer|Buffer} or a string.
   * @param amount A {@link https://github.com/indutny/bn.js/|BN} or number representing the amount.
   * @param assetid The asset id which is being sent as a {@link https://github.com/feross/buffer|Buffer} or a string.
   */
  constructor(
    address: Buffer | string = undefined, 
    amount: BN | number = undefined, 
    assetid: Buffer | string = undefined
  ) {
    if (typeof address !== 'undefined' && typeof amount !== 'undefined' && typeof assetid !== 'undefined') {
      if(typeof address === 'string') {
        // if present then remove `0x` prefix
        let prefix: string = address.substring(0, 2);
        if(prefix === '0x') {
          address = address.split('x')[1];
        }
        address = Buffer.from(address, 'hex');
      }

      // convert number amount to BN
      let amnt:BN;
      if (typeof amount === 'number') {
        amnt = new BN(amount);
      } else {
        amnt = amount;
      }

      // convert string assetid to Buffer
      if(!(assetid instanceof Buffer)) {
        assetid = bintools.cb58Decode(assetid);
      }

      this.address = address;
      this.amountValue = amnt.clone();
      this.amount = bintools.fromBNToBuffer(amnt, 8);
      this.assetid = assetid;
    }
  }
}  