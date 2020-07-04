var ThreadsFollowed = {};

function isThreadFollowed(tid) {
  if (ThreadsFollowed.tid) {
    return true;
  } else {
    return false;
  }
}

function onMatch(context) {
  // send({calledNumber: 1, moduleAddress: "hello"})
  send({
    calledNumber: context.x16.toInt32(),
    moduleAddress: `${DebugSymbol.fromAddress(context.pc).moduleName}!${DebugSymbol.fromAddress(context.pc).address}`
  })
}

function FollowThread(tid) {
  ThreadsFollowed[tid] = true;
  console.log("[+] Following thread " + tid);
  Stalker.follow(tid, {
    transform: function(iterator) {
      const instruction = iterator.next();
      do {
        // console.log(instruction)
        if (instruction.mnemonic === "svc") {
          iterator.putCallout(onMatch);
        }
        iterator.keep();
      } while (iterator.next() !== null);
    }
  });
}

function UnfollowThread(threadId) {
  if (!isThreadFollowed(threadId)) {
    return;
  }
  delete ThreadsFollowed[threadId];
  console.log("[+] Unfollowing thread " + threadId);
  Stalker.unfollow(threadId);
  Stalker.garbageCollect();
}

function ThreadStalker() {
  Interceptor.attach(Module.getExportByName(null, "_pthread_start"), {
    onEnter(args) {
      if (isThreadFollowed(this.threadId)) {
        return;
      }
      FollowThread(this.threadId);
    },
    onLeave(retVal) {
        UnfollowThread(this.threadId);
    }
  });
}

const ths = Process.enumerateThreads();
ths.forEach((el) => {
  FollowThread(el.id);
});
ThreadStalker();