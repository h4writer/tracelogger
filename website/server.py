#! /usr/bin/env python2
from SimpleHTTPServer import SimpleHTTPRequestHandler
import BaseHTTPServer
import os
import sys

datadir = None

class TraceLoggerRequestHandler(SimpleHTTPRequestHandler):
    # Add CORS header
    def end_headers (self):
        self.send_header('Access-Control-Allow-Origin', '*')
        SimpleHTTPRequestHandler.end_headers(self)

    def translate_path(self, url_path):
        '''Pass through most commands to the default translation, which resolves
           relative to the current working directory (containing the website/
           files). Directory listings, *.json, and *.tl files are resolved
           relative to the data directory.
        '''
        path = SimpleHTTPRequestHandler.translate_path(self, url_path)
        if path is None:
            return path
        if os.path.isdir(path) or path.endswith(".json") or path.endswith(".tl"):
            discard = len(os.getcwd()) + 1
            return os.path.join(datadir, path[discard:])
        return path

if __name__ == '__main__':
    # Interpret non-numeric first argument as a data directory.
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except:
            datadir = sys.argv.pop(1)

    if datadir is None:
        datadir = os.getcwd()

    # If not running from within the website/ directory, assume we are running
    # from the data directory. cd to the website dir so we serve non-data files
    # from there.
    website_dir = os.path.realpath(os.path.dirname(__file__))
    os.chdir(website_dir)

    BaseHTTPServer.test(TraceLoggerRequestHandler, BaseHTTPServer.HTTPServer)
