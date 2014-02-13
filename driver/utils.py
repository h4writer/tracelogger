# vim: set ts=4 sw=4 tw=99 et:
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os
import sys
import commands
import subprocess
import ConfigParser

config = None

def InitConfig(name):
    global config
    config = ConfigParser.RawConfigParser()
    if not os.path.isfile(name):
        raise Exception('could not find file: ' + name)
    config.read(name)

def run(cmd):
    output = subprocess.check_output(cmd, shell=True)
    return output
