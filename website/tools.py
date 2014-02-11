try:
    import MySQLdb as mdb
    import MySQLdb.cursors as mdb_cursors
except:
    import mysqldb as mdb
    import mysqldb.cursors as mdb_cursors
try:
    import ConfigParser
except:
    import configparser as ConfigParser

import json
import calendar

db = None
version = None
path = None
dataPath = None

def Startup():
    global db, version, path, dataPath
    config = ConfigParser.RawConfigParser()
    config.read("tl-server.config")

    dataPath = config.get('general', 'dataPath')

    host = config.get('mysql', 'host')
    user = config.get('mysql', 'user')
    pw = config.get('mysql', 'pass')
    name = config.get('mysql', 'name')

    if host[0] == '/':
        db = mdb.connect(unix_socket=host, user=user, passwd=pw, db=name, use_unicode=True, cursorclass=mdb_cursors.DictCursor)
    else:
        db = mdb.connect(host, user, pw, name, use_unicode=True, cursorclass=mdb_cursors.DictCursor)

Startup()

