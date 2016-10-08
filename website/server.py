#! /usr/bin/env python2
from SimpleHTTPServer import SimpleHTTPRequestHandler
import BaseHTTPServer
import os
import sys

data_dir = None

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

        discard = len(os.getcwd()) + 1
        path = path[discard:]
        print path

        # return list of files
        if path == "list/" or path == "list":
            return os.path.join(data_dir, "")
        # return index file
        if path == "":
            return os.path.join(website_dir, "tracelogger.html")
        # return data files
        if os.path.isdir(os.path.join(data_dir, path)) or path.endswith(".json") or path.endswith(".tl"):
            return os.path.join(data_dir, path)
        # return website UI
        return os.path.join(website_dir, path)

if __name__ == '__main__':
    # Interpret non-numeric first argument as a data directory.
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except:
            data_dir = sys.argv.pop(1)

    if data_dir is None:
        data_dir = os.getcwd()

    # If not running from within the website/ directory, assume we are running
    # from the data directory. cd to the website dir so we serve non-data files
    # from there.
    website_dir = os.path.realpath(os.path.dirname(__file__))
    os.chdir(website_dir)

    BaseHTTPServer.test(TraceLoggerRequestHandler, BaseHTTPServer.HTTPServer)
