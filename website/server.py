#! /usr/bin/env python2
from SimpleHTTPServer import SimpleHTTPRequestHandler
import BaseHTTPServer
import os
import sys

datadir = os.getcwd()

class TraceLoggerRequestHandler(SimpleHTTPRequestHandler):
    # Add CORS header
    def end_headers (self):
        self.send_header('Access-Control-Allow-Origin', '*')
        SimpleHTTPRequestHandler.end_headers(self)

    def translate_path(self, path):
        '''Pass through most commands to the default translation, which resolves
           relative to the current working directory. Directory listings and filenames
           starting with "tl-" are resolved relative to the data directory.'''
        cwdpath = SimpleHTTPRequestHandler.translate_path(self, path)
        if cwdpath is None:
            return cwdpath
        if os.path.isdir(cwdpath) or os.path.basename(cwdpath).startswith("tl-"):
            discard = len(os.getcwd()) + 1
            return os.path.join(datadir, cwdpath[discard:])
        return cwdpath

if __name__ == '__main__':
    # Interpret non-numeric first argument as a data directory.
    if len(sys.argv) > 0:
        try:
            port = int(sys.argv[1])
        except:
            datadir = sys.argv.pop(1)
    BaseHTTPServer.test(TraceLoggerRequestHandler, BaseHTTPServer.HTTPServer)
