DEJAVU_TELEMETRY = False


class AnonymousTelemetry:
    def __init__(self, *args, **kwargs):
        self.client = None
        self.user_id = None

    def capture_event(self, *args, **kwargs):
        return None

    def capture_identify(self, *args, **kwargs):
        return False

    def close(self):
        return None


client_telemetry = AnonymousTelemetry()


def capture_event(*args, **kwargs):
    return None


def capture_client_event(*args, **kwargs):
    return None
