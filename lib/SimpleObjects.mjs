import {Ref} from './Connection.mjs';
import {dbg} from './util.mjs';
import Notify from './Notify.mjs';

export class Folder {
    constructor() { this._map = {}; }

    index(name)
    {
        let r    = this._map[name.first()];
        let rest = name.rest();
        if(rest.length) return r.index(rest);

        return r;
    }

    set(name, value)
    {
        const r         = value;
        this._map[name] = value;
        Notify.notify(this, 'update', name);
        return r;
    }

    rm(name) { delete this._map[name]; }

    list() { return Object.keys(this._map); }
}

export class Thing {
    greet() { return "hello"; }
}
