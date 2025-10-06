export default class RatingError implements Error {
    static readonly OK = 0;
    static readonly UNKNOWN = 1;
    static readonly INVALID_PARAMS = 2;
    static readonly SETTING_NOT_FOUND = 3;
    static readonly ROUND_ALREADY_EXISTS = 4;
    static readonly ROUND_ALREADY_PROCESSED = 5;
    static readonly ROUND_NOT_FOUND = 6;
    static readonly METRIX_ROUND_NOT_FOUND = 7;

    readonly code: number;
    readonly name: string;
    readonly message: string;

    constructor(code: number) {
        this.code = code;
        this.name = 'RatingError';
        this.message = `Error code: ${code}`;
    }

    static getCodeFromError(e: Error): number {
        return e instanceof RatingError ? e.code : this.UNKNOWN;
    }
}
