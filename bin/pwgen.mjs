#!/usr/bin/env node

import ps from 'node:process';
import {say, str} from 'uon/util';
import {cryptPassword, comparePassword} from 'uon/crypto';

const text = ps.argv[2];
say("text:", str("'", text, "'"));

const pw = cryptPassword({text});
say(`
{
    pw:   Buffer.from(${JSON.stringify(Array.from(pw.pw))}),
    salt: Buffer.from(${JSON.stringify(Array.from(pw.salt))}),
    iter: ${pw.iter},
    algo: "${pw.algo}",
}
`);

say("compare:", comparePassword(text, pw));
