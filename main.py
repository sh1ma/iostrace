import frida
import sys

with open("syscall.txt", "r") as f:
    raw_syscall_list = f.readlines()

syscalls = [syscall.split(". ") for syscall in raw_syscall_list]
syscalls = {syscall[0]:syscall[1].rstrip("\n") for syscall in syscalls}

def on_message(message, _):
    thread_id, syscall_number = message["payload"].split(":")
    syscall_number = str(abs(int(syscall_number)))
    if syscall_number in syscalls.keys():
        print(f"[{thread_id}]: {syscalls[syscall_number]}")
    else:
        print(f"[{thread_id}]: Unknown({syscall_number})")


def on_detached():
    sys.exit()


def main(target: str) -> None:
    device = frida.get_usb_device()
    apps = device.enumerate_applications()
    for app in apps:
        if target == app.identifier or target == app.name:
            app_identifier: str = app.identifier
            break

    pid = device.spawn([app_identifier])
    session = device.attach(pid)
    session.on('detached', on_detached)

    with open("tracer.js", "r") as f:
        tracer_source = f.read()

    script = session.create_script(tracer_source)
    script.load()
    script.on("message", on_message)
    device.resume(pid)
    sys.stdin.read()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="frida-iOS-syscall-tracer")
    parser.add_argument("target", help="target process name or bundle identifier")
    args = parser.parse_args()

    main(args.target)