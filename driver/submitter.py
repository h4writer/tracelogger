# vim: set ts=4 sw=4 tw=99 et:
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import re
import utils
import urllib
import urllib2

class Submitter:
    def __init__(self):
        self.url = utils.config.get('main', 'updateURL')

    def Start(self, revision, engine):
        url = self.url
        url += '?action=start'
        url += '&revision='+revision
        url += '&engine='+engine.name 
        url = urllib2.urlopen(url)

        contents = url.read()
        m = re.search('id=(\d+)', contents)
        if m == None:
            raise Exception('Remote error: ' + contents)
        self.runID = int(m.group(1))

    def SubmitScore(self, script, suite, subject, score):
        url = self.url
        url += "?action=score"
        url += "&runid="+str(self.runID)
        url += "&suite="+suite
        url += "&script="+script
        url += "&subject="+subject
        url += "&score="+str(score)
        urllib2.urlopen(url)

    def Finish(self, status):
        url = self.url
        url += '?run=finish'
        url += '&runid='+str(self.runID)
        urllib2.urlopen(url)


