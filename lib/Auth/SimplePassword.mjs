import {comparePassword, cryptPassword} from 'uon/crypto';

import Notify from '../Notify.mjs';

const NullPassword = cryptPassword({text: "null password"});

export class SimplePassword {
    constructor(opt)
    {
        opt ||= {};

        this.userTable = opt.userTable;
    }

    authenticate(id)
    {
        let pw = this.userTable[id.user] || NullPassword;
        return comparePassword(id.password, pw);
    }

    type() { return 'plaintext-password'; }
}

export class SimplePasswordID {
    constructor(opt)
    {
        this.t        = this.type();
        this.user     = opt.user;
        this.password = opt.password;
    }

    type() { return 'plaintext-password'; }
}
