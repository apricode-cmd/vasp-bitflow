#!/usr/bin/expect -f

set timeout 10

spawn gpg --decrypt "Sandbox_credentials.api (4).gpg"

expect {
    "Enter passphrase:" {
        send "\r"
        exp_continue
    }
    "passphrase:" {
        send "\r"
        exp_continue
    }
    eof
}
