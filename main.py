import frida
import sys

def on_message(meesage, _):
    print(meesage["payload"])


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