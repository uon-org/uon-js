import inspect from 'object-inspect';

if(!String.prototype.inserted) {
    String.prototype.inserted = function(pos, str) { return this.slice(0, pos) + str + this.slice(pos); }
}

if(!String.prototype.remove) {
    String.prototype.remove = function(pos, len) { return this.slice(0, pos) + this.slice(pos + len); }
}

export function say(...args)
{
    console.log(maptostr(...args).join(" "));
};

export function dbg(...args)
{
    console.error(maptostr(...args).join(" "));
};

export function maptostr(...args)
{
    return args.filter((x) => { return !(typeof x == "string" && !x.length); }).map((x) => {
        if(typeof x == "object") return inspect(x, false, null, true);

        return x;
    });
}

export function str(...args)
{
    return maptostr(...args).join("");
};

export function* seq(...a)
{
    let start = 0, end, by = 1;

    switch(a.length) {
        case 3:
            start = a[0];
            end   = a[1];
            by    = a[2];
            break;

        case 2:
            start = a[0];
            end   = a[1];
            break;

        case 1: end = a[0]; break;

        default: throw `Invalid arguments: ${a}`
    }

    for(let n = start; n < end; n += by) yield n;
}

export class vec2 {
    constructor(x, y)
    {
        this.x = x || 0;
        this.y = y || 0;
    }
    toString() { return `vec2<${this.x}, ${this.y}>`; }
    len() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    lenSq() { return this.x * this.x + this.y * this.y; }
    normalized()
    {
        let scale = 1.0 / this.len();
        return new vec2(this.x * scale, this.y * scale);
    }
    add(v1) { return new vec2(this.x + v1.x, this.y + v1.y); }
    addf(f) { return new vec2(this.x + f, this.y + f); }
    sub(v1) { return new vec2(this.x - v1.x, this.y - v1.y); }
    subf(f) { return new vec2(this.x - f, this.y - f); }
    mul(v1) { return new vec2(this.x * v1.x, this.y * v1.y); }
    mulf(f) { return new vec2(this.x * f, this.y * f); }
    eql(v1) { return this.x == v1.x && this.y == v1.y; }
    within(v1, r) { return v1.sub(this).lenSq() <= r * r; }
    lerp(v1, a) { return new vec2(lerp(this.x, v1.x, a), lerp(this.y, v1.y, a)); }
}

export function clamp(v, min, max)
{
    return Math.min(max, Math.max(min, v));
}

export function v2(x, y)
{
    return new vec2(x, y);
}

export function asv2(a, b)
{
    if(b != undefined) return v2(a, b);
    return a;
}

const           SimpleObjectProto = {}.__proto__;
export function isClassyObject(o)
{
    if(!o || !o.__proto__) return false;
    if(typeof (o) !== 'object') return false;
    return o.__proto__ !== SimpleObjectProto;
}

export function not(o)
{
    return o === null || o === undefined;
}

export function classof(o)
{
    if(not(o)) return;

    return o.constructor;
}

export function classname(o)
{
    if(not(o)) return;
    return classof(o).name;
}

// This takes the class / return of classof() or parentof()
export function parentof(c)
{
    return c.__proto__;
}

// This likewise takes the class / return of classof() or parentof()
export function inherits(c, base)
{
    if(c == base) return true;
    let p = parentof(c);
    if(p) return inherits(p, base);
    return false;
}

export function LogDefault(...args)
{
    say(...args);
}

export const Logger = {
    log: LogDefault,
    dbg: (...args) => { return Logger.log(...args);},
}

export function LOG(...args) {
    Logger.log(...args);
};

export function DBG(...args)
{
    Logger.dbg(...args);
}
