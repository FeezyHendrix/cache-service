import { CacheOperation, CacheResponse } from '../types/cache';
export declare class Protocol {
    static serialize(data: any): Buffer;
    static deserialize(buffer: Buffer): {
        data: any;
        bytesRead: number;
    };
    static parseCommand(input: string): CacheOperation;
    private static parseCommandParts;
    static formatResponse(response: CacheResponse): string;
}
//# sourceMappingURL=protocol.d.ts.map