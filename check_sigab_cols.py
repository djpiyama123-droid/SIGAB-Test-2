import pymysql
import os

DB_HOST   = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT   = int(os.getenv("DB_PORT", "3306"))
DB_USER   = os.getenv("DB_USER", "sigab_user")
DB_PASS   = os.getenv("DB_PASS", "sigab_pass_2026")

conn = pymysql.connect(host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASS, database="sigab")
with conn.cursor() as cur:
    cur.execute("SHOW COLUMNS FROM equipos")
    cols = cur.fetchall()
    print([c[0] for c in cols])
