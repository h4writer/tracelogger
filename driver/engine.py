import utils

class Engine:
    def __init__(self, name, js):
        self.name = name
        self.js = js

class X86Engine(Engine):
    def __init__(self):
        Engine.__init__(self, "x86", utils.config.get('x86', 'shell'))

class X86NoThreadEngine(Engine):
    def __init__(self):
        Engine.__init__(self, "noThreadX86", utils.config.get('x86', 'shell'))
        self.js += " --ion-parallel-compile=off "
