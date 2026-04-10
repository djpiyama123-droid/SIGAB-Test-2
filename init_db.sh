#!/bin/bash
sudo service mysql start
sudo mysql -e "CREATE DATABASE IF NOT EXISTS sigab;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'sigab_user'@'localhost' IDENTIFIED BY 'sigab_pass_2026';"
sudo mysql -e "GRANT ALL PRIVILEGES ON sigab.* TO 'sigab_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"
mysql -u sigab_user -psigab_pass_2026 sigab < sigab_schema_fresh.sql
mysql -u sigab_user -psigab_pass_2026 sigab < seed_data.sql
echo "Base de datos inicializada y poblada exitosamente."
