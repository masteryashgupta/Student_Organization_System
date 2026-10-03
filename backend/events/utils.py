import io
import base64
import qrcode


def ticket_qr_data_uri(code):
    """Return a base64 PNG data URI encoding the ticket code.
    The frontend scanner reads this code and posts it to the check-in endpoint.
    """
    img = qrcode.make(str(code))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{b64}"
