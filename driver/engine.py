import utils

class Engine:
    def __init__(self, name, js):
        self.name = name
        self.js = js

class X86Engine(Engine):
    def __init__(self):
        Engine.__init__(self, "x86", utils.config.get('x86', 'shell'))

class X86GGCEngine(Engine):
    def __init__(self):
        Engine.__init__(self, "ggcx86", utils.config.get('ggcx86', 'shell'))
