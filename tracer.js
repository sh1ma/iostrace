var ThreadsFollowed = {};

function isThreadFollowed(tid) {
  if (ThreadsFollowed.tid) {
    return true;
  } else {
    return false;
  }
}

function FollowThread(tid) {
  ThreadsFollowed[tid] = true;
  console.log("[+] Following thread " + tid);
  Stalker.follow(tid, {
    transform: function (iterator) {
      const instruction = iterator.next();
      do {
        if (instruction.mnemonic === "svc") {
          iterator.putCallout(onMatch);
        }
        iterator.keep();
      } while ((instruction = iterator.next()) !== null);
      function onMatch(context) {
        send(tid + ":" + context.x16.toInt32());
      }
    },
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
  FollowThread(Process.getCurrentThreadId());
  Interceptor.attach(Module.getExportByName(null, "_pthread_start"), {
    onEnter(args) {
      if (isThreadFollowed(this.threadId)) {
        return;
      }
      const functionAddress = args[2];
      Interceptor.attach(functionAddress, {
        onEnter(args) {
          FollowThread(this.threadId);
        },
        onLeave(retVal) {
          UnfollowThread(this.threadId);
        },
      });
    },
  });
}

ThreadStalker();
