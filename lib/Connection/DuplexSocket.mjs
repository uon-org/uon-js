// Modified for modules from https://github.com/nodejs/node/blob/main/test/common/duplexpair.js

'use strict';
import {Duplex} from 'node:stream';
import assert from 'assert';

const kCallback  = Symbol('Callback');
const kOtherSide = Symbol('Other');

class DuplexSocket extends Duplex {
    constructor()
    {
        super();
        this[kCallback]  = null;
        this[kOtherSide] = null;
    }

    _read()
    {
        const callback = this[kCallback];
        if(callback) {
            this[kCallback] = null;
            callback();
        }
    }

    _write(chunk, encoding, callback)
    {
        assert.notStrictEqual(this[kOtherSide], null);
        assert.strictEqual(this[kOtherSide][kCallback], null);
        if(chunk.length === 0) {
            process.nextTick(callback);
        } else {
            this[kOtherSide].push(chunk);
            this[kOtherSide][kCallback] = callback;
        }
    }

    _final(callback)
    {
        this[kOtherSide].on('end', callback);
        this[kOtherSide].push(null);
    }
}

function makeDuplexPair()
{
    const clientSide       = new DuplexSocket();
    const serverSide       = new DuplexSocket();
    clientSide[kOtherSide] = serverSide;
    serverSide[kOtherSide] = clientSide;
    return [clientSide, serverSide];
}

export default makeDuplexPair;
