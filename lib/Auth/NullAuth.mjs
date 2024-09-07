export class NullAuth {
    constructor() {}

    type() { return 'null'; }

    authenticate(data) { return true; }
}

export class NullID {
    constructor() { this.t = "null"; }

    type() { return 'null'; }
}
