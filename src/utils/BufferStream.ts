import stream from 'stream';

// <snippet_BufferStream>
export class BufferStream extends stream.Readable {
    private _source: Buffer|null
    private _offset: number|null
    private _length: number|null

    constructor(source: Buffer) {
        super()
        if (!Buffer.isBuffer(source)) {
            throw (new Error('Source must be a buffer.'));
        }

        stream.Readable.call(this)

        this._source = source;
        this._offset = 0;
        this._length = source.length;
        this.on('end', this.destroy);
    }

    read (size: number) {
        if (!this._source || !this._offset || !this._length) return
        if (this._offset < this._length) {
            this.push(this._source.slice(this._offset, (this._offset + size)));
            this._offset += size;
        }
    
        if (this._offset >= this._length) {
            this.push(null);
        }
    }

    destroy() {
        this._source = null;
        this._offset = null;
        this._length = null;
    }
}
