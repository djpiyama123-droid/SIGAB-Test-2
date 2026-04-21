#!/bin/bash
sudo mysql -e "ALTER USER 'sigab_user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'sigab_pass_2026'; FLUSH PRIVILEGES;"
