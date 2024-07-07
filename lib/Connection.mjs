import EventEmitter2 from 'eventemitter2';

import {classof, dbg, say} from './util.mjs';

export class Ref {
    constructor(opt)
    {
        this._proto = opt.proto;
        this._id    = opt.id;
        this._side  = opt.side;

        if(!opt.side) throw new Error(`No side specified for ref ${opt.id}`);
    }

    _call(name, ...args) { return this._proto.call(this, name, args); }

    _methods() { return this._proto.methods(this); }

    _proxy() { return new Proxy(this, RefProxyHandler); }

    _isUonProxy() { return false; }
}

export const RefProxyHandler = {
    get(target, prop, receiver) {
        if(prop == '_isUonProxy') return () => { return true; };
        if(prop[0] == '_' || prop == 'then' || prop == 'constructor') return target[prop];

        return (...args) => target._call(prop, ...args);
    }
}

const AsyncProxyHandler = {
    get(target, prop, recv) {
        if(prop == '_isUonProxy') return () => { return true; };
        if(prop[0] == '_' || prop == 'then' || prop == 'constructor') return target[prop];

        return (...args) => Promise.resolve(target[prop].call(target, ...args));
    },
};

// Browser polyfills don't support util.types.isProxy
export function isUonProxy(v)
{
    if(v._isUonProxy) return v._isUonProxy();
    return false;
}

export function proxify(v)
{
    if(classof(v) === Ref) {
        if(isUonProxy(v)) return v;
        return v._proxy();
    }

    if(typeof v !== 'object') throw new Error(`Can't make proxy for ${v} type: ${typeof v}`);

    return new Proxy(v, AsyncProxyHandler);
}

export function unproxify(v)
{
    if(isUonProxy(v)) return v._target;
    return v;
}

export class Connection extends EventEmitter2 {
    handshakeComplete(ref)
    {
        setTimeout(() => this.emit('open', ref), 0);
        // setImmediate(() => this.emit('open', ref));
    }
}

export class Listener extends EventEmitter2 {}
