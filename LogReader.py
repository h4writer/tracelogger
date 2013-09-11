import gzip

class LogReader:

    def __init__(self, file_):
        self.stack_ = [{"data":["0","1","n"]}]
        self.time = 0
        self.current_ = None
        self.next_ = None
        self.done_ = False
        self.changed = False

        if ".gz" in file_:
            self.fp = gzip.open(file_)
            file_ = file_[:-3]
        else:
            self.fp = open(file_)

        self.next()

        self.name = file_.rsplit("/", 1)[1]
        if self.name[-4:] == ".log":
            self.name = self.name[:-4]
        if self.name == "tracelogging-compile":
            self.name = "Ionmonkey background compilation"

    def increase(self, time):
        self.changed = False
        while time >= self.duration:
            time -= self.duration
            self.next()
            self.changed = True

        self.duration -= time

    def next(self):
        while True:
            try:
                line = self.fp.next()
                next_ = line[:-1].split(",")
            except StopIteration:
                self.done_ = True
                return
            
            # Only process data with timestamp,event 
            if len(next_) < 2:
                continue

            # Only process data for start/stop or engine change.
            if next_[1] not in ["1","0","e"]:
                continue

            self.current_ = self.next_
            self.next_ = next_

            if self.current_ == None:
                self.duration = int(self.next_[0])
                return

            self.duration = int(self.next_[0]) - int(self.current_[0])

            if self.isStart():
                self.stack_.append({"data": self.current_})
                # Hack to remove unreported engine between starting a script
                # and logging engine that is running
                if self.next_[1] == "e" and self.current_[2] == "s":
                    self.stack_[-1]["engine"] = self.next_[2][0]

            else:
                if self.isEngineChange():
                    self.stack_[-1]["engine"] = self.current_[2][0]
                else:
                    assert self.isStop()
                    self.stack_ = self.stack_[:-1]
            return

    def isStart(self):
        return self.current_[1] == "1"
    def isStop(self):
        return self.current_[1] == "0"
    def isEngineChange(self):
        return self.current_[1] == "e"
    def info(self):
        return self.stack_[-1]
    def isDone(self):
        return self.done_
    def stack(self):
        return self.stack_

