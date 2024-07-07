#!/usr/bin/env node

import {dbg, classof} from './util.mjs';

const ValidClasses = {};

export class OPath {
    constructor(list)
    {
        if(list[0] == '') {
            this.type = 'abs';
            list      = list.slice(1);
        } else {
            this.type = 'rel';
        }

        list = list.map(s => s.replace(RegExp('(?<!\\\\)\\\\'), ''));

        this.path = list;
    }

    first() { return this.path[0]; }

    // Return a new (relative) opath with only list[1] onward
    rest() { return new OPath(this.path.slice(1)); }

    get length() { return this.path.length; }
}

export function parsePath(path)
{
    const re = RegExp('(?<!\\\\)/');
    let   r  = path.split(re);

    let opath = new OPath(r);

    return opath;
}

export function addUonClass(classObject)
{
    ValidClasses[classObject.name] = classObject.prototype;
}

export function findUonClassProto(name)
{
    if(name) return ValidClasses[name];
}

addUonClass(OPath);
