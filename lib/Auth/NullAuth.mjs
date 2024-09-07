export class NullAuth {
    constructor() {}

    type() { return 'null'; }

    authenticate(data) { return true; }
}

export class NullCredentials {
    constructor() { this.t = "null"; }

    type() { return 'null'; }
}
